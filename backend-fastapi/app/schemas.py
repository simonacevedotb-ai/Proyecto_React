# Esquemas Pydantic usados para validar los datos que llegan por la API.
#
# Diferencia con app/models.py:
#   - models.py define las tablas SQLAlchemy (cómo se guarda en MySQL).
#   - schemas.py define la "forma" que debe tener el JSON que entra por
#     cada endpoint (tipos de dato, campos obligatorios, longitudes).
#
# FastAPI valida el body ANTES de ejecutar el código de la ruta. Si algo
# no cumple el esquema, responde con error y `validation_error_handler`
# (app/main.py) lo traduce al formato { ok, message, errors } que usa el
# Frontend.
#
# Las reglas de negocio más específicas (regex de correo, complejidad de
# contraseña, duplicados en base de datos, stock disponible) se validan
# además en app/validations.py y en las propias rutas.
#
# NOTA DE SEGURIDAD: los esquemas de compra (VentaCrear/ItemCompra) NO
# aceptan precios ni totales enviados por el navegador. El cliente solo
# manda id_producto y cantidad; el backend consulta el precio real en la
# base de datos. Así el precio no se puede manipular desde el Frontend.

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.validations import (
    METODOS_PAGO_VALIDOS,
    TIPOS_DOCUMENTO_VALIDOS,
    validate_email_simple,
)

# ---------------------------------------------------------------
# Ayudas de validación reutilizables
#
# Reparto de responsabilidades: aquí se valida la FORMA del dato
# (que el correo tenga forma de correo, que el tipo de documento exista,
# que la contraseña mezcle letras y números). Lo que necesita consultar
# la base de datos (correo repetido, stock disponible, dueño del recurso)
# se valida en app/validations.py y en las rutas, porque el esquema no
# tiene acceso a la sesión de base de datos.
# ---------------------------------------------------------------
def _correo_valido(valor: str) -> str:
    correo = (valor or "").strip().lower()
    if not validate_email_simple(correo):
        raise ValueError("Escribe un correo electrónico válido.")
    return correo


def _password_segura(valor: str) -> str:
    if not any(c.isalpha() for c in valor) or not any(c.isdigit() for c in valor):
        raise ValueError("La contraseña debe combinar letras y números.")
    return valor


def _solo_digitos(valor: Optional[str], campo: str) -> Optional[str]:
    if valor is None:
        return None
    limpio = valor.strip()
    if limpio and not limpio.isdigit():
        raise ValueError(f"{campo} debe contener solo números.")
    return limpio


# ---------------------------------------------------------------
# Autenticación / Usuarios
# ---------------------------------------------------------------
class UsuarioRegistro(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "nombre": "Ana", "apellido": "Ramírez", "tipoDocumento": "CC",
            "numeroDocumento": "1012345678", "direccion": "Calle 45 # 12-34",
            "telefono": "3140001122", "email": "ana@correo.com",
            "password": "Clave1234",
        }
    })

    nombre: str = Field(..., min_length=2, max_length=40)
    apellido: str = Field(..., min_length=2, max_length=40)
    tipoDocumento: str = Field(..., min_length=2, max_length=2)
    numeroDocumento: str = Field(..., min_length=6, max_length=12)
    direccion: str = Field(..., min_length=10, max_length=150)
    telefono: str = Field(..., min_length=7, max_length=15)
    email: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=20)

    @field_validator("email")
    @classmethod
    def revisar_correo(cls, valor: str) -> str:
        return _correo_valido(valor)

    @field_validator("tipoDocumento")
    @classmethod
    def revisar_documento(cls, valor: str) -> str:
        tipo = (valor or "").strip().upper()
        if tipo not in TIPOS_DOCUMENTO_VALIDOS:
            raise ValueError(
                f"El tipo de documento debe ser uno de: {', '.join(TIPOS_DOCUMENTO_VALIDOS)}."
            )
        return tipo

    @field_validator("numeroDocumento", "telefono")
    @classmethod
    def revisar_numeros(cls, valor: str) -> str:
        return _solo_digitos(valor, "Este campo")

    @field_validator("password")
    @classmethod
    def revisar_password(cls, valor: str) -> str:
        return _password_segura(valor)


