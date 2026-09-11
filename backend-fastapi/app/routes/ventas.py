# Registro de ventas (checkout) y gestión de pedidos.
#
#   POST   /api/ventas               cliente autenticado -> registra la compra
#   GET    /api/ventas/mis-pedidos   pedidos del usuario autenticado
#   GET    /api/ventas               listado admin/empleado (filtros + paginación)
#   GET    /api/ventas/{id}          detalle (dueño del pedido o gestor)
#   PATCH  /api/ventas/{id}/estado   admin/empleado -> cambia el estado
#
# PUNTOS CLAVE DE SEGURIDAD E INTEGRIDAD
#
# 1. El precio NUNCA llega del navegador. El cliente solo manda
#    id_producto y cantidad; el backend lee el precio real de la tabla
#    productos y calcula subtotales y total.
#
# 2. Toda la compra ocurre dentro de UNA transacción: cabecera, detalles,
#    descuento de stock y movimientos de inventario. Si algo falla, se
#    hace rollback y no queda una venta a medias ni stock descuadrado.
#
# 3. Las filas de producto se bloquean con SELECT ... FOR UPDATE mientras
#    se valida y descuenta el stock, para que dos compras simultáneas no
#    puedan vender la misma última unidad.

import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.auth import auth_required, require_role
from app.database import get_db
from app.errors import AppError
from app.models import MovimientoInventario, Producto, Usuario, Venta, VentaDetalle
from app.schemas import VentaCrear, VentaEstadoUpdate
from app.security import limite_compra
from app.serializers import venta_dict
from app.validations import ESTADOS_VENTA, limpiar_texto, validate_venta

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")

# Envío gratis a partir de este monto; si no, tarifa plana.
UMBRAL_ENVIO_GRATIS = Decimal("1500000")
COSTO_ENVIO = Decimal("15000")

# Estados a los que se puede pasar desde cada estado actual.
TRANSICIONES = {
    "pendiente": {"pagada", "cancelada"},
    "pagada": {"enviada", "cancelada"},
    "enviada": {"entregada", "cancelada"},
    "entregada": set(),
    "cancelada": set(),
}


def _generar_codigo(db: Session) -> str:
    """Código legible del pedido: PS-AAAAMMDD-1234 (único)."""
    for _ in range(20):
        codigo = f"PS-{datetime.now():%Y%m%d}-{random.randint(1000, 9999)}"
        if not db.query(Venta.id_venta).filter(Venta.codigo == codigo).first():
            return codigo
    return f"PS-{datetime.now():%Y%m%d%H%M%S}"


def _calcular_envio(subtotal: Decimal) -> Decimal:
    return Decimal("0") if subtotal >= UMBRAL_ENVIO_GRATIS else COSTO_ENVIO


def _puede_ver(venta: Venta, current_user: dict) -> bool:
    if current_user.get("rol") in ROLES_GESTOR:
        return True
    return venta.id_usuario == current_user.get("id_usuario")


