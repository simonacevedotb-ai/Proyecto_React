# Control de inventario (kardex).
#
#   GET  /api/inventario/movimientos  historial de entradas/salidas/ajustes
#   GET  /api/inventario/alertas      productos agotados y con stock bajo
#   POST /api/inventario/movimientos  registrar entrada, salida o ajuste
#
# Todo cambio de stock queda registrado con stock anterior, stock nuevo,
# motivo y responsable, dentro de una transacción.

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.errors import AppError
from app.models import MovimientoInventario, Producto
from app.schemas import MovimientoCrear
from app.serializers import movimiento_dict, producto_dict
from app.validations import TIPOS_MOVIMIENTO, limpiar_texto

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")


@router.get("/movimientos")
def listar_movimientos(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    id_producto: Optional[int] = Query(default=None, ge=1),
    tipo: Optional[str] = Query(default=None, max_length=10),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=15, ge=1, le=100),
):
    query = db.query(MovimientoInventario).options(
        joinedload(MovimientoInventario.producto),
        joinedload(MovimientoInventario.usuario),
    )

    if id_producto:
        query = query.filter(MovimientoInventario.id_producto == id_producto)
    if tipo in TIPOS_MOVIMIENTO:
        query = query.filter(MovimientoInventario.tipo == tipo)

    total = query.count()
    movimientos = (
        query.order_by(MovimientoInventario.id_movimiento.desc())
        .offset((pagina - 1) * limite)
        .limit(limite)
        .all()
    )

    return {
        "ok": True,
        "movimientos": [movimiento_dict(m) for m in movimientos],
        "paginacion": {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "total_paginas": max(1, (total + limite - 1) // limite),
        },
    }


@router.get("/alertas")
def alertas(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    """Productos que necesitan reposición."""
    agotados = (
        db.query(Producto)
        .options(joinedload(Producto.categoria))
        .filter(Producto.estado == "activo", Producto.stock <= 0)
        .order_by(Producto.nombre.asc())
        .all()
    )
    bajos = (
        db.query(Producto)
        .options(joinedload(Producto.categoria))
        .filter(
            Producto.estado == "activo",
            Producto.stock > 0,
            Producto.stock <= Producto.stock_minimo,
        )
        .order_by(Producto.stock.asc())
        .all()
    )

    return {
        "ok": True,
        "agotados": [producto_dict(p) for p in agotados],
        "stock_bajo": [producto_dict(p) for p in bajos],
        "totales": {"agotados": len(agotados), "stock_bajo": len(bajos)},
    }


@router.post("/movimientos", status_code=201)
def crear_movimiento(
    body: MovimientoCrear,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    tipo = (body.tipo or "").strip().lower()
    if tipo not in TIPOS_MOVIMIENTO:
        raise AppError(
            400,
            "Tipo de movimiento inválido.",
            {"tipo": "Debe ser 'entrada', 'salida' o 'ajuste'."},
        )

    try:
        producto = (
            db.query(Producto)
            .filter(Producto.id_producto == body.id_producto)
            .with_for_update()
            .first()
        )
        if not producto:
            raise AppError(404, "Producto no encontrado.")

        stock_anterior = producto.stock

        if tipo == "entrada":
            stock_nuevo = stock_anterior + body.cantidad
        elif tipo == "salida":
            if body.cantidad > stock_anterior:
                raise AppError(
                    409,
                    f"No puedes retirar {body.cantidad} unidades: solo hay {stock_anterior} en stock.",
                    {"cantidad": f"Máximo disponible: {stock_anterior}."},
                )
            stock_nuevo = stock_anterior - body.cantidad
        else:  # ajuste: la cantidad es el nuevo total de existencias
            stock_nuevo = body.cantidad

        producto.stock = stock_nuevo

        movimiento = MovimientoInventario(
            id_producto=producto.id_producto,
            tipo=tipo,
            cantidad=abs(stock_nuevo - stock_anterior) if tipo == "ajuste" else body.cantidad,
            stock_anterior=stock_anterior,
            stock_nuevo=stock_nuevo,
            motivo=limpiar_texto(body.motivo, 150) or f"Movimiento manual ({tipo})",
            id_usuario=current_user["id_usuario"],
        )
        db.add(movimiento)
        db.commit()
        db.refresh(movimiento)
        db.refresh(producto)
    except AppError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    return {
        "ok": True,
        "message": f"Inventario actualizado: {stock_anterior} → {stock_nuevo} unidades.",
        "movimiento": movimiento_dict(movimiento),
        "producto": producto_dict(producto),
    }
