# Punto de entrada de la aplicación FastAPI.
#
# Aquí se configuran: CORS, cabeceras de seguridad, el manejo unificado
# de errores y el registro de todos los routers bajo /api/...
#
# Documentación automática (Swagger UI): http://localhost:3000/docs

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import check_connection
from app.errors import AppError
from app.routes import (
    auth_routes,
    categorias,
    chatbot,
    contacto,
    dashboard,
    facturas,
    inventario,
    pqr,
    productos,
    reportes,
    servicios,
    solicitudes,
    usuarios,
    ventas,
)
from app.security import SecurityHeadersMiddleware, cors_origins

DESCRIPCION = """
API REST de **PhoneStore** (React + Vite → FastAPI → MySQL).

Módulos disponibles:

* **auth** – registro, login, sesión, perfil y recuperación de contraseña (JWT).
* **usuarios** – CRUD completo con control de roles.
* **categorias / productos / servicios** – catálogo de la tienda.
* **ventas** – checkout transaccional con descuento de stock.
* **inventario** – kardex de entradas, salidas y ajustes.
* **solicitudes** – agendamiento de servicios técnicos.
* **contacto** – bandeja de mensajes del formulario público.
* **dashboard** – métricas y reportes del panel administrativo.
* **facturas** – emisión, consulta y descarga en PDF.
* **reportes** – reporte de ventas en JSON, PDF y Excel.
* **pqr** – peticiones, quejas, reclamos y sugerencias.
* **chatbot** – asistente de atención al cliente.

Las rutas protegidas requieren la cabecera `Authorization: Bearer <token>`.

**Cómo probar aquí mismo:** ejecuta `POST /api/auth/login`, copia el
`token` de la respuesta, pulsa **Authorize** (arriba a la derecha) y
pégalo. A partir de ahí Swagger envía la cabecera en cada petición.
"""

# Descripción de cada grupo de rutas: es lo que Swagger muestra bajo el
# título de cada sección, para que se entienda qué hace cada módulo sin
# tener que abrir los endpoints uno por uno.
ETIQUETAS = [
    {"name": "sistema", "description": "Comprobación de que la API está viva."},
    {"name": "auth", "description":
        "Registro, inicio de sesión con JWT, verificación de correo, "
        "doble factor y recuperación de contraseña."},
    {"name": "usuarios", "description":
        "CRUD de cuentas y cambio de rol. Solo para administradores."},
    {"name": "categorias", "description": "Categorías del catálogo."},
    {"name": "productos", "description":
        "Catálogo: búsqueda, filtros, paginación y CRUD con control de rol."},
    {"name": "servicios", "description": "Servicios técnicos que ofrece la tienda."},
    {"name": "ventas", "description":
        "Checkout transaccional: valida stock, descuenta inventario y "
        "registra el pedido en una sola transacción."},
    {"name": "inventario", "description": "Kardex de entradas, salidas y ajustes."},
    {"name": "solicitudes", "description": "Agendamiento de servicios técnicos."},
    {"name": "contacto", "description": "Bandeja del formulario público."},
    {"name": "dashboard", "description": "Métricas del panel administrativo."},
    {"name": "facturas", "description":
        "Emisión, consulta y descarga en PDF de las facturas de venta."},
    {"name": "reportes", "description":
        "Reporte de ventas en JSON, PDF y Excel, con rango de fechas."},
    {"name": "pqr", "description":
        "Peticiones, quejas, reclamos y sugerencias, con radicado público."},
    {"name": "chatbot", "description":
        "Asistente de atención: responde con el catálogo real y, si hay "
        "clave configurada, con un proveedor de IA."},
]


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    """Se ejecuta al arrancar y al apagar el servidor."""
    check_connection()
    yield


app = FastAPI(
    title="PhoneStore API",
    description=DESCRIPCION,
    version="2.0.0",
    contact={"name": "PhoneStore", "email": "contacto@phonestore.com"},
    openapi_tags=ETIQUETAS,
    lifespan=ciclo_de_vida,
)

# Cabeceras de seguridad en todas las respuestas
app.add_middleware(SecurityHeadersMiddleware)

