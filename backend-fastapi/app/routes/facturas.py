# Facturación de ventas.
#
#   POST   /api/facturas                admin/empleado -> emite la factura de una venta
#   GET    /api/facturas                listado con filtros y paginación (gestores)
#   GET    /api/facturas/mis-facturas   las del usuario autenticado
#   GET    /api/facturas/{id}           detalle (dueño de la factura o gestor)
#   GET    /api/facturas/{id}/pdf       descarga el documento en PDF
#   PATCH  /api/facturas/{id}/estado    admin/empleado -> emitida/pagada/anulada
#
# La factura copia los importes y los datos del cliente en el momento de
# emitirse. Si después cambia el precio de un producto o el cliente
# actualiza su dirección, el documento ya emitido debe seguir diciendo lo
# mismo que el día que se expidió: por eso no se leen esos datos por
# relación, se guardan.

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.auth import auth_required, require_role
from app.database import get_db
from app.documentos import factura_pdf
from app.errors import AppError
from app.models import Factura, Usuario, Venta
from app.schemas import FacturaCrear, FacturaEstadoUpdate
from app.serializers import factura_dict
from app.validations import limpiar_texto

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")
ESTADOS = ("emitida", "pagada", "anulada")

# Transiciones permitidas: una factura anulada ya no vuelve atrás.
TRANSICIONES = {
    "emitida": ("pagada", "anulada"),
    "pagada": ("anulada",),
    "anulada": (),
}


def _siguiente_numero(db: Session) -> str:
    """Numeración consecutiva por año: FV-2026-000001."""
    anio = datetime.now().year
    prefijo = f"FV-{anio}-"
    ultima = (
        db.query(Factura.numero)
        .filter(Factura.numero.like(f"{prefijo}%"))
        .order_by(Factura.numero.desc())
        .first()
    )
    consecutivo = int(ultima[0].split("-")[-1]) + 1 if ultima else 1
    return f"{prefijo}{consecutivo:06d}"


def _venta_con_detalles(db: Session, id_venta: int) -> Venta:
    venta = (
        db.query(Venta)
        .options(joinedload(Venta.detalles))
        .filter(Venta.id_venta == id_venta)
        .first()
    )
    if not venta:
        raise AppError(404, "La venta no existe.")
    return venta


def _cargar(db: Session, id_factura: int) -> Factura:
    factura = (
        db.query(Factura)
        .options(joinedload(Factura.venta).joinedload(Venta.detalles))
        .filter(Factura.id_factura == id_factura)
        .first()
    )
    if not factura:
        raise AppError(404, "La factura no existe.")
    return factura