class LoginRequest(BaseModel):
    """El correo se normaliza, pero no se valida su forma a propósito:
    quien escribe mal el correo debe recibir el mismo 'credenciales
    inválidas' que quien se equivoca de contraseña. Así nadie averigua
    qué correos existen probando formatos."""

    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "ana@correo.com", "password": "Clave1234"}
    })

    email: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=1, max_length=20)

    @field_validator("email")
    @classmethod
    def normalizar_correo(cls, valor: str) -> str:
        return (valor or "").strip().lower()


class UsuarioCrear(UsuarioRegistro):
    """Lo que envía un administrador al crear una cuenta desde el panel:
    los mismos datos del registro más el rol que le asigna."""

    id_rol: Optional[int] = Field(default=None, ge=1)


class UsuarioActualizar(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=40)
    apellido: str = Field(..., min_length=2, max_length=40)
    direccion: str = Field(..., min_length=10, max_length=150)
    telefono: str = Field(..., min_length=7, max_length=15)
    email: str = Field(..., min_length=1, max_length=120)

    @field_validator("email")
    @classmethod
    def revisar_correo(cls, valor: str) -> str:
        return _correo_valido(valor)

    @field_validator("telefono")
    @classmethod
    def revisar_telefono(cls, valor: str) -> str:
        return _solo_digitos(valor, "El teléfono")


class PerfilActualizar(BaseModel):
    """Datos que el propio usuario autenticado puede cambiar de su cuenta."""

    nombre: str = Field(..., min_length=2, max_length=40)
    apellido: str = Field(..., min_length=2, max_length=40)
    direccion: str = Field(..., min_length=10, max_length=150)
    telefono: str = Field(..., min_length=7, max_length=15)


class CambioPassword(BaseModel):
    passwordActual: str = Field(..., min_length=1, max_length=20)
    passwordNueva: str = Field(..., min_length=8, max_length=20)

    @field_validator("passwordNueva")
    @classmethod
    def revisar_password(cls, valor: str) -> str:
        return _password_segura(valor)

    @model_validator(mode="after")
    def revisar_que_cambie(self):
        if self.passwordActual == self.passwordNueva:
            raise ValueError("La contraseña nueva debe ser distinta de la actual.")
        return self


class UsuarioEstadoUpdate(BaseModel):
    estado: str


class UsuarioRolUpdate(BaseModel):
    id_rol: int


class RecuperarPasswordRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=120)

    @field_validator("email")
    @classmethod
    def normalizar_correo(cls, valor: str) -> str:
        return (valor or "").strip().lower()


class RestablecerPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=120)
    password: str = Field(..., min_length=8, max_length=20)

    @field_validator("password")
    @classmethod
    def revisar_password(cls, valor: str) -> str:
        return _password_segura(valor)


class RestablecerConCodigoRequest(BaseModel):
    """Segundo camino del correo de recuperacion: codigo de 6 digitos."""

    email: str = Field(..., min_length=5, max_length=120)
    codigo: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=8, max_length=20)

    @field_validator("email")
    @classmethod
    def normalizar_correo(cls, valor: str) -> str:
        return (valor or "").strip().lower()

    @field_validator("codigo")
    @classmethod
    def revisar_codigo(cls, valor: str) -> str:
        return _solo_digitos(valor, "El código")

    @field_validator("password")
    @classmethod
    def revisar_password(cls, valor: str) -> str:
        return _password_segura(valor)


class VerificarCorreoRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=120)


class ReenviarVerificacionRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


class DobleFactorRequest(BaseModel):
    """Segundo paso del login: el desafío que devolvió /login y el código."""

    desafio: str = Field(..., min_length=10, max_length=60)
    codigo: str = Field(..., min_length=6, max_length=6)

    @field_validator("codigo")
    @classmethod
    def revisar_codigo(cls, valor: str) -> str:
        return _solo_digitos(valor, "El código")


class DobleFactorPreferencia(BaseModel):
    activo: bool


# ---------------------------------------------------------------
# Categorías
# ---------------------------------------------------------------
class CategoriaCrear(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=60)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    icono: Optional[str] = Field(default=None, max_length=40)


class CategoriaActualizar(CategoriaCrear):
    pass


