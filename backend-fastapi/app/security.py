# Capa transversal de seguridad de la API.
#
#   - SecurityHeadersMiddleware: cabeceras de seguridad en cada respuesta.
#   - RateLimiter: límite de intentos por IP para endpoints sensibles
#     (login, registro, recuperación de contraseña, contacto).
#   - cors_origins(): orígenes permitidos, configurables por .env.
#
# El límite de intentos vive en memoria del proceso. Es suficiente para
# este proyecto (un solo servidor) y frena la fuerza bruta contra el
# login sin añadir dependencias externas como Redis.

import os
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.errors import AppError

DEFAULT_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:4173,http://127.0.0.1:4173"
)


def cors_origins() -> list[str]:
    """Orígenes autorizados a consumir la API.

    Se configuran con CORS_ORIGINS en .env (separados por coma). Por
    defecto solo el servidor de desarrollo de Vite: mucho más seguro
    que abrir la API a cualquier dominio.
    """
    valor = os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS)
    return [origen.strip() for origen in valor.split(",") if origen.strip()]


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Añade cabeceras de seguridad estándar a todas las respuestas."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
        )
        # La API solo devuelve JSON: no debe poder cargar ni ejecutar nada.
        if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
            response.headers.setdefault(
                "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
            )
        return response


RATE_LIMIT_ACTIVO = os.getenv("RATE_LIMIT_ENABLED", "true").strip().lower() not in (
    "false",
    "0",
    "no",
)


class RateLimiter:
    """Dependencia de FastAPI que limita peticiones por IP.

    Tiene dos modos:

      - `solo_fallos=False` (por defecto): cada petición cuenta. Sirve
        para frenar spam de formularios (contacto, registro, compras).

      - `solo_fallos=True`: la dependencia solo comprueba el contador;
        es la ruta la que llama a `registrar_fallo()` cuando las
        credenciales son incorrectas y a `limpiar()` cuando el usuario
        acierta. Así se bloquea la fuerza bruta sin castigar a quien
        inicia sesión correctamente varias veces.

    Uso:
        limite_login = RateLimiter(10, 300, "login", solo_fallos=True)

        @router.post("/login", dependencies=[Depends(limite_login)])
    """

    _registros: Dict[str, Deque[float]] = defaultdict(deque)

    def __init__(
        self,
        max_intentos: int,
        ventana_segundos: int,
        nombre: str = "global",
        solo_fallos: bool = False,
    ):
        self.max_intentos = max_intentos
        self.ventana = ventana_segundos
        self.nombre = nombre
        self.solo_fallos = solo_fallos

    def _clave(self, request: Request) -> str:
        ip = request.client.host if request.client else "desconocida"
        return f"{self.nombre}:{ip}"

    def _intentos_vigentes(self, clave: str) -> Deque[float]:
        ahora = time.time()
        intentos = RateLimiter._registros[clave]
        while intentos and ahora - intentos[0] > self.ventana:
            intentos.popleft()
        return intentos

    def __call__(self, request: Request):
        if not RATE_LIMIT_ACTIVO:
            return

        clave = self._clave(request)
        intentos = self._intentos_vigentes(clave)

        if len(intentos) >= self.max_intentos:
            espera = int(self.ventana - (time.time() - intentos[0])) + 1
            raise AppError(
                429,
                f"Demasiados intentos. Espera {espera} segundos antes de volver a intentarlo.",
            )

        if not self.solo_fallos:
            intentos.append(time.time())

    def registrar_fallo(self, request: Request):
        """Suma un intento fallido (solo para los límites de tipo `solo_fallos`)."""
        if not RATE_LIMIT_ACTIVO:
            return
        clave = self._clave(request)
        self._intentos_vigentes(clave).append(time.time())

    def limpiar(self, request: Request):
        """Borra el contador de esa IP tras un intento exitoso."""
        RateLimiter._registros.pop(self._clave(request), None)

    @classmethod
    def reiniciar(cls):
        """Limpia todos los contadores."""
        cls._registros.clear()


# Límites aplicados en las rutas
limite_login = RateLimiter(8, 300, "login", solo_fallos=True)
limite_reset = RateLimiter(8, 900, "reset", solo_fallos=False)
limite_registro = RateLimiter(15, 600, "registro", solo_fallos=False)
limite_codigo = RateLimiter(10, 600, "codigo", solo_fallos=True)
# Probar codigos de recuperacion se cuenta aparte de pedirlos: quien falla
# una vez no deberia quedarse sin poder solicitar otro correo.
limite_codigo_reset = RateLimiter(10, 900, "reset_codigo", solo_fallos=True)
# El asistente responde a visitantes sin cuenta: se limita por si acaso,
# pero con holgura para que una conversacion normal no se corte.
limite_chat = RateLimiter(30, 300, "chat", solo_fallos=False)
limite_contacto = RateLimiter(10, 600, "contacto", solo_fallos=False)
limite_compra = RateLimiter(30, 300, "compra", solo_fallos=False)
