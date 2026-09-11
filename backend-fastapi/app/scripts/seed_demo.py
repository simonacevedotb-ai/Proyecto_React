# Deja el catálogo listo para usar la tienda:
#
#   1. Elimina productos y servicios duplicados creados por el seed
#      antiguo (solo los que NUNCA se han vendido ni solicitado).
#   2. Asigna categoría, imagen y stock mínimo a los productos que
#      quedaron sin esos datos tras la migración.
#   3. Completa el catálogo con productos y servicios de ejemplo si
#      faltan, para que la tienda no se vea vacía.
#
# Es idempotente: se puede ejecutar las veces que haga falta.
#
# Ejecutar desde backend-fastapi/ con el entorno virtual activado:
#   python -m app.scripts.seed_demo

from app.database import SessionLocal
from app.models import (
    Categoria,
    MovimientoInventario,
    Producto,
    Servicio,
    SolicitudServicio,
    VentaDetalle,
)

# nombre del producto -> (slug de categoría, ruta de imagen, destacado)
CATALOGO = {
    "iphone 17": ("smartphones", "/img/iphone-17.webp", True),
    "iphone 15 pro": ("smartphones", "/img/iphone-15-pro.jpg", True),
    "galaxy s24": ("smartphones", "/img/galaxy-s24.jpg", True),
    "galaxy s24 ultra": ("smartphones", "/img/galaxy-s24.jpg", True),
    "iphone 12 pro": ("smartphones", "/img/iphone-clasico.png", False),
    "xiaomi redmi note 13": ("smartphones", "/img/redmi-note.svg", False),
    "airpods pro 2": ("audio", "/img/airpods-pro.jpg", True),
    "galaxy watch 6": ("smartwatch", "/img/galaxy-watch.jpg", False),
    "cargador rápido 65w gan": ("accesorios", "/img/cargador-gan.jpg", False),
    "ipad 10ma generación": ("tablets", "/img/ipad-10.jpg", False),
}

PRODUCTOS_EXTRA = [
    {
        "nombre": "Xiaomi Redmi Note 13",
        "marca": "Xiaomi",
        "slug": "smartphones",
        "descripcion": "Batería de 5000 mAh, cámara de 108 MP y carga rápida de 67 W.",
        "precio": 950000,
        "precio_anterior": None,
        "stock": 25,
        "imagen": "/img/redmi-note.svg",
        "destacado": False,
    },
    {
        "nombre": "AirPods Pro 2",
        "marca": "Apple",
        "slug": "audio",
        "descripcion": "Cancelación activa de ruido, audio espacial y estuche con USB-C.",
        "precio": 890000,
        "precio_anterior": 990000,
        "stock": 30,
        "imagen": "/img/airpods-pro.jpg",
        "destacado": True,
    },
    {
        "nombre": "Galaxy Watch 6",
        "marca": "Samsung",
        "slug": "smartwatch",
        "descripcion": "Monitoreo de sueño, ritmo cardiaco y GPS integrado.",
        "precio": 1100000,
        "precio_anterior": None,
        "stock": 12,
        "imagen": "/img/galaxy-watch.jpg",
        "destacado": False,
    },
    {
        "nombre": "Cargador rápido 65W GaN",
        "marca": "Ugreen",
        "slug": "accesorios",
        "descripcion": "Tres puertos, tecnología GaN y protección contra sobrecarga.",
        "precio": 180000,
        "precio_anterior": 220000,
        "stock": 40,
        "imagen": "/img/cargador-gan.jpg",
        "destacado": False,
    },
    {
        "nombre": "iPad 10ma generación",
        "marca": "Apple",
        "slug": "tablets",
        "descripcion": 'Pantalla Liquid Retina de 10.9", chip A14 Bionic y 64 GB.',
        "precio": 2100000,
        "precio_anterior": None,
        "stock": 8,
        "imagen": "/img/ipad-10.jpg",
        "destacado": False,
    },
]

SERVICIOS_EXTRA = [
    ("Cambio de batería", "Reemplazo de batería certificada y calibración del sistema de carga.", 180000, "1 a 2 horas", "battery"),
    ("Diagnóstico técnico", "Revisión completa del equipo con informe escrito del estado de cada módulo.", 50000, "45 minutos", "search"),
    ("Liberación de equipo", "Desbloqueo de operador para usar cualquier SIM, con soporte posterior.", 120000, "24 horas", "unlock"),
    ("Respaldo y migración de datos", "Copia de seguridad y traslado de tu información al equipo nuevo.", 80000, "1 hora", "cloud"),
]

SERVICIOS_META = {
    "cambio de pantalla": ("2 a 4 horas", "screen"),
    "garantía extendida": ("Inmediato", "shield"),
}


def _corrupto(nombre: str) -> bool:
    """Detecta nombres con acentos rotos ("Garant??a extendida").

    Vienen de haber cargado el SQL con una codificación distinta a UTF-8
    en avances anteriores. Ningún nombre real del catálogo lleva "?".
    """
    return "?" in (nombre or "") or "�" in (nombre or "")