# CORS restringido a los orígenes configurados en .env (CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------------------------------------------------------------
# Manejadores de errores: siempre devuelven { ok: false, message, errors? }
# ---------------------------------------------------------------
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    body = {"ok": False, "message": exc.message}
    if exc.errors:
        body["errors"] = exc.errors
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=409,
        content={
            "ok": False,
            "message": "Ya existe un registro con esos datos (correo o documento duplicado).",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Pydantic devuelve una lista de errores; el Frontend espera el mismo
    # formato que usan las validaciones de negocio: { campo: "mensaje" }.
    errors = {}
    # Un model_validator compara varios campos a la vez, así que su
    # mensaje no cuelga de ninguno: ese sube al `message` de la respuesta.
    mensaje_general = ""
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
        campo = loc[-1] if loc else "campo"
        tipo = err.get("type", "")
        ctx = err.get("ctx", {}) or {}

        if tipo in ("value_error", "assertion_error"):
            # Mensaje escrito a mano en un field_validator/model_validator
            # de app/schemas.py. Pydantic lo entrega con el prefijo
            # "Value error, "; al cliente le sirve solo la frase.
            mensaje = str(err.get("msg", "")).replace("Value error, ", "", 1)
            if not mensaje:
                mensaje = "Valor inválido."
            if not loc:
                campo = "general"
                mensaje_general = mensaje_general or mensaje
        elif tipo in ("string_too_short", "too_short"):
            minimo = ctx.get("min_length") or ctx.get("min_length", 1)
            mensaje = f"Este campo debe tener al menos {minimo} caracteres."
        elif tipo in ("string_too_long", "too_long"):
            mensaje = f"Este campo debe tener máximo {ctx.get('max_length')} caracteres."
        elif tipo == "missing":
            mensaje = "Este campo es obligatorio."
        elif tipo in ("float_parsing", "float_type", "int_parsing", "int_type"):
            mensaje = "Este campo debe ser un valor numérico."
        elif tipo in ("greater_than", "greater_than_equal"):
            mensaje = f"El valor debe ser mayor que {ctx.get('gt', ctx.get('ge', 0))}."
        elif tipo in ("less_than", "less_than_equal"):
            mensaje = f"El valor debe ser menor que {ctx.get('lt', ctx.get('le', 0))}."
        else:
            mensaje = "Valor inválido."

        errors.setdefault(campo, mensaje)

    # 422 es el código que la propia especificación de FastAPI/OpenAPI usa
    # para "la petición está bien formada pero los datos no sirven". El
    # cuerpo mantiene el formato { ok, message, errors } de toda la API,
    # así que el Frontend sigue pintando el error debajo de cada campo.
    return JSONResponse(
        status_code=422,
        content={
            "ok": False,
            "message": mensaje_general or "Datos inválidos.",
            "errors": errors,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(status_code=404, content={"ok": False, "message": "Recurso no encontrado."})
    if exc.status_code == 405:
        return JSONResponse(
            status_code=405,
            content={"ok": False, "message": "Método HTTP no permitido para esta ruta."},
        )
    return JSONResponse(status_code=exc.status_code, content={"ok": False, "message": str(exc.detail)})


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    # No se filtra el detalle del error de base de datos al cliente:
    # se registra en el servidor y se responde un mensaje genérico.
    print(f"❌ Error de base de datos en {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"ok": False, "message": "Error al acceder a la base de datos."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print(f"❌ Error no controlado en {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"ok": False, "message": "Error interno del servidor."})


# ---------------------------------------------------------------
# Rutas base
# ---------------------------------------------------------------
@app.get("/", response_class=PlainTextResponse, include_in_schema=False)
def root():
    return "Backend PhoneStore funcionando. Documentación en /docs"


@app.get("/api/health", tags=["sistema"])
def health():
    return {"ok": True, "message": "API PhoneStore activa (FastAPI).", "version": app.version}


app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["usuarios"])
app.include_router(categorias.router, prefix="/api/categorias", tags=["categorias"])
app.include_router(productos.router, prefix="/api/productos", tags=["productos"])
app.include_router(servicios.router, prefix="/api/servicios", tags=["servicios"])
app.include_router(ventas.router, prefix="/api/ventas", tags=["ventas"])
app.include_router(inventario.router, prefix="/api/inventario", tags=["inventario"])
app.include_router(solicitudes.router, prefix="/api/solicitudes", tags=["solicitudes"])
app.include_router(contacto.router, prefix="/api/contacto", tags=["contacto"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])

# --- Quinto avance: facturacion, reportes, PQR y asistente ---
app.include_router(facturas.router, prefix="/api/facturas", tags=["facturas"])
app.include_router(reportes.router, prefix="/api/reportes", tags=["reportes"])
app.include_router(pqr.router, prefix="/api/pqr", tags=["pqr"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["chatbot"])


