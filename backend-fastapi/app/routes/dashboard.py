# Métricas y reportes del panel administrativo.
#
#   GET /api/dashboard/resumen   tarjetas + gráficas + últimas ventas
#   GET /api/dashboard/reporte   reporte de ventas por rango de fechas
#
# Todos los números salen de consultas agregadas sobre la base de datos:
# no hay datos de ejemplo ni valores fijos en el código.

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.errors import AppError
from app.models import (
    PQR,
    Factura,
    MensajeContacto,
    Producto,
    SolicitudServicio,
    Usuario,
    Venta,
    VentaDetalle,
)
from app.serializers import producto_dict, venta_dict

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")

# Los pedidos cancelados no cuentan como ingreso.
NO_CANCELADAS = Venta.estado != "cancelada"

MESES_ES = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]


def _rango(db: Session, desde: datetime, hasta: Optional[datetime] = None):
    """(ingresos, cantidad de pedidos) en el rango indicado."""
    query = db.query(
        func.coalesce(func.sum(Venta.total), 0), func.count(Venta.id_venta)
    ).filter(NO_CANCELADAS, Venta.creado_en >= desde)
    if hasta:
        query = query.filter(Venta.creado_en < hasta)
    total, cantidad = query.first()
    return float(total or 0), int(cantidad or 0)


