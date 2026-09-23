# CRUD de productos + catálogo público con búsqueda, filtros,
# ordenamiento y paginación.
#
# Reglas de acceso:
#   GET    /api/productos            público (solo activos) / gestor (todos)
#   GET    /api/productos/{id}       público
#   POST   /api/productos            administrador o empleado
#   PUT    /api/productos/{id}       administrador o empleado
#   PATCH  /api/productos/{id}/estado administrador o empleado
#   DELETE /api/productos/{id}       administrador

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.auth import auth_optional, require_role
from app.database import get_db
from app.errors import AppError
from app.models import Categoria, MovimientoInventario, Producto, VentaDetalle
from app.schemas import (
    EstadoUpdate,
    ProductoActualizar,
    ProductoCrear,
    ProductoDetalleRespuesta,
    ProductoEliminadoRespuesta,
    ProductosRespuesta,
    ProductoUnicoRespuesta,
)
from app.serializers import producto_dict
from app.validations import limpiar_texto, validate_producto

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")

ORDENES = {
    "recientes": (Producto.id_producto, "desc"),
    "precio_asc": (Producto.precio, "asc"),
    "precio_desc": (Producto.precio, "desc"),
    "nombre": (Producto.nombre, "asc"),
    "stock": (Producto.stock, "asc"),
}


def _al_azar(db: Session):
    """Orden aleatorio, con el nombre que use cada motor.

    MySQL la llama RAND() y SQLite (el que usan las pruebas con Pytest)
    la llama RANDOM(). Preguntarle al dialecto evita que la consulta
    dependa del motor.
    """
    return func.rand() if db.bind.dialect.name == "mysql" else func.random()


def _find_by_id(db: Session, id_producto: int) -> Optional[Producto]:
    return (
        db.query(Producto)
        .options(joinedload(Producto.categoria))
        .filter(Producto.id_producto == id_producto)
        .first()
    )


def _validar_categoria(db: Session, id_categoria):
    if id_categoria in (None, "", 0):
        return None
    categoria = db.query(Categoria).filter(Categoria.id_categoria == id_categoria).first()
    if not categoria:
        raise AppError(400, "La categoría seleccionada no existe.", {"id_categoria": "Categoría inválida."})
    return categoria.id_categoria


def _registrar_movimiento(db, producto, stock_anterior, stock_nuevo, motivo, id_usuario):
    """Deja rastro en el kardex cuando el stock cambia desde el CRUD."""
    if stock_anterior == stock_nuevo:
        return
    diferencia = stock_nuevo - stock_anterior
    db.add(
        MovimientoInventario(
            id_producto=producto.id_producto,
            tipo="entrada" if diferencia > 0 else "salida",
            cantidad=abs(diferencia),
            stock_anterior=stock_anterior,
            stock_nuevo=stock_nuevo,
            motivo=motivo,
            id_usuario=id_usuario,
        )
    )


