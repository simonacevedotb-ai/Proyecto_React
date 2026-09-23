"""Borra los datos que dejan las pruebas automatizadas.

`tests/pruebas_api.py` crea usuarios, productos, categorías, servicios,
pedidos, solicitudes y mensajes de prueba. Todos quedan identificados con
un patrón reconocible, así que este script los elimina sin tocar nada de
la tienda real.

Qué borra (y solo eso):
  - Usuarios con correo `cliente.test*@phonestore.com`, y sus pedidos.
  - Las facturas, PQR y conversaciones del asistente de esos usuarios.
  - Productos, categorías y servicios cuyo nombre empieza por "* Test ".
  - Mensajes de contacto de "Visitante de prueba" y los del intento de XSS.
  - Solicitudes de servicio creadas por esos usuarios de prueba.
  - Las charlas anónimas de la prueba del asistente, que empiezan con la
    marca "(prueba automatizada)".

Ejecutar desde backend-fastapi/ con el entorno virtual activado:

    python -m tests.limpiar_datos_prueba
"""

from sqlalchemy import or_

from app.database import SessionLocal
from app.models import (
    PQR,
    Categoria,
    Conversacion,
    Factura,
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
# prueba_quinto_avance.py abre la charla anónima con este texto; como la
# conversación toma su título del primer mensaje, así se reconoce.
MARCA_CHAT = "%(prueba automatizada)%"


def limpiar():
    db = SessionLocal()
    borrados = {
        "usuarios": 0,
        "ventas": 0,
        "facturas": 0,
        "pqr": 0,
        "charlas": 0,
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

        # Las charlas se buscan antes de borrar a sus dueños: al irse el
        # usuario, la base pone id_usuario en NULL y ya no se reconocerían.
        # Sus mensajes se van con ellas (cascade delete-orphan).
        filtro_charlas = [Conversacion.titulo.like(MARCA_CHAT)]
        if ids_usuarios:
            filtro_charlas.append(Conversacion.id_usuario.in_(ids_usuarios))
        charlas = db.query(Conversacion).filter(or_(*filtro_charlas)).all()
        for c in charlas:
            db.delete(c)
        borrados["charlas"] = len(charlas)

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
            ids_ventas = [v.id_venta for v in ventas]

            # La factura va primero: la base no deja borrar una venta que ya
            # se facturó (fk_factura_venta es RESTRICT, a propósito).
            facturas = (
                db.query(Factura)
                .filter(
                    or_(
                        Factura.id_venta.in_(ids_ventas),
                        Factura.id_usuario.in_(ids_usuarios),
                    )
                )
                .all()
            )
            for f in facturas:
                db.delete(f)
            borrados["facturas"] = len(facturas)

            casos = (
                db.query(PQR)
                .filter(
                    or_(
                        PQR.id_usuario.in_(ids_usuarios),
                        *[PQR.cliente_email.like(p) for p in CORREOS_PRUEBA],
                    )
                )
                .all()
            )
            for c in casos:
                db.delete(c)
            borrados["pqr"] = len(casos)
            db.flush()

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