@router.get("/resumen")
def resumen(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
):
    hoy = datetime.combine(date.today(), datetime.min.time())
    inicio_mes = hoy.replace(day=1)
    inicio_ayer = hoy - timedelta(days=1)
    mes_anterior_fin = inicio_mes
    mes_anterior_inicio = (inicio_mes - timedelta(days=1)).replace(day=1)

    # --- Tarjetas principales ---
    ingresos_totales, pedidos_totales = _rango(db, datetime(1970, 1, 1))
    ingresos_hoy, pedidos_hoy = _rango(db, hoy)
    ingresos_ayer, _ = _rango(db, inicio_ayer, hoy)
    ingresos_mes, pedidos_mes = _rango(db, inicio_mes)
    ingresos_mes_anterior, _ = _rango(db, mes_anterior_inicio, mes_anterior_fin)

    ticket_promedio = ingresos_totales / pedidos_totales if pedidos_totales else 0

    # --- Catálogo e inventario ---
    total_productos = db.query(func.count(Producto.id_producto)).scalar() or 0
    productos_activos = (
        db.query(func.count(Producto.id_producto))
        .filter(Producto.estado == "activo")
        .scalar()
        or 0
    )
    agotados = (
        db.query(func.count(Producto.id_producto))
        .filter(Producto.estado == "activo", Producto.stock <= 0)
        .scalar()
        or 0
    )
    stock_bajo = (
        db.query(func.count(Producto.id_producto))
        .filter(
            Producto.estado == "activo",
            Producto.stock > 0,
            Producto.stock <= Producto.stock_minimo,
        )
        .scalar()
        or 0
    )
    valor_inventario = (
        db.query(func.coalesce(func.sum(Producto.precio * Producto.stock), 0))
        .filter(Producto.estado == "activo")
        .scalar()
        or 0
    )

    # --- Usuarios ---
    usuarios_totales = db.query(func.count(Usuario.id_usuario)).scalar() or 0
    usuarios_activos = (
        db.query(func.count(Usuario.id_usuario)).filter(Usuario.estado == "activo").scalar() or 0
    )
    clientes = db.query(func.count(Usuario.id_usuario)).filter(Usuario.id_rol == 3).scalar() or 0
    nuevos_mes = (
        db.query(func.count(Usuario.id_usuario))
        .filter(Usuario.creado_en >= inicio_mes)
        .scalar()
        or 0
    )

    # --- Pendientes de atención ---
    pedidos_pendientes = (
        db.query(func.count(Venta.id_venta)).filter(Venta.estado == "pendiente").scalar() or 0
    )
    solicitudes_pendientes = (
        db.query(func.count(SolicitudServicio.id_solicitud))
        .filter(SolicitudServicio.estado == "pendiente")
        .scalar()
        or 0
    )
    mensajes_nuevos = (
        db.query(func.count(MensajeContacto.id_mensaje))
        .filter(MensajeContacto.estado == "nuevo")
        .scalar()
        or 0
    )

    # --- Pedidos por estado (para la gráfica de dona) ---
    por_estado = dict(
        db.query(Venta.estado, func.count(Venta.id_venta)).group_by(Venta.estado).all()
    )

    # --- Ventas de los últimos 14 días (gráfica de líneas) ---
    inicio_serie = hoy - timedelta(days=13)
    filas_dia = (
        db.query(
            func.date(Venta.creado_en).label("dia"),
            func.coalesce(func.sum(Venta.total), 0),
            func.count(Venta.id_venta),
        )
        .filter(NO_CANCELADAS, Venta.creado_en >= inicio_serie)
        .group_by(func.date(Venta.creado_en))
        .all()
    )
    mapa_dia = {str(f[0]): (float(f[1] or 0), int(f[2] or 0)) for f in filas_dia}
    serie_dias = []
    for i in range(14):
        dia = (inicio_serie + timedelta(days=i)).date()
        total, cantidad = mapa_dia.get(str(dia), (0.0, 0))
        serie_dias.append(
            {
                "fecha": str(dia),
                "etiqueta": f"{dia.day:02d}/{dia.month:02d}",
                "total": total,
                "pedidos": cantidad,
            }
        )

    # --- Ventas de los últimos 6 meses (gráfica de barras) ---
    inicio_meses = (inicio_mes - timedelta(days=1)).replace(day=1)
    for _ in range(4):
        inicio_meses = (inicio_meses - timedelta(days=1)).replace(day=1)
    filas_mes = (
        db.query(
            func.year(Venta.creado_en),
            func.month(Venta.creado_en),
            func.coalesce(func.sum(Venta.total), 0),
            func.count(Venta.id_venta),
        )
        .filter(NO_CANCELADAS, Venta.creado_en >= inicio_meses)
        .group_by(func.year(Venta.creado_en), func.month(Venta.creado_en))
        .all()
    )
    mapa_mes = {(int(f[0]), int(f[1])): (float(f[2] or 0), int(f[3] or 0)) for f in filas_mes}
    serie_meses = []
    cursor = inicio_meses
    for _ in range(6):
        total, cantidad = mapa_mes.get((cursor.year, cursor.month), (0.0, 0))
        serie_meses.append(
            {
                "etiqueta": f"{MESES_ES[cursor.month - 1]} {cursor.year}",
                "total": total,
                "pedidos": cantidad,
            }
        )
        cursor = (cursor + timedelta(days=32)).replace(day=1)

    # --- Productos más vendidos ---
    mas_vendidos = (
        db.query(
            VentaDetalle.nombre_producto,
            VentaDetalle.marca_producto,
            func.sum(VentaDetalle.cantidad).label("unidades"),
            func.sum(VentaDetalle.subtotal).label("ingresos"),
        )
        .join(Venta, Venta.id_venta == VentaDetalle.id_venta)
        .filter(NO_CANCELADAS)
        .group_by(VentaDetalle.nombre_producto, VentaDetalle.marca_producto)
        .order_by(func.sum(VentaDetalle.cantidad).desc())
        .limit(5)
        .all()
    )

    # --- Últimas ventas y alertas de stock ---
    ultimas = db.query(Venta).order_by(Venta.id_venta.desc()).limit(5).all()
    alertas_stock = (
        db.query(Producto)
        .filter(Producto.estado == "activo", Producto.stock <= Producto.stock_minimo)
        .order_by(Producto.stock.asc())
        .limit(5)
        .all()
    )

    def variacion(actual, anterior):
        if anterior <= 0:
            return 100.0 if actual > 0 else 0.0
        return round(((actual - anterior) / anterior) * 100, 1)

    # --- Facturación y PQR (quinto avance) ---
    facturas_emitidas = db.query(func.count(Factura.id_factura)).scalar() or 0
    facturado = (
        db.query(func.coalesce(func.sum(Factura.total), 0))
        .filter(Factura.estado != "anulada")
        .scalar()
        or 0
    )
    facturas_pendientes = (
        db.query(func.count(Factura.id_factura))
        .filter(Factura.estado == "emitida")
        .scalar()
        or 0
    )
    # Ventas sin factura: es la cola de trabajo del area comercial
    ventas_sin_factura = (
        db.query(func.count(Venta.id_venta))
        .outerjoin(Factura, Factura.id_venta == Venta.id_venta)
        .filter(Factura.id_factura.is_(None), Venta.estado != "cancelada")
        .scalar()
        or 0
    )

    pqr_por_estado = dict(
        db.query(PQR.estado, func.count(PQR.id_pqr)).group_by(PQR.estado).all()
    )
    pqr_por_tipo = dict(
        db.query(PQR.tipo, func.count(PQR.id_pqr)).group_by(PQR.tipo).all()
    )
    pqr_total = sum(pqr_por_estado.values())
    pqr_abiertas = int(pqr_por_estado.get("pendiente", 0)) + int(
        pqr_por_estado.get("en_proceso", 0)
    )

    return {
        "ok": True,
        "ventas": {
            "ingresos_totales": ingresos_totales,
            "pedidos_totales": pedidos_totales,
            "ingresos_hoy": ingresos_hoy,
            "pedidos_hoy": pedidos_hoy,
            "ingresos_mes": ingresos_mes,
            "pedidos_mes": pedidos_mes,
            "ticket_promedio": round(ticket_promedio, 2),
            "variacion_dia": variacion(ingresos_hoy, ingresos_ayer),
            "variacion_mes": variacion(ingresos_mes, ingresos_mes_anterior),
            "pendientes": pedidos_pendientes,
            "por_estado": {
                estado: por_estado.get(estado, 0)
                for estado in ["pendiente", "pagada", "enviada", "entregada", "cancelada"]
            },
        },
        "inventario": {
            "total_productos": total_productos,
            "productos_activos": productos_activos,
            "agotados": agotados,
            "stock_bajo": stock_bajo,
            "valor_inventario": float(valor_inventario),
        },
        "usuarios": {
            "total": usuarios_totales,
            "activos": usuarios_activos,
            "clientes": clientes,
            "nuevos_mes": nuevos_mes,
        },
        "atencion": {
            "solicitudes_pendientes": solicitudes_pendientes,
            "mensajes_nuevos": mensajes_nuevos,
        },
        "facturacion": {
            "emitidas": int(facturas_emitidas),
            "facturado": float(facturado),
            "pendientes_de_pago": int(facturas_pendientes),
            "ventas_sin_factura": int(ventas_sin_factura),
        },
        "pqr": {
            "total": int(pqr_total),
            "abiertas": int(pqr_abiertas),
            "por_estado": {
                estado: int(pqr_por_estado.get(estado, 0))
                for estado in ("pendiente", "en_proceso", "respondida", "cerrada")
            },
            "por_tipo": {
                tipo: int(pqr_por_tipo.get(tipo, 0))
                for tipo in ("peticion", "queja", "reclamo", "sugerencia")
            },
        },
        "series": {"dias": serie_dias, "meses": serie_meses},
        "mas_vendidos": [
            {
                "nombre": nombre,
                "marca": marca,
                "unidades": int(unidades or 0),
                "ingresos": float(ingresos or 0),
            }
            for nombre, marca, unidades, ingresos in mas_vendidos
        ],
        "ultimas_ventas": [venta_dict(v, incluir_detalles=False) for v in ultimas],
        "alertas_stock": [producto_dict(p) for p in alertas_stock],
    }


