# Peticiones, quejas, reclamos y sugerencias (PQR).
#
#   POST   /api/pqr                  cualquiera -> radica una solicitud
#   GET    /api/pqr/consultar/{rad}  consulta pública por número de radicado
#   GET    /api/pqr/mis-pqr          las del usuario autenticado
#   GET    /api/pqr                  listado con filtros (admin/empleado)
#   GET    /api/pqr/{id}             detalle (dueño o gestor)
#   PATCH  /api/pqr/{id}/estado      admin/empleado -> mueve el estado
#   POST   /api/pqr/{id}/responder   admin/empleado -> responde y notifica
#
# El radicado es la clave del módulo: permite que alguien sin cuenta
# registre un caso y luego consulte cómo va, sin tener que iniciar sesión
# ni exponer los datos de nadie más.

import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.auth import auth_optional, auth_required, require_role
from app.database import get_db
from app.errors import AppError
from app.mailer import correo_respuesta_pqr, enviar_en_segundo_plano
from app.models import PQR, Usuario, Venta
from app.schemas import PQRCrear, PQREstadoUpdate, PQRResponder
from app.security import limite_contacto
from app.serializers import pqr_dict
from app.validations import limpiar_texto, validate_email_simple

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")
TIPOS = ("peticion", "queja", "reclamo", "sugerencia")
ESTADOS = ("pendiente", "en_proceso", "respondida", "cerrada")

# Una vez cerrada, la PQR no se reabre: se radica una nueva.
TRANSICIONES = {
    "pendiente": ("en_proceso", "respondida", "cerrada"),
    "en_proceso": ("respondida", "cerrada"),
    "respondida": ("cerrada", "en_proceso"),
    "cerrada": (),
}


def _radicado(db: Session) -> str:
    """Consecutivo por año más un sufijo aleatorio.

    El sufijo evita que alguien adivine el radicado del caso siguiente y
    consulte una solicitud que no es suya.
    """
    anio = datetime.now().year
    total = (
        db.query(func.count(PQR.id_pqr))
        .filter(PQR.radicado.like(f"PQR-{anio}-%"))
        .scalar()
        or 0
    )
    return f"PQR-{anio}-{total + 1:04d}{secrets.randbelow(100):02d}"


def _cargar(db: Session, id_pqr: int) -> PQR:
    registro = (
        db.query(PQR)
        .options(joinedload(PQR.venta), joinedload(PQR.responsable))
        .filter(PQR.id_pqr == id_pqr)
        .first()
    )
    if not registro:
        raise AppError(404, "La solicitud no existe.")
    return registro


# ---------------------------------------------------------------
# Radicación
# ---------------------------------------------------------------
@router.post("", status_code=201, dependencies=[Depends(limite_contacto)])
def crear(
    body: PQRCrear,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
):
    """Radica una PQR. No exige sesión: un visitante también puede."""
    tipo = (body.tipo or "").strip().lower()
    if tipo not in TIPOS:
        raise AppError(
            400,
            f"El tipo debe ser uno de: {', '.join(TIPOS)}.",
            {"tipo": "Tipo no válido."},
        )

    email = (body.email or "").strip().lower()
    if not validate_email_simple(email):
        raise AppError(400, "Datos inválidos.", {"email": "Correo no válido."})

    # Si se referencia un pedido, tiene que existir y ser del mismo correo
    id_venta = None
    if body.id_venta:
        venta = db.query(Venta).filter(Venta.id_venta == body.id_venta).first()
        if not venta:
            raise AppError(404, "El pedido referenciado no existe.")
        if venta.cliente_email.lower() != email and not (
            current_user and current_user.get("rol") in ROLES_GESTOR
        ):
            raise AppError(
                403,
                "Ese pedido está a nombre de otro correo.",
                {"id_venta": "El pedido no corresponde a este correo."},
            )
        id_venta = venta.id_venta

    registro = PQR(
        radicado=_radicado(db),
        id_usuario=current_user["id_usuario"] if current_user else None,
        tipo=tipo,
        asunto=limpiar_texto(body.asunto, 120),
        descripcion=limpiar_texto(body.descripcion, 1000),
        cliente_nombre=limpiar_texto(body.nombre, 80),
        cliente_email=email,
        cliente_telefono=(body.telefono or "").strip() or None,
        id_venta=id_venta,
        estado="pendiente",
    )

    try:
        db.add(registro)
        db.commit()
    except Exception:
        db.rollback()
        raise AppError(500, "No se pudo radicar la solicitud.")

    db.refresh(registro)
    return {
        "ok": True,
        "message": (
            f"Solicitud radicada con el número {registro.radicado}. "
            "Guárdalo para consultar el estado."
        ),
        "pqr": pqr_dict(registro),
    }


@router.get("/consultar/{radicado}")
def consultar(radicado: str, db: Session = Depends(get_db)):
    """Consulta pública por radicado.

    Devuelve solo lo necesario para seguir el caso; no expone el correo ni
    el teléfono completos de quien lo radicó.
    """
    registro = (
        db.query(PQR).filter(PQR.radicado == radicado.strip().upper()).first()
    )
    if not registro:
        raise AppError(404, "No encontramos una solicitud con ese radicado.")

    return {
        "ok": True,
        "pqr": {
            "radicado": registro.radicado,
            "tipo": registro.tipo,
            "asunto": registro.asunto,
            "estado": registro.estado,
            "respuesta": registro.respuesta,
            "creado_en": registro.creado_en.isoformat(sep=" ") if registro.creado_en else None,
            "respondida_en": (
                registro.respondida_en.isoformat(sep=" ") if registro.respondida_en else None
            ),
        },
    }