# ---------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------
@router.post("", status_code=201, dependencies=[Depends(limite_compra)])
def crear_venta(
    body: VentaCrear,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    is_valid, errors = validate_venta(body.model_dump())
    if not is_valid:
        raise AppError(400, "Revisa los datos del pedido.", errors)

    usuario = (
        db.query(Usuario).filter(Usuario.id_usuario == current_user["id_usuario"]).first()
    )
    if not usuario or usuario.estado != "activo":
        raise AppError(403, "Tu cuenta no está activa. Contacta al administrador.")

    ids = [item.id_producto for item in body.items]

    try:
        # Bloquea las filas implicadas hasta el commit: dos compras
        # simultáneas del mismo producto se atienden una después de otra.
        productos = (
            db.query(Producto)
            .filter(Producto.id_producto.in_(ids))
            .with_for_update()
            .all()
        )
        por_id = {p.id_producto: p for p in productos}

        errores_stock = {}
        lineas = []
        subtotal = Decimal("0")
        total_articulos = 0

        for item in body.items:
            producto = por_id.get(item.id_producto)

            if not producto:
                errores_stock[str(item.id_producto)] = "El producto ya no existe."
                continue
            if producto.estado != "activo":
                errores_stock[str(item.id_producto)] = (
                    f'"{producto.nombre}" ya no está disponible.'
                )
                continue
            if producto.stock <= 0:
                errores_stock[str(item.id_producto)] = f'"{producto.nombre}" está agotado.'
                continue
            if item.cantidad > producto.stock:
                errores_stock[str(item.id_producto)] = (
                    f'Solo quedan {producto.stock} unidad(es) de "{producto.nombre}".'
                )
                continue

            # Precio tomado de la base de datos, no del navegador.
            precio_unitario = Decimal(str(producto.precio))
            subtotal_linea = precio_unitario * item.cantidad
            subtotal += subtotal_linea
            total_articulos += item.cantidad

            lineas.append(
                {
                    "producto": producto,
                    "cantidad": item.cantidad,
                    "precio_unitario": precio_unitario,
                    "subtotal": subtotal_linea,
                }
            )

        if errores_stock:
            db.rollback()
            raise AppError(
                409,
                "Algunos productos ya no están disponibles en la cantidad solicitada.",
                errores_stock,
            )

        costo_envio = _calcular_envio(subtotal)
        total = subtotal + costo_envio

        venta = Venta(
            codigo=_generar_codigo(db),
            id_usuario=usuario.id_usuario,
            cliente_nombre=limpiar_texto(body.cliente_nombre, 90),
            cliente_email=body.cliente_email.strip().lower(),
            cliente_telefono=body.cliente_telefono.strip(),
            cliente_documento=(body.cliente_documento or usuario.numero_documento),
            direccion_envio=limpiar_texto(body.direccion_envio, 150),
            ciudad=limpiar_texto(body.ciudad, 60),
            notas=limpiar_texto(body.notas, 300) or None,
            metodo_pago=body.metodo_pago,
            subtotal=subtotal,
            costo_envio=costo_envio,
            total=total,
            total_articulos=total_articulos,
            estado="pendiente",
        )
        db.add(venta)
        db.flush()  # asigna id_venta sin cerrar la transacción

        for linea in lineas:
            producto = linea["producto"]
            stock_anterior = producto.stock
            stock_nuevo = stock_anterior - linea["cantidad"]

            db.add(
                VentaDetalle(
                    id_venta=venta.id_venta,
                    id_producto=producto.id_producto,
                    nombre_producto=producto.nombre,
                    marca_producto=producto.marca,
                    precio_unitario=linea["precio_unitario"],
                    cantidad=linea["cantidad"],
                    subtotal=linea["subtotal"],
                )
            )

            producto.stock = stock_nuevo

            db.add(
                MovimientoInventario(
                    id_producto=producto.id_producto,
                    tipo="salida",
                    cantidad=linea["cantidad"],
                    stock_anterior=stock_anterior,
                    stock_nuevo=stock_nuevo,
                    motivo=f"Venta {venta.codigo}",
                    id_venta=venta.id_venta,
                    id_usuario=usuario.id_usuario,
                )
            )

        db.commit()
        db.refresh(venta)

    except AppError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    return {
        "ok": True,
        "message": f"¡Pedido {venta.codigo} registrado correctamente!",
        "venta": venta_dict(venta),
    }


# ---------------------------------------------------------------
# Consultas del cliente
# ---------------------------------------------------------------
@router.get("/mis-pedidos")
def mis_pedidos(
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    ventas = (
        db.query(Venta)
        .filter(Venta.id_usuario == current_user["id_usuario"])
        .order_by(Venta.id_venta.desc())
        .all()
    )
    return {"ok": True, "ventas": [venta_dict(v) for v in ventas]}


# ---------------------------------------------------------------
# Consultas del panel administrativo
# ---------------------------------------------------------------
@router.get("")
def listar(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    buscar: Optional[str] = Query(default=None, max_length=90),
    estado: Optional[str] = Query(default=None, max_length=12),
    metodo_pago: Optional[str] = Query(default=None, max_length=20),
    desde: Optional[str] = Query(default=None, max_length=10),
    hasta: Optional[str] = Query(default=None, max_length=10),
    orden: str = Query(default="recientes", max_length=20),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=100),
):
    query = db.query(Venta).options(joinedload(Venta.detalles))

    if buscar:
        patron = f"%{buscar.strip()}%"
        query = query.filter(
            or_(
                Venta.codigo.like(patron),
                Venta.cliente_nombre.like(patron),
                Venta.cliente_email.like(patron),
                Venta.cliente_documento.like(patron),
            )
        )
    if estado in ESTADOS_VENTA:
        query = query.filter(Venta.estado == estado)
    if metodo_pago:
        query = query.filter(Venta.metodo_pago == metodo_pago)
    if desde:
        try:
            query = query.filter(Venta.creado_en >= datetime.fromisoformat(desde))
        except ValueError:
            raise AppError(400, "La fecha 'desde' no es válida (formato AAAA-MM-DD).")
    if hasta:
        try:
            fin = datetime.fromisoformat(hasta) + timedelta(days=1)
            query = query.filter(Venta.creado_en < fin)
        except ValueError:
            raise AppError(400, "La fecha 'hasta' no es válida (formato AAAA-MM-DD).")

    total = query.count()

    if orden == "antiguos":
        query = query.order_by(Venta.id_venta.asc())
    elif orden == "total_desc":
        query = query.order_by(Venta.total.desc())
    elif orden == "total_asc":
        query = query.order_by(Venta.total.asc())
    else:
        query = query.order_by(Venta.id_venta.desc())

    ventas = query.offset((pagina - 1) * limite).limit(limite).all()

    resumen = db.query(
        func.coalesce(func.sum(Venta.total), 0),
        func.count(Venta.id_venta),
    ).filter(Venta.estado != "cancelada").first()

    return {
        "ok": True,
        "ventas": [venta_dict(v) for v in ventas],
        "paginacion": {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "total_paginas": max(1, (total + limite - 1) // limite),
        },
        "resumen": {
            "ingresos_totales": float(resumen[0] or 0),
            "pedidos_validos": int(resumen[1] or 0),
        },
    }


@router.get("/{id_venta}")
def obtener(
    id_venta: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    venta = db.query(Venta).filter(Venta.id_venta == id_venta).first()
    if not venta:
        raise AppError(404, "Pedido no encontrado.")

    # Un cliente solo puede ver sus propios pedidos, aunque cambie el id
    # en la URL: la comprobación es del backend, no del Frontend.
    if not _puede_ver(venta, current_user):
        raise AppError(403, "No tienes permisos para ver este pedido.")

    return {"ok": True, "venta": venta_dict(venta)}


@router.patch("/{id_venta}/estado")
def cambiar_estado(
    id_venta: int,
    body: VentaEstadoUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    nuevo_estado = (body.estado or "").strip()
    if nuevo_estado not in ESTADOS_VENTA:
        raise AppError(
            400,
            "Estado inválido.",
            {"estado": f"Debe ser uno de: {', '.join(ESTADOS_VENTA)}."},
        )

    venta = db.query(Venta).filter(Venta.id_venta == id_venta).first()
    if not venta:
        raise AppError(404, "Pedido no encontrado.")

    if nuevo_estado == venta.estado:
        return {"ok": True, "message": "El pedido ya tenía ese estado.", "venta": venta_dict(venta)}

    if nuevo_estado not in TRANSICIONES.get(venta.estado, set()):
        raise AppError(
            409,
            f"No se puede pasar un pedido de '{venta.estado}' a '{nuevo_estado}'.",
        )

    try:
        # Cancelar un pedido devuelve las unidades al inventario.
        if nuevo_estado == "cancelada":
            for detalle in venta.detalles:
                if not detalle.id_producto:
                    continue
                producto = (
                    db.query(Producto)
                    .filter(Producto.id_producto == detalle.id_producto)
                    .with_for_update()
                    .first()
                )
                if not producto:
                    continue
                stock_anterior = producto.stock
                producto.stock = stock_anterior + detalle.cantidad
                db.add(
                    MovimientoInventario(
                        id_producto=producto.id_producto,
                        tipo="entrada",
                        cantidad=detalle.cantidad,
                        stock_anterior=stock_anterior,
                        stock_nuevo=producto.stock,
                        motivo=f"Cancelación del pedido {venta.codigo}",
                        id_venta=venta.id_venta,
                        id_usuario=current_user["id_usuario"],
                    )
                )

        venta.estado = nuevo_estado
        db.commit()
        db.refresh(venta)
    except Exception:
        db.rollback()
        raise

    return {
        "ok": True,
        "message": f"Pedido marcado como {nuevo_estado}.",
        "venta": venta_dict(venta),
    }
