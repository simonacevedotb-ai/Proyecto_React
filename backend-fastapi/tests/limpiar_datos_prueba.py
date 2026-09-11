"""Borra los datos que dejan las pruebas automatizadas.

`tests/pruebas_api.py` crea usuarios, productos, categorías, servicios,
pedidos, solicitudes y mensajes de prueba. Todos quedan identificados con
un patrón reconocible, así que este script los elimina sin tocar nada de
la tienda real.

Qué borra (y solo eso):
  - Usuarios con correo `cliente.test*@phonestore.com`, y sus pedidos.
  - Productos, categorías y servicios cuyo nombre empieza por "* Test ".
  - Mensajes de contacto de "Visitante de prueba" y los del intento de XSS.
  - Solicitudes de servicio creadas por esos usuarios de prueba.

Ejecutar desde backend-fastapi/ con el entorno virtual activado:

    python -m tests.limpiar_datos_prueba
"""

from sqlalchemy import or_

from app.database import SessionLocal
from app.models import (
    Categoria,
    MensajeContacto,
    MovimientoInventario,
    Producto,
    Servicio,
    SolicitudServicio,
    Usuario,
    Venta,
    VentaDetalle,
)

# Las dos suites crean cuentas con prefijos distintos: pruebas_api.py usa
# "cliente.test…" y prueba_correos.py usa "cliente.correo…".
CORREOS_PRUEBA = [
    "cliente.test%@phonestore.com",
    "cliente.correo%@phonestore.com",
]
NOMBRES_PRUEBA = ["Producto Test %", "Categoria Test %", "Servicio Test %"]
REMITENTES_PRUEBA = ["Visitante de prueba", "alert(1)"]
CORREOS_MENSAJE_PRUEBA = ["visitante@example.com", "xss@example.com"]


def limpiar():
    db = SessionLocal()
    borrados = {
        "usuarios": 0,
        "ventas": 0,
        "solicitudes": 0,
        "productos": 0,
        "categorias": 0,
        "servicios": 0,
        "mensajes": 0,
    }

    try:
        usuarios = (
            db.query(Usuario)
            .filter(or_(*[Usuario.email.like(p) for p in CORREOS_PRUEBA]))
            .all()
        )
        ids_usuarios = [u.id_usuario for u in usuarios]

        if ids_usuarios:
            solicitudes = (
                db.query(SolicitudServicio)
                .filter(SolicitudServicio.id_usuario.in_(ids_usuarios))
                .all()
            )
            for s in solicitudes:
                db.delete(s)
            borrados["solicitudes"] = len(solicitudes)

            ventas = db.query(Venta).filter(Venta.id_usuario.in_(ids_usuarios)).all()
            for v in ventas:
                db.query(MovimientoInventario).filter(
                    MovimientoInventario.id_venta == v.id_venta
                ).delete()
                # Las líneas del pedido se borran solas: la relación
                # Venta.detalles está declarada con cascade delete-orphan.
                db.delete(v)
            borrados["ventas"] = len(ventas)

            db.flush()
            for u in usuarios:
                db.delete(u)
            borrados["usuarios"] = len(usuarios)

        for patron in NOMBRES_PRUEBA:
            if patron.startswith("Producto"):
                filas = db.query(Producto).filter(Producto.nombre.like(patron)).all()
                for p in filas:
                    db.query(MovimientoInventario).filter(
                        MovimientoInventario.id_producto == p.id_producto
                    ).delete()
                    db.query(VentaDetalle).filter(
                        VentaDetalle.id_producto == p.id_producto
                    ).update({"id_producto": None})
                    db.delete(p)
                borrados["productos"] += len(filas)
            elif patron.startswith("Categoria"):
                filas = db.query(Categoria).filter(Categoria.nombre.like(patron)).all()
                for c in filas:
                    db.query(Producto).filter(Producto.id_categoria == c.id_categoria).update(
                        {"id_categoria": None}
                    )
                    db.delete(c)
                borrados["categorias"] += len(filas)
            else:
                filas = db.query(Servicio).filter(Servicio.nombre.like(patron)).all()
                for s in filas:
                    db.query(SolicitudServicio).filter(
                        SolicitudServicio.id_servicio == s.id_servicio
                    ).update({"id_servicio": None})
                    db.delete(s)
                borrados["servicios"] += len(filas)

        mensajes = (
            db.query(MensajeContacto)
            .filter(
                MensajeContacto.email.in_(CORREOS_MENSAJE_PRUEBA)
                | MensajeContacto.nombre.in_(REMITENTES_PRUEBA)
            )
            .all()
        )
        for m in mensajes:
            db.delete(m)
        borrados["mensajes"] = len(mensajes)

        db.commit()

        print("🧹 Datos de prueba eliminados:")
        for clave, valor in borrados.items():
            print(f"   {clave:12} {valor}")
        print("\nLos datos reales de la tienda no se tocaron.")
    except Exception as error:  # noqa: BLE001
        db.rollback()
        print(f"❌ Error limpiando los datos de prueba: {error}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    limpiar()
