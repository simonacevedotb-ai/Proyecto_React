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

from pydantic import BaseModel, Field


# ---------------------------------------------------------------
# Autenticación / Usuarios
# ---------------------------------------------------------------
class UsuarioRegistro(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=40)
    apellido: str = Field(..., min_length=2, max_length=40)
    tipoDocumento: str = Field(..., min_length=2, max_length=2)
    numeroDocumento: str = Field(..., min_length=6, max_length=12)
    direccion: str = Field(..., min_length=10, max_length=150)
    telefono: str = Field(..., min_length=7, max_length=15)
    email: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=20)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=1, max_length=20)


class UsuarioCrear(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=40)
    apellido: str = Field(..., min_length=2, max_length=40)
    tipoDocumento: str = Field(..., min_length=2, max_length=2)
    numeroDocumento: str = Field(..., min_length=6, max_length=12)
    direccion: str = Field(..., min_length=10, max_length=150)
    telefono: str = Field(..., min_length=7, max_length=15)
    email: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=20)
    id_rol: Optional[int] = None


class UsuarioActualizar(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=40)
    apellido: str = Field(..., min_length=2, max_length=40)
    direccion: str = Field(..., min_length=10, max_length=150)
    telefono: str = Field(..., min_length=7, max_length=15)
    email: str = Field(..., min_length=1, max_length=120)


class PerfilActualizar(BaseModel):
    """Datos que el propio usuario autenticado puede cambiar de su cuenta."""

    nombre: str = Field(..., min_length=2, max_length=40)
    apellido: str = Field(..., min_length=2, max_length=40)
    direccion: str = Field(..., min_length=10, max_length=150)
    telefono: str = Field(..., min_length=7, max_length=15)


class CambioPassword(BaseModel):
    passwordActual: str = Field(..., min_length=1, max_length=20)
    passwordNueva: str = Field(..., min_length=8, max_length=20)


class UsuarioEstadoUpdate(BaseModel):
    estado: str


class UsuarioRolUpdate(BaseModel):
    id_rol: int


class RecuperarPasswordRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=120)


class RestablecerPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=120)
    password: str = Field(..., min_length=8, max_length=20)


class RestablecerConCodigoRequest(BaseModel):
    """Segundo camino del correo de recuperacion: codigo de 6 digitos."""

    email: str = Field(..., min_length=5, max_length=120)
    codigo: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=8, max_length=20)


class VerificarCorreoRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=120)


class ReenviarVerificacionRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


class DobleFactorRequest(BaseModel):
    """Segundo paso del login: el desafío que devolvió /login y el código."""

    desafio: str = Field(..., min_length=10, max_length=60)
    codigo: str = Field(..., min_length=6, max_length=6)


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
    nombre: str = Field(..., min_length=2, max_length=80)
    marca: str = Field(..., min_length=2, max_length=40)
    id_categoria: Optional[int] = None
    descripcion: Optional[str] = Field(default=None, max_length=500)
    precio: float = Field(..., ge=0)
    precio_anterior: Optional[float] = Field(default=None, ge=0)
    stock: Optional[int] = Field(default=0, ge=0)
    stock_minimo: Optional[int] = Field(default=5, ge=0)
    destacado: Optional[bool] = False
    imagen_url: Optional[str] = Field(default=None, max_length=255)


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
    items: List[ItemCompra] = Field(..., min_length=1, max_length=50)
    cliente_nombre: str = Field(..., min_length=3, max_length=90)
    cliente_email: str = Field(..., min_length=5, max_length=120)
    cliente_telefono: str = Field(..., min_length=7, max_length=15)
    cliente_documento: Optional[str] = Field(default=None, max_length=12)
    direccion_envio: str = Field(..., min_length=10, max_length=150)
    ciudad: str = Field(..., min_length=3, max_length=60)
    notas: Optional[str] = Field(default=None, max_length=300)
    metodo_pago: str = Field(default="contraentrega", max_length=20)


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


class MensajeEstadoUpdate(BaseModel):
    estado: str = Field(..., max_length=12)


# ---------------------------------------------------------------
# Genérico (PATCH .../estado de productos, servicios y categorías)
# ---------------------------------------------------------------
class EstadoUpdate(BaseModel):
    estado: str
