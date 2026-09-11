# Convierte instancias de SQLAlchemy a dicts JSON-serializables.
#
# Regla importante: nunca se expone `password_hash` ni ningún dato
# sensible; cada serializador decide explícitamente qué campos salen.

from decimal import Decimal

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


def _fecha(dt):
    return dt.isoformat(sep=" ") if dt else None


def _num(valor):
    if valor is None:
        return None
    if isinstance(valor, Decimal):
        return float(valor)
    return float(valor)


# ---------------------------------------------------------------
# Seguridad y acceso
# ---------------------------------------------------------------
def usuario_safe(usuario: Usuario) -> dict:
    """Nunca incluye password_hash. Incluye 'rol' (nombre) para el Frontend."""
    return {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "tipo_documento": usuario.tipo_documento,
        "numero_documento": usuario.numero_documento,
        "direccion": usuario.direccion,
        "telefono": usuario.telefono,
        "email": usuario.email,
        "email_verificado": bool(usuario.email_verificado),
        "doble_factor": bool(usuario.doble_factor),
        "estado": usuario.estado,
        "id_rol": usuario.id_rol,
        "rol": usuario.rol.nombre if usuario.rol else None,
        "creado_en": _fecha(usuario.creado_en),
        "actualizado_en": _fecha(usuario.actualizado_en),
    }


# ---------------------------------------------------------------
# Catálogo
# ---------------------------------------------------------------
def categoria_dict(categoria: Categoria, total_productos: int | None = None) -> dict:
    data = {
        "id_categoria": categoria.id_categoria,
        "nombre": categoria.nombre,
        "slug": categoria.slug,
        "descripcion": categoria.descripcion,
        "icono": categoria.icono,
        "estado": categoria.estado,
        "creado_en": _fecha(categoria.creado_en),
    }
    if total_productos is not None:
        data["total_productos"] = total_productos
    return data


def producto_dict(producto: Producto) -> dict:
    stock = producto.stock or 0
    stock_minimo = producto.stock_minimo if producto.stock_minimo is not None else 0

    if stock <= 0:
        estado_stock = "agotado"
    elif stock <= stock_minimo:
        estado_stock = "bajo"
    else:
        estado_stock = "disponible"

    return {
        "id_producto": producto.id_producto,
        "nombre": producto.nombre,
        "marca": producto.marca,
        "id_categoria": producto.id_categoria,
        "categoria": producto.categoria.nombre if producto.categoria else None,
        "descripcion": producto.descripcion,
        "precio": _num(producto.precio),
        "precio_anterior": _num(producto.precio_anterior),
        "stock": stock,
        "stock_minimo": stock_minimo,
        "estado_stock": estado_stock,
        "destacado": bool(producto.destacado),
        "imagen_url": producto.imagen_url,
        "estado": producto.estado,
        "creado_en": _fecha(producto.creado_en),
        "actualizado_en": _fecha(producto.actualizado_en),
    }


def servicio_dict(servicio: Servicio) -> dict:
    return {
        "id_servicio": servicio.id_servicio,
        "nombre": servicio.nombre,
        "descripcion": servicio.descripcion,
        "precio": _num(servicio.precio),
        "duracion": servicio.duracion,
        "icono": servicio.icono,
        "imagen_url": servicio.imagen_url,
        "estado": servicio.estado,
        "creado_en": _fecha(servicio.creado_en),
        "actualizado_en": _fecha(servicio.actualizado_en),
    }


# ---------------------------------------------------------------
# Ventas e inventario
# ---------------------------------------------------------------
def venta_detalle_dict(detalle: VentaDetalle) -> dict:
    return {
        "id_detalle": detalle.id_detalle,
        "id_producto": detalle.id_producto,
        "nombre_producto": detalle.nombre_producto,
        "marca_producto": detalle.marca_producto,
        "precio_unitario": _num(detalle.precio_unitario),
        "cantidad": detalle.cantidad,
        "subtotal": _num(detalle.subtotal),
    }


def venta_dict(venta: Venta, incluir_detalles: bool = True) -> dict:
    data = {
        "id_venta": venta.id_venta,
        "codigo": venta.codigo,
        "id_usuario": venta.id_usuario,
        "cliente_nombre": venta.cliente_nombre,
        "cliente_email": venta.cliente_email,
        "cliente_telefono": venta.cliente_telefono,
        "cliente_documento": venta.cliente_documento,
        "direccion_envio": venta.direccion_envio,
        "ciudad": venta.ciudad,
        "notas": venta.notas,
        "metodo_pago": venta.metodo_pago,
        "subtotal": _num(venta.subtotal),
        "costo_envio": _num(venta.costo_envio),
        "total": _num(venta.total),
        "total_articulos": venta.total_articulos,
        "estado": venta.estado,
        "creado_en": _fecha(venta.creado_en),
        "actualizado_en": _fecha(venta.actualizado_en),
    }
    if incluir_detalles:
        data["detalles"] = [venta_detalle_dict(d) for d in venta.detalles]
    return data


def movimiento_dict(movimiento: MovimientoInventario) -> dict:
    return {
        "id_movimiento": movimiento.id_movimiento,
        "id_producto": movimiento.id_producto,
        "producto": movimiento.producto.nombre if movimiento.producto else None,
        "tipo": movimiento.tipo,
        "cantidad": movimiento.cantidad,
        "stock_anterior": movimiento.stock_anterior,
        "stock_nuevo": movimiento.stock_nuevo,
        "motivo": movimiento.motivo,
        "id_venta": movimiento.id_venta,
        "id_usuario": movimiento.id_usuario,
        "usuario": (
            f"{movimiento.usuario.nombre} {movimiento.usuario.apellido}"
            if movimiento.usuario
            else None
        ),
        "creado_en": _fecha(movimiento.creado_en),
    }


# ---------------------------------------------------------------
# Atención al cliente
# ---------------------------------------------------------------
def solicitud_dict(solicitud: SolicitudServicio) -> dict:
    return {
        "id_solicitud": solicitud.id_solicitud,
        "codigo": solicitud.codigo,
        "id_servicio": solicitud.id_servicio,
        "nombre_servicio": solicitud.nombre_servicio,
        "precio_servicio": _num(solicitud.precio_servicio),
        "id_usuario": solicitud.id_usuario,
        "cliente_nombre": solicitud.cliente_nombre,
        "cliente_email": solicitud.cliente_email,
        "cliente_telefono": solicitud.cliente_telefono,
        "equipo": solicitud.equipo,
        "descripcion": solicitud.descripcion,
        "respuesta": solicitud.respuesta,
        "estado": solicitud.estado,
        "creado_en": _fecha(solicitud.creado_en),
        "actualizado_en": _fecha(solicitud.actualizado_en),
    }


def mensaje_dict(mensaje: MensajeContacto) -> dict:
    return {
        "id_mensaje": mensaje.id_mensaje,
        "nombre": mensaje.nombre,
        "email": mensaje.email,
        "telefono": mensaje.telefono,
        "asunto": mensaje.asunto,
        "mensaje": mensaje.mensaje,
        "estado": mensaje.estado,
        "creado_en": _fecha(mensaje.creado_en),
    }