@router.get("/reporte")
def reporte(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    desde: Optional[str] = Query(default=None, max_length=10),
    hasta: Optional[str] = Query(default=None, max_length=10),
):
    """Reporte de ventas por rango de fechas, listo para exportar."""
    try:
        fecha_desde = (
            datetime.fromisoformat(desde)
            if desde
            else datetime.combine(date.today().replace(day=1), datetime.min.time())
        )
        fecha_hasta = (
            datetime.fromisoformat(hasta) + timedelta(days=1)
            if hasta
            else datetime.now() + timedelta(days=1)
        )
    except ValueError:
        raise AppError(400, "Las fechas deben tener el formato AAAA-MM-DD.")

    if fecha_desde >= fecha_hasta:
        raise AppError(400, "La fecha inicial debe ser anterior a la fecha final.")

    base = db.query(Venta).filter(
        Venta.creado_en >= fecha_desde, Venta.creado_en < fecha_hasta
    )

    totales = (
        base.with_entities(
            func.count(Venta.id_venta),
            func.coalesce(func.sum(case((NO_CANCELADAS, Venta.total), else_=0)), 0),
            func.coalesce(func.sum(case((NO_CANCELADAS, Venta.total_articulos), else_=0)), 0),
        ).first()
    )

    por_metodo = (
        base.with_entities(
            Venta.metodo_pago,
            func.count(Venta.id_venta),
            func.coalesce(func.sum(Venta.total), 0),
        )
        .filter(NO_CANCELADAS)
        .group_by(Venta.metodo_pago)
        .all()
    )

    productos = (
        db.query(
            VentaDetalle.nombre_producto,
            VentaDetalle.marca_producto,
            func.sum(VentaDetalle.cantidad),
            func.sum(VentaDetalle.subtotal),
        )
        .join(Venta, Venta.id_venta == VentaDetalle.id_venta)
        .filter(
            NO_CANCELADAS,
            Venta.creado_en >= fecha_desde,
            Venta.creado_en < fecha_hasta,
        )
        .group_by(VentaDetalle.nombre_producto, VentaDetalle.marca_producto)
        .order_by(func.sum(VentaDetalle.subtotal).desc())
        .all()
    )

    ventas = base.order_by(Venta.id_venta.desc()).limit(200).all()

    return {
        "ok": True,
        "rango": {
            "desde": fecha_desde.date().isoformat(),
            "hasta": (fecha_hasta - timedelta(days=1)).date().isoformat(),
        },
        "totales": {
            "pedidos": int(totales[0] or 0),
            "ingresos": float(totales[1] or 0),
            "articulos": int(totales[2] or 0),
        },
        "por_metodo_pago": [
            {"metodo": metodo, "pedidos": int(cantidad or 0), "total": float(total or 0)}
            for metodo, cantidad, total in por_metodo
        ],
        "productos": [
            {
                "nombre": nombre,
                "marca": marca,
                "unidades": int(unidades or 0),
                "ingresos": float(ingresos or 0),
            }
            for nombre, marca, unidades, ingresos in productos
        ],
        "ventas": [venta_dict(v, incluir_detalles=False) for v in ventas],
    }
