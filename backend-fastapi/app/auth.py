# Utilidades de autenticación y autorización.
#
#   - Hashing de contraseñas con bcrypt (nunca texto plano).
#   - Emisión y verificación de JWT.
#   - Dependencias de FastAPI para proteger endpoints:
#       auth_required  -> exige sesión válida
#       auth_optional  -> no bloquea si no hay token
#       require_role   -> exige sesión + rol permitido
#   - Tokens de un solo uso para recuperar contraseña.

import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, Header
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.errors import AppError

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
JWT_EXPIRES_IN = os.getenv("JWT_EXPIRES_IN", "1d")
ALGORITHM = "HS256"

# Si no hay secreto configurado se genera uno aleatorio en memoria: el
# servidor sigue funcionando, pero las sesiones se invalidan al
# reiniciar. Es preferible a dejar una clave por defecto conocida.
if not JWT_SECRET or len(JWT_SECRET) < 16:
    JWT_SECRET = secrets.token_urlsafe(48)
    print(
        "⚠️  JWT_SECRET no está configurado (o es muy corto) en .env. "
        "Se generó una clave temporal: las sesiones se cerrarán al reiniciar el servidor."
    )

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=10)


# ---------------------------------------------------------------
# Contraseñas
# ---------------------------------------------------------------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:  # noqa: BLE001 - hash corrupto o formato inesperado
        return False


# ---------------------------------------------------------------
# JWT
# ---------------------------------------------------------------
def _parse_expires_in(value: str) -> timedelta:
    """Traduce strings tipo '1d', '12h', '30m', '3600' a un timedelta."""
    value = str(value).strip()
    match = re.fullmatch(r"(\d+)\s*([smhd]?)", value)
    if not match:
        return timedelta(days=1)
    amount, unit = match.groups()
    amount = int(amount)
    if unit == "s" or unit == "":
        return timedelta(seconds=amount)
    if unit == "m":
        return timedelta(minutes=amount)
    if unit == "h":
        return timedelta(hours=amount)
    return timedelta(days=amount)


def generar_token(usuario: dict) -> str:
    """usuario debe tener: id_usuario, email, rol, id_rol"""
    expira = datetime.now(timezone.utc) + _parse_expires_in(JWT_EXPIRES_IN)
    payload = {
        "id_usuario": usuario["id_usuario"],
        "email": usuario["email"],
        "rol": usuario["rol"],
        "id_rol": usuario["id_rol"],
        "exp": expira,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def verificar_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])


def _extraer_token(authorization: Optional[str]):
    authorization = authorization or ""
    partes = authorization.split(" ")
    if len(partes) == 2 and partes[0] == "Bearer" and partes[1]:
        return partes[1]
    return None


# ---------------------------------------------------------------
# Dependencias de protección de endpoints
# ---------------------------------------------------------------
def auth_required(authorization: Optional[str] = Header(default=None)) -> dict:
    """Exige un token JWT válido. Sin él, la petición no llega a la ruta."""
    token = _extraer_token(authorization)
    if not token:
        raise AppError(401, "No autorizado. Debes iniciar sesión.")
    try:
        return verificar_token(token)
    except JWTError:
        raise AppError(401, "Token inválido o expirado. Inicia sesión nuevamente.")


def auth_optional(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    """No bloquea si falta o es inválido el token (rutas públicas enriquecidas)."""
    token = _extraer_token(authorization)
    if not token:
        return None
    try:
        return verificar_token(token)
    except JWTError:
        return None


def require_role(*roles_permitidos: str):
    """Fábrica de dependencia: exige sesión + uno de los roles indicados.

    Uso: current_user: dict = Depends(require_role("administrador", "empleado"))

    Esta es la autorización DEFINITIVA: aunque el Frontend oculte un
    botón o alguien escriba la URL a mano, sin el rol correcto la API
    responde 403 y la operación nunca se ejecuta.
    """

    def dependency(current_user: dict = Depends(auth_required)) -> dict:
        if current_user.get("rol") not in roles_permitidos:
            raise AppError(403, "No tienes permisos para acceder a este recurso.")
        return current_user

    return dependency


# ---------------------------------------------------------------
# Recuperación de contraseña
# ---------------------------------------------------------------
RESET_TOKEN_TTL_MIN = int(os.getenv("RESET_TOKEN_TTL_MIN", "30"))


def generar_token_reset() -> tuple[str, str, datetime]:
    """Devuelve (token_plano, token_hash, fecha_expiracion).

    En la base de datos solo se guarda el hash, igual que con una
    contraseña: si alguien lograra leer la tabla, no podría usar los
    tokens pendientes.
    """
    token_plano = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token_plano.encode("utf-8")).hexdigest()
    expira = datetime.now() + timedelta(minutes=RESET_TOKEN_TTL_MIN)
    return token_plano, token_hash, expira


def hash_token_reset(token_plano: str) -> str:
    return hashlib.sha256(str(token_plano).encode("utf-8")).hexdigest()


RESET_MAX_INTENTOS = int(os.getenv("RESET_MAX_INTENTOS", "5"))


def generar_codigo_reset() -> tuple[str, str]:
    """Código de 6 dígitos que acompaña al enlace: (código, hash).

    Se guarda hasheado igual que el token. Seis dígitos son pocos, así que
    lo que lo protege es la caducidad corta y el tope de intentos.
    """
    codigo = f"{secrets.randbelow(1_000_000):06d}"
    return codigo, hash_token_reset(codigo)


# ---------------------------------------------------------------
# Verificación de correo y segundo factor
# ---------------------------------------------------------------
VERIFICACION_TTL_MIN = int(os.getenv("VERIFICACION_TOKEN_TTL_MIN", "1440"))  # 24 h
DOBLE_FACTOR_TTL_MIN = int(os.getenv("DOBLE_FACTOR_TTL_MIN", "10"))
DOBLE_FACTOR_MAX_INTENTOS = int(os.getenv("DOBLE_FACTOR_MAX_INTENTOS", "5"))


def hash_codigo(valor: str) -> str:
    """Mismo tratamiento que un token de recuperación: solo se guarda el hash."""
    return hashlib.sha256(str(valor).encode("utf-8")).hexdigest()


def generar_token_verificacion() -> tuple[str, str, datetime]:
    """Enlace de confirmación de la cuenta: (token, hash, caducidad)."""
    token_plano = secrets.token_urlsafe(32)
    return (
        token_plano,
        hash_codigo(token_plano),
        datetime.now() + timedelta(minutes=VERIFICACION_TTL_MIN),
    )


def generar_codigo_doble_factor() -> tuple[str, str, str, datetime]:
    """Segundo paso del login: (código, hash, desafío, caducidad).

    El código es de 6 dígitos porque se teclea a mano; lo que compensa su
    corta longitud es la caducidad de pocos minutos y el tope de intentos.
    El desafío es largo y aleatorio: identifica el intento de sesión sin
    exponer a qué usuario pertenece.
    """
    codigo = f"{secrets.randbelow(1_000_000):06d}"
    desafio = secrets.token_urlsafe(32)
    return (
        codigo,
        hash_codigo(codigo),
        desafio,
        datetime.now() + timedelta(minutes=DOBLE_FACTOR_TTL_MIN),
    )