# ---------------------------------------------------------------
# Productos
# ---------------------------------------------------------------
class ProductoCrear(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "nombre": "iPhone 15 Pro", "marca": "Apple", "id_categoria": 1,
            "descripcion": "Titanio, chip A17 Pro y cámara de 48 MP.",
            "precio": 5400000, "precio_anterior": 5900000, "stock": 12,
            "stock_minimo": 3, "destacado": True,
            "imagen_url": "/img/iphone-15-pro.png",
        }
    })

    nombre: str = Field(..., min_length=2, max_length=80)
    marca: str = Field(..., min_length=2, max_length=40)
    id_categoria: Optional[int] = Field(default=None, ge=1)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    precio: float = Field(..., ge=0, le=999999999)
    precio_anterior: Optional[float] = Field(default=None, ge=0, le=999999999)
    stock: Optional[int] = Field(default=0, ge=0)
    stock_minimo: Optional[int] = Field(default=5, ge=0)
    destacado: Optional[bool] = False
    imagen_url: Optional[str] = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def revisar_oferta(self):
        """El precio anterior solo tiene sentido si es mayor que el actual:
        es el precio tachado que sostiene el descuento en la tarjeta."""
        if self.precio_anterior is not None and self.precio_anterior <= self.precio:
            raise ValueError(
                "El precio anterior debe ser mayor que el precio actual, "
                "o dejarse vacío si el producto no está en oferta."
            )
        return self


class ProductoActualizar(ProductoCrear):
    pass


# ---------------------------------------------------------------
# Servicios
# ---------------------------------------------------------------
class ServicioCrear(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=80)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    precio: float = Field(..., ge=0)
    duracion: Optional[str] = Field(default=None, max_length=40)
    icono: Optional[str] = Field(default=None, max_length=40)
    imagen_url: Optional[str] = Field(default=None, max_length=255)


class ServicioActualizar(ServicioCrear):
    pass


# ---------------------------------------------------------------
# Ventas / Checkout
# ---------------------------------------------------------------
class ItemCompra(BaseModel):
    """Una línea del carrito enviada al backend.

    Deliberadamente NO incluye precio: el backend lo toma de la base de
    datos para que no se pueda alterar desde el navegador.
    """

    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0, le=50)


class VentaCrear(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "items": [{"id_producto": 1, "cantidad": 2}],
            "cliente_nombre": "Ana Ramírez", "cliente_email": "ana@correo.com",
            "cliente_telefono": "3140001122", "cliente_documento": "1012345678",
            "direccion_envio": "Calle 45 # 12-34", "ciudad": "Medellín",
            "notas": "Entregar después de las 6 p. m.",
            "metodo_pago": "contraentrega",
        }
    })

    items: List[ItemCompra] = Field(..., min_length=1, max_length=50)
    cliente_nombre: str = Field(..., min_length=3, max_length=90)
    cliente_email: str = Field(..., min_length=5, max_length=120)
    cliente_telefono: str = Field(..., min_length=7, max_length=15)
    cliente_documento: Optional[str] = Field(default=None, max_length=12)
    direccion_envio: str = Field(..., min_length=10, max_length=150)
    ciudad: str = Field(..., min_length=3, max_length=60)
    notas: Optional[str] = Field(default=None, max_length=300)
    metodo_pago: str = Field(default="contraentrega", max_length=20)

    @field_validator("cliente_email")
    @classmethod
    def revisar_correo(cls, valor: str) -> str:
        return _correo_valido(valor)

    @field_validator("metodo_pago")
    @classmethod
    def revisar_metodo(cls, valor: str) -> str:
        metodo = (valor or "contraentrega").strip().lower()
        if metodo not in METODOS_PAGO_VALIDOS:
            raise ValueError(
                f"El método de pago debe ser uno de: {', '.join(METODOS_PAGO_VALIDOS)}."
            )
        return metodo

    @model_validator(mode="after")
    def revisar_lineas_repetidas(self):
        """Un mismo producto no puede venir en dos líneas del carrito: el
        stock se descontaría dos veces y el cliente vería el artículo
        duplicado en la factura."""
        vistos = [i.id_producto for i in self.items]
        if len(vistos) != len(set(vistos)):
            raise ValueError(
                "Hay un producto repetido en el carrito; súmalo en una sola línea."
            )
        return self