# ---------------------------------------------------------------
# Consultas
# ---------------------------------------------------------------
@router.get(
    "",
    response_model=ProductosRespuesta,
    summary="Catálogo con búsqueda, filtros y paginación",
    response_description="Página de productos y los datos de paginación.",
)
def listar(
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
    buscar: Optional[str] = Query(default=None, max_length=80),
    categoria: Optional[int] = Query(default=None, ge=1),
    marca: Optional[str] = Query(default=None, max_length=40),
    estado: Optional[str] = Query(default=None, max_length=10),
    stock: Optional[str] = Query(default=None, max_length=12),
    destacado: Optional[bool] = Query(default=None),
    oferta: Optional[bool] = Query(default=None),
    orden: str = Query(default="recientes", max_length=20),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=12, ge=1, le=100),
):
    es_gestor = bool(current_user) and current_user.get("rol") in ROLES_GESTOR

    query = db.query(Producto).options(joinedload(Producto.categoria))

    # El público solo ve productos activos, aunque manipule la URL.
    if es_gestor:
        if estado in ("activo", "inactivo"):
            query = query.filter(Producto.estado == estado)
    else:
        query = query.filter(Producto.estado == "activo")

    if buscar:
        patron = f"%{buscar.strip()}%"
        query = query.filter(
            or_(
                Producto.nombre.like(patron),
                Producto.marca.like(patron),
                Producto.descripcion.like(patron),
            )
        )
    if categoria:
        query = query.filter(Producto.id_categoria == categoria)
    if marca:
        query = query.filter(Producto.marca == marca)
    if destacado is not None:
        query = query.filter(Producto.destacado == destacado)
    if oferta:
        # Producto en oferta = tiene precio anterior mayor al precio actual
        query = query.filter(
            Producto.precio_anterior.isnot(None),
            Producto.precio_anterior > Producto.precio,
        )
    if stock == "agotado":
        query = query.filter(Producto.stock <= 0)
    elif stock == "bajo":
        query = query.filter(Producto.stock > 0, Producto.stock <= Producto.stock_minimo)
    elif stock == "disponible":
        query = query.filter(Producto.stock > 0)

    total = query.count()

    columna, direccion = ORDENES.get(orden, ORDENES["recientes"])
    query = query.order_by(columna.asc() if direccion == "asc" else columna.desc())

    productos = query.offset((pagina - 1) * limite).limit(limite).all()
    total_paginas = max(1, (total + limite - 1) // limite)

    return {
        "ok": True,
        "productos": [producto_dict(p) for p in productos],
        "paginacion": {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "total_paginas": total_paginas,
        },
    }


@router.get("/marcas")
def listar_marcas(db: Session = Depends(get_db)):
    """Marcas disponibles, para el filtro del catálogo."""
    filas = (
        db.query(Producto.marca, func.count(Producto.id_producto))
        .filter(Producto.estado == "activo")
        .group_by(Producto.marca)
        .order_by(Producto.marca.asc())
        .all()
    )
    return {"ok": True, "marcas": [{"marca": m, "total": t} for m, t in filas]}


@router.get(
    "/{id_producto}",
    response_model=ProductoDetalleRespuesta,
    summary="Ficha de un producto y sus relacionados",
    responses={404: {"description": "El producto no existe o está inactivo."}},
)
def obtener(
    id_producto: Annotated[int, Path(ge=1, description="Identificador del producto.")],
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
):
    producto = _find_by_id(db, id_producto)
    if not producto:
        raise AppError(404, "Producto no encontrado.")

    es_gestor = bool(current_user) and current_user.get("rol") in ROLES_GESTOR
    if producto.estado != "activo" and not es_gestor:
        raise AppError(404, "Producto no encontrado.")

    relacionados = []
    if producto.id_categoria:
        relacionados = (
            db.query(Producto)
            .options(joinedload(Producto.categoria))
            .filter(
                Producto.id_categoria == producto.id_categoria,
                Producto.id_producto != producto.id_producto,
                Producto.estado == "activo",
            )
            .order_by(_al_azar(db))
            .limit(4)
            .all()
        )

    return {
        "ok": True,
        "producto": producto_dict(producto),
        "relacionados": [producto_dict(p) for p in relacionados],
    }


# ---------------------------------------------------------------
# Escritura (protegida por rol)
# ---------------------------------------------------------------
@router.post(
    "",
    status_code=201,
    response_model=ProductoUnicoRespuesta,
    summary="Crea un producto (administrador o empleado)",
    responses={
        400: {"description": "Datos inválidos."},
        401: {"description": "Falta el token."},
        403: {"description": "El rol no tiene permiso."},
    },
)
def crear(
    body: ProductoCrear,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    is_valid, errors = validate_producto(body.model_dump())
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    id_categoria = _validar_categoria(db, body.id_categoria)
    stock_inicial = int(body.stock or 0)

    producto = Producto(
        nombre=limpiar_texto(body.nombre, 80),
        marca=limpiar_texto(body.marca, 40),
        id_categoria=id_categoria,
        descripcion=limpiar_texto(body.descripcion, 500) or None,
        precio=body.precio,
        precio_anterior=body.precio_anterior or None,
        stock=stock_inicial,
        stock_minimo=int(body.stock_minimo or 0),
        destacado=bool(body.destacado),
        imagen_url=(body.imagen_url or "").strip() or None,
    )
    db.add(producto)
    db.flush()

    if stock_inicial > 0:
        _registrar_movimiento(
            db, producto, 0, stock_inicial, "Stock inicial del producto",
            current_user["id_usuario"],
        )

    db.commit()
    db.refresh(producto)
    producto = _find_by_id(db, producto.id_producto)

    return {"ok": True, "message": "Producto creado.", "producto": producto_dict(producto)}


@router.put(
    "/{id_producto}",
    response_model=ProductoUnicoRespuesta,
    summary="Actualiza un producto completo",
)
def actualizar(
    id_producto: Annotated[int, Path(ge=1, description="Identificador del producto.")],
    body: ProductoActualizar,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    is_valid, errors = validate_producto(body.model_dump())
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    producto = _find_by_id(db, id_producto)
    if not producto:
        raise AppError(404, "Producto no encontrado.")

    id_categoria = _validar_categoria(db, body.id_categoria)
    stock_anterior = producto.stock
    stock_nuevo = int(body.stock or 0)

    producto.nombre = limpiar_texto(body.nombre, 80)
    producto.marca = limpiar_texto(body.marca, 40)
    producto.id_categoria = id_categoria
    producto.descripcion = limpiar_texto(body.descripcion, 500) or None
    producto.precio = body.precio
    producto.precio_anterior = body.precio_anterior or None
    producto.stock = stock_nuevo
    producto.stock_minimo = int(body.stock_minimo or 0)
    producto.destacado = bool(body.destacado)
    producto.imagen_url = (body.imagen_url or "").strip() or None

    _registrar_movimiento(
        db, producto, stock_anterior, stock_nuevo,
        "Ajuste manual desde la edición del producto", current_user["id_usuario"],
    )

    db.commit()
    db.refresh(producto)
    producto = _find_by_id(db, producto.id_producto)

    return {"ok": True, "message": "Producto actualizado.", "producto": producto_dict(producto)}


@router.patch(
    "/{id_producto}/estado",
    response_model=ProductoUnicoRespuesta,
    summary="Activa o desactiva un producto",
)
def cambiar_estado(
    id_producto: Annotated[int, Path(ge=1, description="Identificador del producto.")],
    body: EstadoUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    if body.estado not in ("activo", "inactivo"):
        raise AppError(400, "Estado inválido.", {"estado": "Debe ser 'activo' o 'inactivo'."})

    producto = _find_by_id(db, id_producto)
    if not producto:
        raise AppError(404, "Producto no encontrado.")

    producto.estado = body.estado
    db.commit()
    db.refresh(producto)
    producto = _find_by_id(db, producto.id_producto)

    return {
        "ok": True,
        "message": f"Producto marcado como {body.estado}.",
        "producto": producto_dict(producto),
    }


@router.delete(
    "/{id_producto}",
    response_model=ProductoEliminadoRespuesta,
    summary="Elimina un producto; si ya se vendió, lo desactiva",
)
def eliminar(
    id_producto: Annotated[int, Path(ge=1, description="Identificador del producto.")],
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role("administrador")),
):
    producto = _find_by_id(db, id_producto)
    if not producto:
        raise AppError(404, "Producto no encontrado.")

    # Si el producto ya se vendió no se borra: se desactiva. Así el
    # histórico de ventas conserva a qué producto correspondía cada línea.
    vendido = (
        db.query(VentaDetalle).filter(VentaDetalle.id_producto == id_producto).first()
        is not None
    )
    if vendido:
        producto.estado = "inactivo"
        db.commit()
        db.refresh(producto)
        producto = _find_by_id(db, producto.id_producto)
        return {
            "ok": True,
            "message": (
                "El producto tiene ventas registradas, por eso se desactivó en lugar de "
                "eliminarse (así no se pierde el histórico)."
            ),
            "producto": producto_dict(producto),
            "desactivado": True,
        }

    db.delete(producto)
    db.commit()
    return {"ok": True, "message": "Producto eliminado.", "desactivado": False}