def limpiar_duplicados(db):
    """Borra duplicados exactos y registros con texto corrupto.

    Solo se eliminan si nunca se vendieron ni se solicitaron: si un
    registro ya tiene historial, se conserva intacto.
    """
    eliminados = 0

    for producto in db.query(Producto).all():
        if not _corrupto(producto.nombre):
            continue
        if db.query(VentaDetalle).filter(VentaDetalle.id_producto == producto.id_producto).first():
            continue
        db.query(MovimientoInventario).filter(
            MovimientoInventario.id_producto == producto.id_producto
        ).delete()
        db.delete(producto)
        eliminados += 1

    for servicio in db.query(Servicio).all():
        if not _corrupto(servicio.nombre):
            continue
        if db.query(SolicitudServicio).filter(
            SolicitudServicio.id_servicio == servicio.id_servicio
        ).first():
            continue
        db.delete(servicio)
        eliminados += 1

    db.commit()

    vistos = {}
    for producto in db.query(Producto).order_by(Producto.id_producto.asc()).all():
        clave = (producto.nombre.strip().lower(), producto.marca.strip().lower())
        if clave not in vistos:
            vistos[clave] = producto
            continue

        vendido = (
            db.query(VentaDetalle)
            .filter(VentaDetalle.id_producto == producto.id_producto)
            .first()
        )
        if vendido:
            continue

        db.query(MovimientoInventario).filter(
            MovimientoInventario.id_producto == producto.id_producto
        ).delete()
        db.delete(producto)
        eliminados += 1

    vistos_serv = set()
    for servicio in db.query(Servicio).order_by(Servicio.id_servicio.asc()).all():
        clave = servicio.nombre.strip().lower()
        if clave not in vistos_serv:
            vistos_serv.add(clave)
            continue

        usado = (
            db.query(SolicitudServicio)
            .filter(SolicitudServicio.id_servicio == servicio.id_servicio)
            .first()
        )
        if usado:
            continue

        db.delete(servicio)
        eliminados += 1

    db.commit()
    return eliminados


def completar_productos(db, categorias):
    """Asigna categoría, imagen y destacado a los productos existentes."""
    actualizados = 0
    for producto in db.query(Producto).all():
        clave = producto.nombre.strip().lower()
        meta = CATALOGO.get(clave)
        cambio = False

        if meta:
            slug, imagen, destacado = meta
            if not producto.id_categoria and slug in categorias:
                producto.id_categoria = categorias[slug]
                cambio = True
            if not producto.imagen_url:
                producto.imagen_url = imagen
                cambio = True
            if destacado and not producto.destacado:
                producto.destacado = True
                cambio = True
        else:
            if not producto.id_categoria and "smartphones" in categorias:
                producto.id_categoria = categorias["smartphones"]
                cambio = True
            if not producto.imagen_url:
                producto.imagen_url = "/img/iphone-clasico.png"
                cambio = True

        if not producto.stock_minimo:
            producto.stock_minimo = 5
            cambio = True

        if cambio:
            actualizados += 1

    db.commit()
    return actualizados


def agregar_faltantes(db, categorias):
    """Agrega productos y servicios de ejemplo que no existan todavía."""
    creados = 0

    existentes = {p.nombre.strip().lower() for p in db.query(Producto).all()}
    for datos in PRODUCTOS_EXTRA:
        if datos["nombre"].strip().lower() in existentes:
            continue
        producto = Producto(
            nombre=datos["nombre"],
            marca=datos["marca"],
            id_categoria=categorias.get(datos["slug"]),
            descripcion=datos["descripcion"],
            precio=datos["precio"],
            precio_anterior=datos["precio_anterior"],
            stock=datos["stock"],
            stock_minimo=5,
            destacado=datos["destacado"],
            imagen_url=datos["imagen"],
            estado="activo",
        )
        db.add(producto)
        db.flush()
        db.add(
            MovimientoInventario(
                id_producto=producto.id_producto,
                tipo="entrada",
                cantidad=datos["stock"],
                stock_anterior=0,
                stock_nuevo=datos["stock"],
                motivo="Stock inicial (carga de catálogo)",
            )
        )
        creados += 1

    servicios_existentes = {s.nombre.strip().lower() for s in db.query(Servicio).all()}
    for nombre, descripcion, precio, duracion, icono in SERVICIOS_EXTRA:
        if nombre.strip().lower() in servicios_existentes:
            continue
        db.add(
            Servicio(
                nombre=nombre,
                descripcion=descripcion,
                precio=precio,
                duracion=duracion,
                icono=icono,
                estado="activo",
            )
        )
        creados += 1

    for servicio in db.query(Servicio).all():
        meta = SERVICIOS_META.get(servicio.nombre.strip().lower())
        if meta and not servicio.duracion:
            servicio.duracion, servicio.icono = meta

    db.commit()
    return creados


def seed_demo():
    db = SessionLocal()
    try:
        categorias = {c.slug: c.id_categoria for c in db.query(Categoria).all()}
        if not categorias:
            print("⚠️  No hay categorías. Ejecuta primero database/phonestore.sql")
            return

        eliminados = limpiar_duplicados(db)
        creados = agregar_faltantes(db, categorias)
        actualizados = completar_productos(db, categorias)

        total_productos = db.query(Producto).count()
        total_servicios = db.query(Servicio).count()

        print("✅ Catálogo listo.")
        print(f"   Duplicados eliminados : {eliminados}")
        print(f"   Registros creados     : {creados}")
        print(f"   Productos completados : {actualizados}")
        print(f"   Total productos       : {total_productos}")
        print(f"   Total servicios       : {total_servicios}")
    except Exception as error:  # noqa: BLE001
        db.rollback()
        print(f"❌ Error preparando el catálogo: {error}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
