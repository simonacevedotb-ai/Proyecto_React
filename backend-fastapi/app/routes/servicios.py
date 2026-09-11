# CRUD de servicios técnicos.
#
#   GET    /api/servicios             público (activos) / gestor (todos)
#   GET    /api/servicios/{id}        público
#   POST   /api/servicios             administrador o empleado
#   PUT    /api/servicios/{id}        administrador o empleado
#   PATCH  /api/servicios/{id}/estado administrador o empleado
#   DELETE /api/servicios/{id}        administrador
#
# Las solicitudes que los clientes hacen sobre estos servicios viven en
# app/routes/solicitudes.py.

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import auth_optional, require_role
from app.database import get_db
from app.errors import AppError
from app.models import Servicio, SolicitudServicio
from app.schemas import EstadoUpdate, ServicioActualizar, ServicioCrear
from app.serializers import servicio_dict
from app.validations import limpiar_texto, validate_servicio

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")


def _find_by_id(db: Session, id_servicio: int) -> Optional[Servicio]:
    return db.query(Servicio).filter(Servicio.id_servicio == id_servicio).first()


@router.get("")
def listar(
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
    buscar: Optional[str] = Query(default=None, max_length=80),
):
    es_gestor = bool(current_user) and current_user.get("rol") in ROLES_GESTOR

    query = db.query(Servicio)
    if not es_gestor:
        query = query.filter(Servicio.estado == "activo")
    if buscar:
        patron = f"%{buscar.strip()}%"
        query = query.filter(
            or_(Servicio.nombre.like(patron), Servicio.descripcion.like(patron))
        )

    servicios = query.order_by(Servicio.id_servicio.asc()).all()
    return {"ok": True, "servicios": [servicio_dict(s) for s in servicios]}


@router.get("/{id_servicio}")
def obtener(
    id_servicio: int,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
):
    servicio = _find_by_id(db, id_servicio)
    if not servicio:
        raise AppError(404, "Servicio no encontrado.")

    es_gestor = bool(current_user) and current_user.get("rol") in ROLES_GESTOR
    if servicio.estado != "activo" and not es_gestor:
        raise AppError(404, "Servicio no encontrado.")

    return {"ok": True, "servicio": servicio_dict(servicio)}


@router.post("", status_code=201)
def crear(
    body: ServicioCrear,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    is_valid, errors = validate_servicio(body.model_dump())
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    servicio = Servicio(
        nombre=limpiar_texto(body.nombre, 80),
        descripcion=limpiar_texto(body.descripcion, 500) or None,
        precio=body.precio,
        duracion=limpiar_texto(body.duracion, 40) or None,
        icono=limpiar_texto(body.icono, 40) or None,
        imagen_url=(body.imagen_url or "").strip() or None,
    )
    db.add(servicio)
    db.commit()
    db.refresh(servicio)

    return {"ok": True, "message": "Servicio creado.", "servicio": servicio_dict(servicio)}


@router.put("/{id_servicio}")
def actualizar(
    id_servicio: int,
    body: ServicioActualizar,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    is_valid, errors = validate_servicio(body.model_dump())
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    servicio = _find_by_id(db, id_servicio)
    if not servicio:
        raise AppError(404, "Servicio no encontrado.")

    servicio.nombre = limpiar_texto(body.nombre, 80)
    servicio.descripcion = limpiar_texto(body.descripcion, 500) or None
    servicio.precio = body.precio
    servicio.duracion = limpiar_texto(body.duracion, 40) or None
    servicio.icono = limpiar_texto(body.icono, 40) or None
    servicio.imagen_url = (body.imagen_url or "").strip() or None
    db.commit()
    db.refresh(servicio)

    return {"ok": True, "message": "Servicio actualizado.", "servicio": servicio_dict(servicio)}


@router.patch("/{id_servicio}/estado")
def cambiar_estado(
    id_servicio: int,
    body: EstadoUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    if body.estado not in ("activo", "inactivo"):
        raise AppError(400, "Estado inválido.", {"estado": "Debe ser 'activo' o 'inactivo'."})

    servicio = _find_by_id(db, id_servicio)
    if not servicio:
        raise AppError(404, "Servicio no encontrado.")

    servicio.estado = body.estado
    db.commit()
    db.refresh(servicio)

    return {
        "ok": True,
        "message": f"Servicio marcado como {body.estado}.",
        "servicio": servicio_dict(servicio),
    }


@router.delete("/{id_servicio}")
def eliminar(
    id_servicio: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role("administrador")),
):
    servicio = _find_by_id(db, id_servicio)
    if not servicio:
        raise AppError(404, "Servicio no encontrado.")

    # Si ya hay solicitudes asociadas se desactiva en vez de borrar, para
    # no perder el historial de atención al cliente.
    tiene_solicitudes = (
        db.query(SolicitudServicio)
        .filter(SolicitudServicio.id_servicio == id_servicio)
        .first()
        is not None
    )
    if tiene_solicitudes:
        servicio.estado = "inactivo"
        db.commit()
        db.refresh(servicio)
        return {
            "ok": True,
            "message": (
                "El servicio tiene solicitudes registradas, por eso se desactivó en "
                "lugar de eliminarse (así no se pierde el histórico)."
            ),
            "servicio": servicio_dict(servicio),
            "desactivado": True,
        }

    db.delete(servicio)
    db.commit()
    return {"ok": True, "message": "Servicio eliminado.", "desactivado": False}
