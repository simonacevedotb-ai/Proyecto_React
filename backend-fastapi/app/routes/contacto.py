# Formulario de contacto de la página pública.
#
#   POST  /api/contacto           público (con límite de envíos por IP)
#   GET   /api/contacto           admin/empleado (bandeja de mensajes)
#   PATCH /api/contacto/{id}/estado  admin/empleado
#   DELETE /api/contacto/{id}     administrador

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import auth_optional, require_role
from app.database import get_db
from app.errors import AppError
from app.models import MensajeContacto
from app.schemas import MensajeCrear, MensajeEstadoUpdate
from app.security import limite_contacto
from app.serializers import mensaje_dict
from app.validations import ESTADOS_MENSAJE, limpiar_texto, validate_mensaje

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")


@router.post("", status_code=201, dependencies=[Depends(limite_contacto)])
def crear(
    body: MensajeCrear,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
):
    """Cualquier visitante puede escribir; si hay sesión se aprovechan sus datos."""
    is_valid, errors = validate_mensaje(body.model_dump())
    if not is_valid:
        raise AppError(400, "Revisa los datos del formulario.", errors)

    mensaje = MensajeContacto(
        nombre=limpiar_texto(body.nombre, 80),
        email=body.email.strip().lower(),
        telefono=(body.telefono or "").strip() or None,
        asunto=limpiar_texto(body.asunto, 120),
        mensaje=limpiar_texto(body.mensaje, 1000),
    )
    db.add(mensaje)
    db.commit()
    db.refresh(mensaje)

    return {
        "ok": True,
        "message": "¡Mensaje enviado! Te responderemos al correo que registraste.",
        "mensaje_id": mensaje.id_mensaje,
    }


@router.get("")
def listar(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    buscar: Optional[str] = Query(default=None, max_length=120),
    estado: Optional[str] = Query(default=None, max_length=12),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=100),
):
    query = db.query(MensajeContacto)

    if buscar:
        patron = f"%{buscar.strip()}%"
        query = query.filter(
            or_(
                MensajeContacto.nombre.like(patron),
                MensajeContacto.email.like(patron),
                MensajeContacto.asunto.like(patron),
            )
        )
    if estado in ESTADOS_MENSAJE:
        query = query.filter(MensajeContacto.estado == estado)

    total = query.count()
    mensajes = (
        query.order_by(MensajeContacto.id_mensaje.desc())
        .offset((pagina - 1) * limite)
        .limit(limite)
        .all()
    )
    nuevos = db.query(MensajeContacto).filter(MensajeContacto.estado == "nuevo").count()

    return {
        "ok": True,
        "mensajes": [mensaje_dict(m) for m in mensajes],
        "nuevos": nuevos,
        "paginacion": {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "total_paginas": max(1, (total + limite - 1) // limite),
        },
    }


@router.patch("/{id_mensaje}/estado")
def cambiar_estado(
    id_mensaje: int,
    body: MensajeEstadoUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    if body.estado not in ESTADOS_MENSAJE:
        raise AppError(
            400,
            "Estado inválido.",
            {"estado": f"Debe ser uno de: {', '.join(ESTADOS_MENSAJE)}."},
        )

    mensaje = db.query(MensajeContacto).filter(MensajeContacto.id_mensaje == id_mensaje).first()
    if not mensaje:
        raise AppError(404, "Mensaje no encontrado.")

    mensaje.estado = body.estado
    db.commit()
    db.refresh(mensaje)

    return {"ok": True, "message": "Mensaje actualizado.", "mensaje": mensaje_dict(mensaje)}


@router.delete("/{id_mensaje}")
def eliminar(
    id_mensaje: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role("administrador")),
):
    mensaje = db.query(MensajeContacto).filter(MensajeContacto.id_mensaje == id_mensaje).first()
    if not mensaje:
        raise AppError(404, "Mensaje no encontrado.")

    db.delete(mensaje)
    db.commit()
    return {"ok": True, "message": "Mensaje eliminado."}
