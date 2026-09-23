# Reportes de ventas descargables.
#
#   GET /api/reportes/ventas       datos del reporte en JSON (para la pantalla)
#   GET /api/reportes/ventas/pdf   el mismo reporte como documento PDF
#   GET /api/reportes/ventas/excel el mismo reporte como hoja de calculo
#
# Los tres comparten exactamente la misma consulta: lo que se ve en
# pantalla es lo que se descarga. Si se separaran, el PDF y la pantalla
# podrian terminar diciendo cosas distintas.
#
# Sin fechas, el reporte cubre el dia de hoy, que es el "reporte diario"
# que pide el enunciado.

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.documentos import reporte_ventas_excel, reporte_ventas_pdf
from app.errors import AppError
from app.models import Venta
from app.serializers import venta_dict

router = APIRouter()

ROLES_GESTOR = ("administrador", "empleado")


def _rango(desde: Optional[str], hasta: Optional[str]):
    """Convierte las fechas del cliente en un rango [inicio, fin).

    Sin parámetros devuelve el día de hoy completo.
    """
    hoy = date.today()
    try:
        inicio = datetime.fromisoformat(desde) if desde else datetime.combine(
            hoy, datetime.min.time()
        )
        fin_dia = date.fromisoformat(hasta) if hasta else hoy
    except ValueError:
        raise AppError(400, "Las fechas deben tener el formato AAAA-MM-DD.")

    fin = datetime.combine(fin_dia, datetime.min.time()) + timedelta(days=1)
    if inicio >= fin:
        raise AppError(400, "La fecha inicial debe ser anterior a la fecha final.")

    return inicio, fin, inicio.date().isoformat(), fin_dia.isoformat()


def _consultar(db: Session, inicio: datetime, fin: datetime, estado: Optional[str]):
    """Ventas del rango con su detalle, más las cifras del periodo."""
    query = (
        db.query(Venta)
        .options(joinedload(Venta.detalles))
        .filter(Venta.creado_en >= inicio, Venta.creado_en < fin)
    )
    if estado:
        query = query.filter(Venta.estado == estado)

    ventas = query.order_by(Venta.creado_en.asc()).all()

    # Los pedidos cancelados se listan, pero no suman a los ingresos
    validas = [v for v in ventas if v.estado != "cancelada"]
    ingresos = sum(float(v.total or 0) for v in validas)
    articulos = sum(int(v.total_articulos or 0) for v in validas)

    resumen = {
        "total_ventas": len(ventas),
        "ventas_validas": len(validas),
        "total_articulos": articulos,
        "ingresos": ingresos,
        "ticket_promedio": (ingresos / len(validas)) if validas else 0,
    }
    return [venta_dict(v) for v in ventas], resumen


def _preparar(db, desde, hasta, estado):
    inicio, fin, etiqueta_desde, etiqueta_hasta = _rango(desde, hasta)
    ventas, resumen = _consultar(db, inicio, fin, estado)
    return ventas, resumen, etiqueta_desde, etiqueta_hasta


@router.get("/ventas")
def reporte_json(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    desde: Optional[str] = Query(default=None, max_length=10),
    hasta: Optional[str] = Query(default=None, max_length=10),
    estado: Optional[str] = Query(default=None, max_length=12),
):
    ventas, resumen, d, h = _preparar(db, desde, hasta, estado)

    # Ranking de lo más vendido dentro del mismo rango
    conteo = {}
    for v in ventas:
        if v["estado"] == "cancelada":
            continue
        for linea in v.get("detalles", []):
            clave = linea["nombre_producto"]
            acumulado = conteo.setdefault(
                clave, {"nombre": clave, "marca": linea.get("marca_producto"),
                        "unidades": 0, "ingresos": 0.0}
            )
            acumulado["unidades"] += int(linea["cantidad"] or 0)
            acumulado["ingresos"] += float(linea["subtotal"] or 0)

    mas_vendidos = sorted(conteo.values(), key=lambda x: x["ingresos"], reverse=True)[:10]

    return {
        "ok": True,
        "rango": {"desde": d, "hasta": h},
        "resumen": resumen,
        "ventas": ventas,
        "mas_vendidos": mas_vendidos,
    }


@router.get("/ventas/pdf")
def reporte_pdf(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    desde: Optional[str] = Query(default=None, max_length=10),
    hasta: Optional[str] = Query(default=None, max_length=10),
    estado: Optional[str] = Query(default=None, max_length=12),
):
    ventas, resumen, d, h = _preparar(db, desde, hasta, estado)
    contenido = reporte_ventas_pdf(ventas, d, h, resumen)
    nombre = f"reporte-ventas-{d}" + (f"-a-{h}" if d != h else "") + ".pdf"

    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{nombre}"',
            "Content-Length": str(len(contenido)),
        },
    )


@router.get("/ventas/excel")
def reporte_excel(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role(*ROLES_GESTOR)),
    desde: Optional[str] = Query(default=None, max_length=10),
    hasta: Optional[str] = Query(default=None, max_length=10),
    estado: Optional[str] = Query(default=None, max_length=12),
):
    ventas, resumen, d, h = _preparar(db, desde, hasta, estado)
    contenido = reporte_ventas_excel(ventas, d, h, resumen)
    nombre = f"reporte-ventas-{d}" + (f"-a-{h}" if d != h else "") + ".xlsx"

    return Response(
        content=contenido,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{nombre}"',
            "Content-Length": str(len(contenido)),
        },
    )
