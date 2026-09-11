# Solicitudes de servicio técnico.
#
# Convierte la sección de Servicios en algo funcional: el cliente agenda
# un servicio, queda registrado en la base de datos con un código de
# seguimiento, y el administrador/empleado lo atiende desde el panel.
#
#   POST  /api/solicitudes               cliente autenticado
#   GET   /api/solicitudes/mis-solicitudes  las del usuario autenticado
#   GET   /api/solicitudes               admin/empleado (filtros + paginación)
#   PATCH /api/solicitudes/{id}          admin/empleado -> estado + respuesta

import random
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import auth_required, require_role
from app.database import get_db
from app.errors import AppError
from app.models import Servicio, SolicitudServicio, Usuario
from app.schemas import SolicitudActualizar, SolicitudCrear
from app.serializers import solicitud_dict
from app.validations import ESTADOS_SOLICITUD, limpiar_texto, validate_solicitud

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")


def _generar_codigo(db: Session) -> str:
    for _ in range(20):
        codigo = f"SV-{datetime.now():%Y%m%d}-{random.randint(1000, 9999)}"
        if not db.query(SolicitudServicio.id_solicitud).filter(
            SolicitudServicio.codigo == codigo
        ).first():
            return codigo
    return f"SV-{datetime.now():%Y%m%d%H%M%S}"


@router.post("", status_code=201)
def crear(
    body: SolicitudCrear,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    is_valid, errors = validate_solicitud(body.model_dump())
    if not is_valid:
        raise AppError(400, "Revisa los datos de la solicitud.", errors)

    servicio = (
        db.query(Servicio)
        .filter(Servicio.id_servicio == body.id_servicio, Servicio.estado == "activo")
        .first()
    )
    if not servicio:
        raise AppError(404, "El servicio seleccionado no está disponible.")

    usuario = (
        db.query(Usuario).filter(Usuario.id_usuario == current_user["id_usuario"]).first()
    )
    if not usuario or usuario.estado != "activo":
        raise AppError(403, "Tu cuenta no está activa. Contacta al administrador.")

    solicitud = SolicitudServicio(
        codigo=_generar_codigo(db),
        id_servicio=servicio.id_servicio,
        id_usuario=usuario.id_usuario,
        nombre_servicio=servicio.nombre,
        precio_servicio=servicio.precio,
        cliente_nombre=limpiar_texto(body.cliente_nombre, 90),
        cliente_email=body.cliente_email.strip().lower(),
        cliente_telefono=body.cliente_telefono.strip(),
        equipo=limpiar_texto(body.equipo, 80) or None,
        descripcion=limpiar_texto(body.descripcion, 500),
        estado="pendiente",
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)

    return {
        "ok": True,
        "message": (
            f"Solicitud {solicitud.codigo} registrada. Nuestro equipo técnico te "
            "contactará muy pronto."
        ),
        "solicitud": solicitud_dict(solicitud),
    }


@router.get("/mis-solicitudes")
def mis_solicitudes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth_required),
):
    solicitudes = (
        db.query(SolicitudServicio)
        .filter(SolicitudServicio.id_usuario == current_user["id_usuario"])
        .order_by(SolicitudServicio.id_solicitud.desc())
        .all()
    )
    return {"ok": True, "solicitudes": [solicitud_dict(s) for s in solicitudes]}


@router.get("")
def listar(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    buscar: Optional[str] = Query(default=None, max_length=90),
    estado: Optional[str] = Query(default=None, max_length=12),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=100),
):
    query = db.query(SolicitudServicio)

    if buscar:
        patron = f"%{buscar.strip()}%"
        query = query.filter(
            or_(
                SolicitudServicio.codigo.like(patron),
                SolicitudServicio.cliente_nombre.like(patron),
                SolicitudServicio.cliente_email.like(patron),
                SolicitudServicio.nombre_servicio.like(patron),
            )
        )
    if estado in ESTADOS_SOLICITUD:
        query = query.filter(SolicitudServicio.estado == estado)

    total = query.count()
    solicitudes = (
        query.order_by(SolicitudServicio.id_solicitud.desc())
        .offset((pagina - 1) * limite)
        .limit(limite)
        .all()
    )

    return {
        "ok": True,
        "solicitudes": [solicitud_dict(s) for s in solicitudes],
        "paginacion": {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "total_paginas": max(1, (total + limite - 1) // limite),
        },
    }


@router.patch("/{id_solicitud}")
def actualizar(
    id_solicitud: int,
    body: SolicitudActualizar,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    if body.estado not in ESTADOS_SOLICITUD:
        raise AppError(
            400,
            "Estado inválido.",
            {"estado": f"Debe ser uno de: {', '.join(ESTADOS_SOLICITUD)}."},
        )

    solicitud = (
        db.query(SolicitudServicio)
        .filter(SolicitudServicio.id_solicitud == id_solicitud)
        .first()
    )
    if not solicitud:
        raise AppError(404, "Solicitud no encontrada.")

    solicitud.estado = body.estado
    if body.respuesta is not None:
        solicitud.respuesta = limpiar_texto(body.respuesta, 500) or None
    db.commit()
    db.refresh(solicitud)

    return {
        "ok": True,
        "message": "Solicitud actualizada.",
        "solicitud": solicitud_dict(solicitud),
    }
