# CRUD de categorías del catálogo.
#
#   GET    /api/categorias             público (activas) / gestor (todas)
#   POST   /api/categorias             administrador o empleado
#   PUT    /api/categorias/{id}        administrador o empleado
#   PATCH  /api/categorias/{id}/estado administrador o empleado
#   DELETE /api/categorias/{id}        administrador

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import auth_optional, require_role
from app.database import get_db
from app.errors import AppError
from app.models import Categoria, Producto
from app.schemas import CategoriaActualizar, CategoriaCrear, EstadoUpdate
from app.serializers import categoria_dict
from app.validations import limpiar_texto, slugify, validate_categoria

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")


def _conteos(db: Session) -> dict:
    filas = (
        db.query(Producto.id_categoria, func.count(Producto.id_producto))
        .filter(Producto.estado == "activo")
        .group_by(Producto.id_categoria)
        .all()
    )
    return {id_cat: total for id_cat, total in filas if id_cat is not None}


def _slug_unico(db: Session, nombre: str, id_actual: Optional[int] = None) -> str:
    base = slugify(nombre)
    slug = base
    contador = 2
    while True:
        query = db.query(Categoria).filter(Categoria.slug == slug)
        if id_actual:
            query = query.filter(Categoria.id_categoria != id_actual)
        if not query.first():
            return slug
        slug = f"{base}-{contador}"
        contador += 1


@router.get("")
def listar(
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
):
    es_gestor = bool(current_user) and current_user.get("rol") in ROLES_GESTOR

    query = db.query(Categoria)
    if not es_gestor:
        query = query.filter(Categoria.estado == "activo")

    categorias = query.order_by(Categoria.nombre.asc()).all()
    conteos = _conteos(db)

    return {
        "ok": True,
        "categorias": [
            categoria_dict(c, conteos.get(c.id_categoria, 0)) for c in categorias
        ],
    }


@router.post("", status_code=201)
def crear(
    body: CategoriaCrear,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    is_valid, errors = validate_categoria(body.model_dump())
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    nombre = limpiar_texto(body.nombre, 60)
    if db.query(Categoria).filter(Categoria.nombre == nombre).first():
        raise AppError(409, "Ya existe una categoría con ese nombre.", {"nombre": "Nombre duplicado."})

    categoria = Categoria(
        nombre=nombre,
        slug=_slug_unico(db, nombre),
        descripcion=limpiar_texto(body.descripcion, 255) or None,
        icono=limpiar_texto(body.icono, 40) or None,
    )
    db.add(categoria)
    db.commit()
    db.refresh(categoria)

    return {"ok": True, "message": "Categoría creada.", "categoria": categoria_dict(categoria, 0)}


@router.put("/{id_categoria}")
def actualizar(
    id_categoria: int,
    body: CategoriaActualizar,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    is_valid, errors = validate_categoria(body.model_dump())
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    categoria = db.query(Categoria).filter(Categoria.id_categoria == id_categoria).first()
    if not categoria:
        raise AppError(404, "Categoría no encontrada.")

    nombre = limpiar_texto(body.nombre, 60)
    duplicada = (
        db.query(Categoria)
        .filter(Categoria.nombre == nombre, Categoria.id_categoria != id_categoria)
        .first()
    )
    if duplicada:
        raise AppError(409, "Ya existe otra categoría con ese nombre.", {"nombre": "Nombre duplicado."})

    categoria.nombre = nombre
    categoria.slug = _slug_unico(db, nombre, id_categoria)
    categoria.descripcion = limpiar_texto(body.descripcion, 255) or None
    categoria.icono = limpiar_texto(body.icono, 40) or None
    db.commit()
    db.refresh(categoria)

    conteos = _conteos(db)
    return {
        "ok": True,
        "message": "Categoría actualizada.",
        "categoria": categoria_dict(categoria, conteos.get(categoria.id_categoria, 0)),
    }


@router.patch("/{id_categoria}/estado")
def cambiar_estado(
    id_categoria: int,
    body: EstadoUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    if body.estado not in ("activo", "inactivo"):
        raise AppError(400, "Estado inválido.", {"estado": "Debe ser 'activo' o 'inactivo'."})

    categoria = db.query(Categoria).filter(Categoria.id_categoria == id_categoria).first()
    if not categoria:
        raise AppError(404, "Categoría no encontrada.")

    categoria.estado = body.estado
    db.commit()
    db.refresh(categoria)

    conteos = _conteos(db)
    return {
        "ok": True,
        "message": f"Categoría marcada como {body.estado}.",
        "categoria": categoria_dict(categoria, conteos.get(categoria.id_categoria, 0)),
    }


@router.delete("/{id_categoria}")
def eliminar(
    id_categoria: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role("administrador")),
):
    categoria = db.query(Categoria).filter(Categoria.id_categoria == id_categoria).first()
    if not categoria:
        raise AppError(404, "Categoría no encontrada.")

    total = db.query(Producto).filter(Producto.id_categoria == id_categoria).count()
    if total > 0:
        raise AppError(
            409,
            f"No se puede eliminar: hay {total} producto(s) en esta categoría. "
            "Muévelos a otra categoría o desactívala.",
        )

    db.delete(categoria)
    db.commit()
    return {"ok": True, "message": "Categoría eliminada."}