class VentaEstadoUpdate(BaseModel):
    estado: str


# ---------------------------------------------------------------
# Inventario
# ---------------------------------------------------------------
class MovimientoCrear(BaseModel):
    id_producto: int = Field(..., gt=0)
    tipo: str = Field(..., max_length=10)  # entrada / salida / ajuste
    cantidad: int = Field(..., gt=0, le=100000)
    motivo: Optional[str] = Field(default=None, max_length=150)

    @field_validator("tipo")
    @classmethod
    def revisar_tipo(cls, valor: str) -> str:
        tipo = (valor or "").strip().lower()
        if tipo not in ("entrada", "salida", "ajuste"):
            raise ValueError("El movimiento debe ser 'entrada', 'salida' o 'ajuste'.")
        return tipo


# ---------------------------------------------------------------
# Solicitudes de servicio técnico
# ---------------------------------------------------------------
class SolicitudCrear(BaseModel):
    id_servicio: int = Field(..., gt=0)
    cliente_nombre: str = Field(..., min_length=3, max_length=90)
    cliente_email: str = Field(..., min_length=5, max_length=120)
    cliente_telefono: str = Field(..., min_length=7, max_length=15)
    equipo: Optional[str] = Field(default=None, max_length=80)
    descripcion: str = Field(..., min_length=10, max_length=500)

    @field_validator("cliente_email")
    @classmethod
    def revisar_correo(cls, valor: str) -> str:
        return _correo_valido(valor)


class SolicitudActualizar(BaseModel):
    estado: str = Field(..., max_length=12)
    respuesta: Optional[str] = Field(default=None, max_length=500)


# ---------------------------------------------------------------
# Mensajes de contacto
# ---------------------------------------------------------------
class MensajeCrear(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., min_length=5, max_length=120)
    telefono: Optional[str] = Field(default=None, max_length=15)
    asunto: str = Field(..., min_length=3, max_length=120)
    mensaje: str = Field(..., min_length=10, max_length=1000)

    @field_validator("email")
    @classmethod
    def revisar_correo(cls, valor: str) -> str:
        return _correo_valido(valor)


class MensajeEstadoUpdate(BaseModel):
    estado: str = Field(..., max_length=12)


# ---------------------------------------------------------------
# Genérico (PATCH .../estado de productos, servicios y categorías)
# ---------------------------------------------------------------
class EstadoUpdate(BaseModel):
    estado: str


# ---------------------------------------------------------------
# Facturación, PQR y asistente (quinto avance)
# ---------------------------------------------------------------
class FacturaCrear(BaseModel):
    """La factura se emite a partir de una venta ya registrada."""

    id_venta: int = Field(..., gt=0)
    observaciones: Optional[str] = Field(default=None, max_length=255)


class FacturaEstadoUpdate(BaseModel):
    estado: str = Field(..., min_length=4, max_length=10)


class PQRCrear(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "tipo": "reclamo",
            "asunto": "El pedido llegó con un accesorio de menos",
            "descripcion": "Compré dos artículos y en la caja solo venía uno.",
            "nombre": "Ana Ramírez", "email": "ana@correo.com",
            "telefono": "3140001122", "id_venta": 12,
        }
    })

    tipo: str = Field(..., min_length=5, max_length=12)
    asunto: str = Field(..., min_length=5, max_length=120)
    descripcion: str = Field(..., min_length=15, max_length=1000)
    nombre: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., min_length=5, max_length=120)
    telefono: Optional[str] = Field(default=None, max_length=15)
    id_venta: Optional[int] = Field(default=None, gt=0)

    @field_validator("tipo")
    @classmethod
    def revisar_tipo(cls, valor: str) -> str:
        tipo = (valor or "").strip().lower()
        if tipo not in ("peticion", "queja", "reclamo", "sugerencia"):
            raise ValueError(
                "El tipo debe ser: peticion, queja, reclamo o sugerencia."
            )
        return tipo

    @field_validator("email")
    @classmethod
    def revisar_correo(cls, valor: str) -> str:
        return _correo_valido(valor)