# ---------------------------------------------------------------
# Emisión
# ---------------------------------------------------------------
@router.post("", status_code=201)
def emitir(
    body: FacturaCrear,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    venta = _venta_con_detalles(db, body.id_venta)

    if venta.estado == "cancelada":
        raise AppError(409, "No se puede facturar un pedido cancelado.")

    existente = db.query(Factura).filter(Factura.id_venta == venta.id_venta).first()
    if existente:
        raise AppError(
            409,
            f"Esa venta ya tiene la factura {existente.numero}.",
            {"id_venta": "Venta ya facturada."},
        )

    # Los datos del cliente se copian de la venta, que a su vez los tomó
    # del formulario de compra. La factura queda congelada en el tiempo.
    usuario = (
        db.query(Usuario).filter(Usuario.id_usuario == venta.id_usuario).first()
        if venta.id_usuario
        else None
    )

    factura = Factura(
        numero=_siguiente_numero(db),
        id_venta=venta.id_venta,
        id_usuario=venta.id_usuario,
        cliente_nombre=venta.cliente_nombre,
        cliente_documento=venta.cliente_documento,
        cliente_email=venta.cliente_email,
        cliente_telefono=venta.cliente_telefono,
        cliente_direccion=venta.direccion_envio
        or (usuario.direccion if usuario else None),
        subtotal=venta.subtotal or Decimal("0"),
        descuento=venta.descuento or Decimal("0"),
        impuestos=venta.impuestos or Decimal("0"),
        costo_envio=venta.costo_envio or Decimal("0"),
        total=venta.total or Decimal("0"),
        estado="pagada" if venta.estado in ("pagada", "enviada", "entregada") else "emitida",
        observaciones=limpiar_texto(body.observaciones, 255) if body.observaciones else None,
    )

    try:
        db.add(factura)
        db.commit()
    except Exception:
        db.rollback()
        raise AppError(500, "No se pudo emitir la factura.")

    db.refresh(factura)
    return {
        "ok": True,
        "message": f"Factura {factura.numero} emitida.",
        "factura": factura_dict(_cargar(db, factura.id_factura), incluir_detalles=True),
    }


# ---------------------------------------------------------------
# Consulta
# ---------------------------------------------------------------
@router.get("")
def listar(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    buscar: Optional[str] = Query(default=None, max_length=90),
    estado: Optional[str] = Query(default=None, max_length=10),
    desde: Optional[str] = Query(default=None, max_length=10),
    hasta: Optional[str] = Query(default=None, max_length=10),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=100),
):
    """Búsqueda por número de factura, cliente, correo o documento."""
    query = db.query(Factura).options(joinedload(Factura.venta))

    if buscar:
        patron = f"%{buscar.strip()}%"
        query = query.filter(
            or_(
                Factura.numero.like(patron),
                Factura.cliente_nombre.like(patron),
                Factura.cliente_email.like(patron),
                Factura.cliente_documento.like(patron),
            )
        )
    if estado in ESTADOS:
        query = query.filter(Factura.estado == estado)
    if desde:
        try:
            query = query.filter(Factura.creado_en >= datetime.fromisoformat(desde))
        except ValueError:
            raise AppError(400, "La fecha 'desde' no es válida (formato AAAA-MM-DD).")
    if hasta:
        try:
            query = query.filter(
                Factura.creado_en < datetime.fromisoformat(hasta) + timedelta(days=1)
            )
        except ValueError:
            raise AppError(400, "La fecha 'hasta' no es válida (formato AAAA-MM-DD).")

    total = query.count()
    facturas = (
        query.order_by(Factura.id_factura.desc())
        .offset((pagina - 1) * limite)
        .limit(limite)
        .all()
    )

    resumen = (
        db.query(
            func.coalesce(func.sum(Factura.total), 0),
            func.count(Factura.id_factura),
        )
        .filter(Factura.estado != "anulada")
        .first()
    )

    return {
        "ok": True,
        "facturas": [factura_dict(f) for f in facturas],
        "paginacion": {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "total_paginas": max(1, (total + limite - 1) // limite),
        },
        "resumen": {
            "facturado": float(resumen[0] or 0),
            "emitidas": int(resumen[1] or 0),
        },
    }


@router.get("/mis-facturas")
def mis_facturas(
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    """Las facturas del usuario autenticado, sin importar su rol."""
    facturas = (
        db.query(Factura)
        .options(joinedload(Factura.venta))
        .filter(Factura.id_usuario == current_user["id_usuario"])
        .order_by(Factura.id_factura.desc())
        .all()
    )
    return {"ok": True, "facturas": [factura_dict(f) for f in facturas]}


def _permitir_ver(factura: Factura, current_user: dict):
    """Un cliente solo puede ver sus propias facturas."""
    if current_user.get("rol") in ROLES_GESTOR:
        return
    if factura.id_usuario != current_user["id_usuario"]:
        raise AppError(403, "No tienes permiso para ver esta factura.")


@router.get("/{id_factura}")
def obtener(
    id_factura: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    factura = _cargar(db, id_factura)
    _permitir_ver(factura, current_user)
    return {"ok": True, "factura": factura_dict(factura, incluir_detalles=True)}


@router.get("/{id_factura}/pdf")
def descargar_pdf(
    id_factura: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    """Devuelve el PDF de la factura listo para descargar."""
    factura = _cargar(db, id_factura)
    _permitir_ver(factura, current_user)

    contenido = factura_pdf(factura_dict(factura, incluir_detalles=True))
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{factura.numero}.pdf"',
            "Content-Length": str(len(contenido)),
        },
    )


# ---------------------------------------------------------------
# Estado
# ---------------------------------------------------------------
@router.patch("/{id_factura}/estado")
def cambiar_estado(
    id_factura: int,
    body: FacturaEstadoUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    factura = _cargar(db, id_factura)
    nuevo = (body.estado or "").strip().lower()

    if nuevo not in ESTADOS:
        raise AppError(
            400,
            f"Estado no válido. Debe ser uno de: {', '.join(ESTADOS)}.",
            {"estado": "Estado no permitido."},
        )
    if nuevo == factura.estado:
        raise AppError(400, f"La factura ya está en estado '{nuevo}'.")
    if nuevo not in TRANSICIONES[factura.estado]:
        raise AppError(
            409,
            f"No se puede pasar de '{factura.estado}' a '{nuevo}'.",
            {"estado": "Transición no permitida."},
        )

    factura.estado = nuevo
    db.commit()
    db.refresh(factura)

    return {
        "ok": True,
        "message": f"Factura {factura.numero} marcada como {nuevo}.",
        "factura": factura_dict(factura, incluir_detalles=True),
    }
