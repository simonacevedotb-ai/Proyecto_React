# Modelos SQLAlchemy. Mapean exactamente las tablas creadas por
# database/phonestore.sql.
#
# Bloques:
#   1. Seguridad y acceso  -> Rol, Permiso, Usuario, PasswordReset
#   2. Catálogo            -> Categoria, Producto, Servicio
#   3. Ventas e inventario -> Venta, VentaDetalle, MovimientoInventario
#   4. Atención al cliente -> SolicitudServicio, MensajeContacto
#   5. Quinto avance       -> Factura, PQR, Conversacion, MensajeChat

from sqlalchemy import (
    DECIMAL,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ===============================================================
# 1. Seguridad y acceso
# ===============================================================
class Rol(Base):
    __tablename__ = "roles"

    id_rol = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(30), nullable=False, unique=True)
    descripcion = Column(String(150), nullable=True)

    usuarios = relationship("Usuario", back_populates="rol")


class Permiso(Base):
    __tablename__ = "permisos"

    id_permiso = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(60), nullable=False, unique=True)
    descripcion = Column(String(150), nullable=True)


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(40), nullable=False)
    apellido = Column(String(40), nullable=False)
    tipo_documento = Column(String(2), nullable=False)  # ENUM('CC','TI','CE','PA')
    numero_documento = Column(String(12), nullable=False, unique=True)
    direccion = Column(String(150), nullable=False)
    telefono = Column(String(15), nullable=False)
    email = Column(String(120), nullable=False, unique=True)
    email_verificado = Column(Boolean, nullable=False, default=False)
    doble_factor = Column(Boolean, nullable=False, default=False)
    password_hash = Column(String(255), nullable=False)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False, default=3)
    estado = Column(String(10), nullable=False, default="activo")  # activo/inactivo
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    rol = relationship("Rol", back_populates="usuarios")


class PasswordReset(Base):
    """Token de recuperación de contraseña (se guarda hasheado, con caducidad)."""

    __tablename__ = "password_resets"

    id_reset = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    token_hash = Column(String(64), nullable=False)
    # Código de 6 dígitos que viaja en el mismo correo, para quien prefiere
    # escribirlo en la página en vez de abrir el enlace.
    codigo_hash = Column(String(64), nullable=True)
    intentos = Column(Integer, nullable=False, default=0)
    expira_en = Column(DateTime, nullable=False)
    usado = Column(Boolean, nullable=False, default=False)
    creado_en = Column(DateTime, server_default=func.now())

    usuario = relationship("Usuario")


class CodigoVerificacion(Base):
    """Códigos que viajan por correo, guardados siempre hasheados.

    Cubre los dos casos con la misma tabla:
      - tipo 'correo':       enlace para confirmar la cuenta al registrarse
      - tipo 'doble_factor': código de 6 dígitos del segundo paso del login

    `desafio` es el identificador público que el login devuelve al
    navegador; así el frontend nunca maneja el id del usuario mientras la
    sesión todavía no existe.
    """

    __tablename__ = "codigos_verificacion"

    id_codigo = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    tipo = Column(String(20), nullable=False)  # correo | doble_factor
    codigo_hash = Column(String(64), nullable=False)
    desafio = Column(String(43), nullable=True)
    expira_en = Column(DateTime, nullable=False)
    usado = Column(Boolean, nullable=False, default=False)
    intentos = Column(Integer, nullable=False, default=0)
    creado_en = Column(DateTime, server_default=func.now())

    usuario = relationship("Usuario")


# ===============================================================
# 2. Catálogo
# ===============================================================
class Categoria(Base):
    __tablename__ = "categorias"

    id_categoria = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(60), nullable=False, unique=True)
    slug = Column(String(70), nullable=False, unique=True)
    descripcion = Column(String(255), nullable=True)
    icono = Column(String(40), nullable=True)
    estado = Column(String(10), nullable=False, default="activo")
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    productos = relationship("Producto", back_populates="categoria")


class Producto(Base):
    __tablename__ = "productos"

    id_producto = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(80), nullable=False)
    marca = Column(String(40), nullable=False)
    id_categoria = Column(
        Integer, ForeignKey("categorias.id_categoria"), nullable=True
    )
    descripcion = Column(String(500), nullable=True)
    precio = Column(DECIMAL(12, 2), nullable=False, default=0)
    precio_anterior = Column(DECIMAL(12, 2), nullable=True)
    stock = Column(Integer, nullable=False, default=0)
    stock_minimo = Column(Integer, nullable=False, default=5)
    destacado = Column(Boolean, nullable=False, default=False)
    imagen_url = Column(String(255), nullable=True)
    estado = Column(String(10), nullable=False, default="activo")
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    categoria = relationship("Categoria", back_populates="productos")