class PQRResponder(BaseModel):
    respuesta: str = Field(..., min_length=5, max_length=1000)
    estado: Optional[str] = Field(default="respondida", max_length=12)


class PQREstadoUpdate(BaseModel):
    estado: str = Field(..., min_length=6, max_length=12)


class ChatMensaje(BaseModel):
    """Un turno del cliente. `clave` continúa una conversación abierta."""

    mensaje: str = Field(..., min_length=1, max_length=1000)
    clave: Optional[str] = Field(default=None, max_length=43)


# ===============================================================
# Esquemas de salida (Response)
#
# La entrada y la salida son cosas distintas y por eso tienen esquemas
# distintos: al crear un producto se envía `precio` pero no `id`, y al
# leerlo vuelve el `id`, la categoría resuelta por nombre y el estado de
# stock calculado. Del usuario entra `password` y nunca sale: el esquema
# de salida ni siquiera lo menciona, así que aunque alguien lo agregara
# por error al diccionario, FastAPI lo descartaría antes de responder.
#
# Además son los que dibujan los ejemplos de /docs.
# ===============================================================
class RespuestaSimple(BaseModel):
    ok: bool = True
    message: Optional[str] = None


class Paginacion(BaseModel):
    pagina: int
    limite: int
    total: int
    total_paginas: int


class UsuarioRespuesta(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: str
    email_verificado: bool = False
    doble_factor: bool = False
    estado: Optional[str] = None
    id_rol: Optional[int] = None
    rol: Optional[str] = None
    creado_en: Optional[str] = None
    actualizado_en: Optional[str] = None


class SesionRespuesta(BaseModel):
    """Lo que devuelve /auth/me y el segundo paso del inicio de sesión."""

    ok: bool = True
    usuario: UsuarioRespuesta


class CategoriaRespuesta(BaseModel):
    id_categoria: int
    nombre: str
    slug: Optional[str] = None
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    estado: Optional[str] = None
    creado_en: Optional[str] = None
    total_productos: Optional[int] = None


class CategoriasRespuesta(BaseModel):
    ok: bool = True
    categorias: List[CategoriaRespuesta]


class CategoriaUnicaRespuesta(BaseModel):
    ok: bool = True
    message: Optional[str] = None
    categoria: CategoriaRespuesta


class ProductoRespuesta(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "id_producto": 1, "nombre": "iPhone 15 Pro", "marca": "Apple",
            "id_categoria": 1, "categoria": "Celulares",
            "descripcion": "Titanio, chip A17 Pro y cámara de 48 MP.",
            "precio": 5400000.0, "precio_anterior": 5900000.0,
            "stock": 12, "stock_minimo": 3, "estado_stock": "disponible",
            "destacado": True, "imagen_url": "/img/iphone-15-pro.png",
            "estado": "activo", "creado_en": "2026-09-18 09:15:00",
            "actualizado_en": "2026-09-18 09:15:00",
        }
    })

    id_producto: int
    nombre: str
    marca: Optional[str] = None
    id_categoria: Optional[int] = None
    categoria: Optional[str] = None
    descripcion: Optional[str] = None
    precio: float
    precio_anterior: Optional[float] = None
    stock: int = 0
    stock_minimo: int = 0
    estado_stock: str
    destacado: bool = False
    imagen_url: Optional[str] = None
    estado: Optional[str] = None
    creado_en: Optional[str] = None
    actualizado_en: Optional[str] = None


class ProductosRespuesta(BaseModel):
    ok: bool = True
    productos: List[ProductoRespuesta]
    paginacion: Paginacion


class ProductoDetalleRespuesta(BaseModel):
    ok: bool = True
    producto: ProductoRespuesta
    relacionados: List[ProductoRespuesta] = []


class ProductoUnicoRespuesta(BaseModel):
    ok: bool = True
    message: Optional[str] = None
    producto: ProductoRespuesta


class ProductoEliminadoRespuesta(BaseModel):
    """Borrar un producto vendido lo desactiva en vez de eliminarlo, así
    que la respuesta dice cuál de las dos cosas pasó."""

    ok: bool = True
    message: str
    desactivado: bool = False
    producto: Optional[ProductoRespuesta] = None