# ---------------------------------------------------------------
# Consulta
# ---------------------------------------------------------------
@router.get("/mis-pqr")
def mis_pqr(
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    registros = (
        db.query(PQR)
        .options(joinedload(PQR.venta), joinedload(PQR.responsable))
        .filter(PQR.id_usuario == current_user["id_usuario"])
        .order_by(PQR.id_pqr.desc())
        .all()
    )
    return {"ok": True, "pqr": [pqr_dict(p) for p in registros]}


@router.get("")
def listar(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    buscar: Optional[str] = Query(default=None, max_length=90),
    tipo: Optional[str] = Query(default=None, max_length=12),
    estado: Optional[str] = Query(default=None, max_length=12),
    desde: Optional[str] = Query(default=None, max_length=10),
    hasta: Optional[str] = Query(default=None, max_length=10),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=100),
):
    query = db.query(PQR).options(joinedload(PQR.venta), joinedload(PQR.responsable))

    if buscar:
        patron = f"%{buscar.strip()}%"
        query = query.filter(
            or_(
                PQR.radicado.like(patron),
                PQR.asunto.like(patron),
                PQR.cliente_nombre.like(patron),
                PQR.cliente_email.like(patron),
            )
        )
    if tipo in TIPOS:
        query = query.filter(PQR.tipo == tipo)
    if estado in ESTADOS:
        query = query.filter(PQR.estado == estado)
    if desde:
        try:
            query = query.filter(PQR.creado_en >= datetime.fromisoformat(desde))
        except ValueError:
            raise AppError(400, "La fecha 'desde' no es válida (formato AAAA-MM-DD).")
    if hasta:
        try:
            query = query.filter(
                PQR.creado_en < datetime.fromisoformat(hasta) + timedelta(days=1)
            )
        except ValueError:
            raise AppError(400, "La fecha 'hasta' no es válida (formato AAAA-MM-DD).")

    total = query.count()
    registros = (
        query.order_by(PQR.id_pqr.desc())
        .offset((pagina - 1) * limite)
        .limit(limite)
        .all()
    )

    por_estado = dict(
        db.query(PQR.estado, func.count(PQR.id_pqr)).group_by(PQR.estado).all()
    )

    return {
        "ok": True,
        "pqr": [pqr_dict(p) for p in registros],
        "paginacion": {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "total_paginas": max(1, (total + limite - 1) // limite),
        },
        "resumen": {estado: int(por_estado.get(estado, 0)) for estado in ESTADOS},
    }


@router.get("/{id_pqr}")
def obtener(
    id_pqr: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    registro = _cargar(db, id_pqr)
    if current_user.get("rol") not in ROLES_GESTOR and (
        registro.id_usuario != current_user["id_usuario"]
    ):
        raise AppError(403, "No tienes permiso para ver esta solicitud.")
    return {"ok": True, "pqr": pqr_dict(registro)}


# ---------------------------------------------------------------
# Gestión
# ---------------------------------------------------------------
@router.patch("/{id_pqr}/estado")
def cambiar_estado(
    id_pqr: int,
    body: PQREstadoUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    registro = _cargar(db, id_pqr)
    nuevo = (body.estado or "").strip().lower()

    if nuevo not in ESTADOS:
        raise AppError(
            400,
            f"Estado no válido. Debe ser uno de: {', '.join(ESTADOS)}.",
            {"estado": "Estado no permitido."},
        )
    if nuevo == registro.estado:
        raise AppError(400, f"La solicitud ya está en estado '{nuevo}'.")
    if nuevo not in TRANSICIONES[registro.estado]:
        raise AppError(
            409,
            f"No se puede pasar de '{registro.estado}' a '{nuevo}'.",
            {"estado": "Transición no permitida."},
        )

    registro.estado = nuevo
    db.commit()
    db.refresh(registro)

    return {
        "ok": True,
        "message": f"Solicitud {registro.radicado} marcada como {nuevo.replace('_', ' ')}.",
        "pqr": pqr_dict(registro),
    }


@router.post("/{id_pqr}/responder")
def responder(
    id_pqr: int,
    body: PQRResponder,
    tareas: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    """Guarda la respuesta y avisa al cliente por correo."""
    registro = _cargar(db, id_pqr)
    if registro.estado == "cerrada":
        raise AppError(409, "La solicitud está cerrada y ya no admite respuestas.")

    estado = (body.estado or "respondida").strip().lower()
    if estado not in ("respondida", "cerrada"):
        estado = "respondida"

    registro.respuesta = limpiar_texto(body.respuesta, 1000)
    registro.estado = estado
    registro.id_responsable = current_user["id_usuario"]
    registro.respondida_en = datetime.now()
    db.commit()
    db.refresh(registro)

    asunto, cuerpo, html = correo_respuesta_pqr(
        registro.cliente_nombre,
        registro.radicado,
        registro.asunto,
        registro.respuesta,
    )
    enviar_en_segundo_plano(tareas, registro.cliente_email, asunto, cuerpo, html)

    return {
        "ok": True,
        "message": f"Respuesta enviada a {registro.cliente_email}.",
        "pqr": pqr_dict(registro),
    }