class Servicio(Base):
    __tablename__ = "servicios"

    id_servicio = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(80), nullable=False)
    descripcion = Column(String(500), nullable=True)
    precio = Column(DECIMAL(12, 2), nullable=False, default=0)
    duracion = Column(String(40), nullable=True)
    icono = Column(String(40), nullable=True)
    imagen_url = Column(String(255), nullable=True)
    estado = Column(String(10), nullable=False, default="activo")
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ===============================================================
# 3. Ventas e inventario
# ===============================================================
class Venta(Base):
    """Cabecera del pedido.

    Los datos del cliente se copian aquí (no solo la FK) para conservar
    la información histórica de la transacción aunque el usuario cambie
    sus datos más adelante o su cuenta se elimine.
    """

    __tablename__ = "ventas"

    id_venta = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(20), nullable=False, unique=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    cliente_nombre = Column(String(90), nullable=False)
    cliente_email = Column(String(120), nullable=False)
    cliente_telefono = Column(String(15), nullable=False)
    cliente_documento = Column(String(12), nullable=True)
    direccion_envio = Column(String(150), nullable=False)
    ciudad = Column(String(60), nullable=False)
    notas = Column(String(300), nullable=True)
    metodo_pago = Column(String(20), nullable=False, default="contraentrega")
    subtotal = Column(DECIMAL(12, 2), nullable=False, default=0)
    descuento = Column(DECIMAL(12, 2), nullable=False, default=0)
    impuestos = Column(DECIMAL(12, 2), nullable=False, default=0)
    costo_envio = Column(DECIMAL(12, 2), nullable=False, default=0)
    total = Column(DECIMAL(12, 2), nullable=False, default=0)
    total_articulos = Column(Integer, nullable=False, default=0)
    estado = Column(String(12), nullable=False, default="pendiente")
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    usuario = relationship("Usuario")
    detalles = relationship(
        "VentaDetalle",
        back_populates="venta",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class VentaDetalle(Base):
    """Línea del pedido con el precio congelado al momento de la compra."""

    __tablename__ = "venta_detalles"

    id_detalle = Column(Integer, primary_key=True, autoincrement=True)
    id_venta = Column(Integer, ForeignKey("ventas.id_venta"), nullable=False)
    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=True)
    nombre_producto = Column(String(80), nullable=False)
    marca_producto = Column(String(40), nullable=True)
    precio_unitario = Column(DECIMAL(12, 2), nullable=False)
    cantidad = Column(Integer, nullable=False)
    subtotal = Column(DECIMAL(12, 2), nullable=False)

    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto")


class MovimientoInventario(Base):
    """Kardex: cada variación de stock queda registrada aquí."""

    __tablename__ = "movimientos_inventario"

    id_movimiento = Column(Integer, primary_key=True, autoincrement=True)
    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=False)
    tipo = Column(String(10), nullable=False)  # entrada / salida / ajuste
    cantidad = Column(Integer, nullable=False)
    stock_anterior = Column(Integer, nullable=False)
    stock_nuevo = Column(Integer, nullable=False)
    motivo = Column(String(150), nullable=True)
    id_venta = Column(Integer, ForeignKey("ventas.id_venta"), nullable=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    creado_en = Column(DateTime, server_default=func.now())

    producto = relationship("Producto")
    usuario = relationship("Usuario")


# ===============================================================
# 4. Atención al cliente
# ===============================================================
class SolicitudServicio(Base):
    __tablename__ = "solicitudes_servicio"

    id_solicitud = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(20), nullable=False, unique=True)
    id_servicio = Column(Integer, ForeignKey("servicios.id_servicio"), nullable=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    nombre_servicio = Column(String(80), nullable=False)
    precio_servicio = Column(DECIMAL(12, 2), nullable=False, default=0)
    cliente_nombre = Column(String(90), nullable=False)
    cliente_email = Column(String(120), nullable=False)
    cliente_telefono = Column(String(15), nullable=False)
    equipo = Column(String(80), nullable=True)
    descripcion = Column(String(500), nullable=False)
    respuesta = Column(String(500), nullable=True)
    estado = Column(String(12), nullable=False, default="pendiente")
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    servicio = relationship("Servicio")
    usuario = relationship("Usuario")


class MensajeContacto(Base):
    __tablename__ = "mensajes_contacto"

    id_mensaje = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(80), nullable=False)
    email = Column(String(120), nullable=False)
    telefono = Column(String(15), nullable=True)
    asunto = Column(String(120), nullable=False)
    mensaje = Column(String(1000), nullable=False)
    estado = Column(String(12), nullable=False, default="nuevo")
    creado_en = Column(DateTime, server_default=func.now())


# ===============================================================
# 5. Facturación, PQR y asistente (quinto avance)
# ===============================================================
class Factura(Base):
    """Documento emitido a partir de una venta.

    Guarda una copia de los importes y de los datos del cliente. Si
    mañana cambia el precio de un producto o el cliente actualiza su
    dirección, la factura ya emitida debe seguir diciendo lo mismo que el
    día que se expidió.
    """

    __tablename__ = "facturas"

    id_factura = Column(Integer, primary_key=True, autoincrement=True)
    numero = Column(String(20), nullable=False, unique=True)
    id_venta = Column(Integer, ForeignKey("ventas.id_venta"), nullable=False, unique=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)

    cliente_nombre = Column(String(120), nullable=False)
    cliente_documento = Column(String(20), nullable=True)
    cliente_email = Column(String(120), nullable=False)
    cliente_telefono = Column(String(15), nullable=True)
    cliente_direccion = Column(String(150), nullable=True)

    subtotal = Column(DECIMAL(12, 2), nullable=False, default=0)
    descuento = Column(DECIMAL(12, 2), nullable=False, default=0)
    impuestos = Column(DECIMAL(12, 2), nullable=False, default=0)
    costo_envio = Column(DECIMAL(12, 2), nullable=False, default=0)
    total = Column(DECIMAL(12, 2), nullable=False, default=0)

    estado = Column(String(10), nullable=False, default="emitida")
    observaciones = Column(String(255), nullable=True)
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    venta = relationship("Venta")
    usuario = relationship("Usuario")


class PQR(Base):
    """Peticiones, quejas, reclamos y sugerencias.

    El radicado es el número con el que el cliente consulta su caso sin
    tener que iniciar sesión.
    """

    __tablename__ = "pqr"

    id_pqr = Column(Integer, primary_key=True, autoincrement=True)
    radicado = Column(String(20), nullable=False, unique=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)

    tipo = Column(String(12), nullable=False)  # peticion|queja|reclamo|sugerencia
    asunto = Column(String(120), nullable=False)
    descripcion = Column(String(1000), nullable=False)

    cliente_nombre = Column(String(80), nullable=False)
    cliente_email = Column(String(120), nullable=False)
    cliente_telefono = Column(String(15), nullable=True)
    id_venta = Column(Integer, ForeignKey("ventas.id_venta"), nullable=True)

    estado = Column(String(12), nullable=False, default="pendiente")
    respuesta = Column(String(1000), nullable=True)
    id_responsable = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    respondida_en = Column(DateTime, nullable=True)

    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    usuario = relationship("Usuario", foreign_keys=[id_usuario])
    responsable = relationship("Usuario", foreign_keys=[id_responsable])
    venta = relationship("Venta")


class Conversacion(Base):
    """Una charla con el asistente.

    Se identifica con una clave pública para que un visitante sin cuenta
    pueda continuar su conversación; cuando hay sesión, además se enlaza
    al usuario.
    """

    __tablename__ = "conversaciones"

    id_conversacion = Column(Integer, primary_key=True, autoincrement=True)
    clave = Column(String(43), nullable=False, unique=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    titulo = Column(String(120), nullable=True)
    motor = Column(String(30), nullable=False, default="catalogo")
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    usuario = relationship("Usuario")
    mensajes = relationship(
        "MensajeChat",
        back_populates="conversacion",
        cascade="all, delete-orphan",
        order_by="MensajeChat.id_mensaje",
    )


class MensajeChat(Base):
    """Cada turno de la conversación, en orden."""

    __tablename__ = "mensajes_chat"

    id_mensaje = Column(Integer, primary_key=True, autoincrement=True)
    id_conversacion = Column(
        Integer, ForeignKey("conversaciones.id_conversacion"), nullable=False
    )
    autor = Column(String(10), nullable=False)  # cliente | asistente
    contenido = Column(String(2000), nullable=False)
    creado_en = Column(DateTime, server_default=func.now())

    conversacion = relationship("Conversacion", back_populates="mensajes")
