# Registro, inicio de sesión (con segundo paso opcional por correo),
# sesión actual, perfil propio, verificación de correo y recuperación
# de contraseña.

import os
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session, joinedload

from app.auth import (
    DOBLE_FACTOR_MAX_INTENTOS,
    DOBLE_FACTOR_TTL_MIN,
    VERIFICACION_TTL_MIN,
    auth_required,
    RESET_MAX_INTENTOS,
    generar_codigo_doble_factor,
    generar_codigo_reset,
    generar_token,
    generar_token_reset,
    generar_token_verificacion,
    hash_codigo,
    hash_password,
    hash_token_reset,
    verify_password,
)
from app.database import get_db
from app.errors import AppError
from app.mailer import (
    correo_doble_factor,
    correo_recuperacion,
    correo_verificacion,
    enviar_correo,
)
from app.models import CodigoVerificacion, PasswordReset, Usuario
from app.schemas import (
    CambioPassword,
    DobleFactorPreferencia,
    DobleFactorRequest,
    LoginRequest,
    PerfilActualizar,
    RecuperarPasswordRequest,
    ReenviarVerificacionRequest,
    RestablecerConCodigoRequest,
    RestablecerPasswordRequest,
    UsuarioRegistro,
    VerificarCorreoRequest,
)
from app.security import (
    limite_codigo,
    limite_codigo_reset,
    limite_login,
    limite_registro,
    limite_reset,
)
from app.serializers import usuario_safe
from app.validations import (
    limpiar_texto,
    validate_login,
    validate_password_nueva,
    validate_perfil,
    validate_registro,
)

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
RESET_TTL_MIN = int(os.getenv("RESET_TOKEN_TTL_MIN", "30"))


def _find_by_email(db: Session, email: str):
    return (
        db.query(Usuario)
        .options(joinedload(Usuario.rol))
        .filter(Usuario.email == email)
        .first()
    )


def _find_by_documento(db: Session, numero_documento: str):
    return db.query(Usuario).filter(Usuario.numero_documento == numero_documento).first()


def _find_by_id(db: Session, id_usuario: int):
    return (
        db.query(Usuario)
        .options(joinedload(Usuario.rol))
        .filter(Usuario.id_usuario == id_usuario)
        .first()
    )


def _invalidar_codigos(db: Session, id_usuario: int, tipo: str):
    """Deja sin efecto los códigos vivos de ese tipo.

    Así el usuario solo tiene un código válido a la vez: pedir uno nuevo
    anula el anterior y no quedan varios abiertos.
    """
    db.query(CodigoVerificacion).filter(
        CodigoVerificacion.id_usuario == id_usuario,
        CodigoVerificacion.tipo == tipo,
        CodigoVerificacion.usado == False,  # noqa: E712
    ).update({"usado": True})


def _enviar_verificacion_correo(db: Session, usuario: Usuario) -> bool:
    """Genera el enlace de confirmación y lo manda por correo."""
    _invalidar_codigos(db, usuario.id_usuario, "correo")

    token_plano, token_hash, expira = generar_token_verificacion()
    db.add(
        CodigoVerificacion(
            id_usuario=usuario.id_usuario,
            tipo="correo",
            codigo_hash=token_hash,
            expira_en=expira,
        )
    )
    db.commit()

    enlace = f"{FRONTEND_URL}/verificar-correo?token={token_plano}"
    asunto, cuerpo, html = correo_verificacion(
        usuario.nombre, enlace, VERIFICACION_TTL_MIN // 60
    )
    return enviar_correo(usuario.email, asunto, cuerpo, html)


def _iniciar_doble_factor(db: Session, usuario: Usuario) -> str:
    """Crea el código de 6 dígitos, lo envía y devuelve el desafío."""
    _invalidar_codigos(db, usuario.id_usuario, "doble_factor")

    codigo, codigo_hash, desafio, expira = generar_codigo_doble_factor()
    db.add(
        CodigoVerificacion(
            id_usuario=usuario.id_usuario,
            tipo="doble_factor",
            codigo_hash=codigo_hash,
            desafio=desafio,
            expira_en=expira,
        )
    )
    db.commit()

    asunto, cuerpo, html = correo_doble_factor(usuario.nombre, codigo, DOBLE_FACTOR_TTL_MIN)
    enviar_correo(usuario.email, asunto, cuerpo, html)
    return desafio


def _ocultar_correo(email: str) -> str:
    """Devuelve a***o@dominio.com: confirma la cuenta sin publicarla entera."""
    usuario, _, dominio = (email or "").partition("@")
    if len(usuario) <= 2:
        visible = usuario[:1] + "*"
    else:
        visible = usuario[0] + "*" * (len(usuario) - 2) + usuario[-1]
    return visible + "@" + dominio if dominio else visible


def _sesion_iniciada(usuario: Usuario) -> dict:
    """Respuesta común cuando el login termina bien."""
    token = generar_token({
        "id_usuario": usuario.id_usuario,
        "email": usuario.email,
        "rol": usuario.rol.nombre,
        "id_rol": usuario.id_rol,
    })
    return {
        "ok": True,
        "message": "Inicio de sesión exitoso.",
        "token": token,
        "usuario": usuario_safe(usuario),
    }


# ---------------------------------------------------------------
# Registro e inicio de sesión
# ---------------------------------------------------------------
@router.post("/register", status_code=201, dependencies=[Depends(limite_registro)])
def register(body: UsuarioRegistro, db: Session = Depends(get_db)):
    # 1) Pydantic ya garantizó tipos y que ningún campo llegue vacío.
    # 2) Reglas de negocio adicionales (formato, longitudes, regex).
    datos = body.model_dump()
    is_valid, errors = validate_registro(datos)
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    email = body.email.strip().lower()
    numero_documento = body.numeroDocumento.strip()

    if _find_by_email(db, email):
        raise AppError(
            409,
            "Ya existe una cuenta registrada con ese correo electrónico.",
            {"email": "Correo ya registrado."},
        )
    if _find_by_documento(db, numero_documento):
        raise AppError(
            409,
            "Ya existe una cuenta registrada con ese número de documento.",
            {"numeroDocumento": "Documento ya registrado."},
        )

    nuevo = Usuario(
        nombre=limpiar_texto(body.nombre, 40),
        apellido=limpiar_texto(body.apellido, 40),
        tipo_documento=body.tipoDocumento,
        numero_documento=numero_documento,
        direccion=limpiar_texto(body.direccion, 150),
        telefono=body.telefono.strip(),
        email=email,
        password_hash=hash_password(body.password),
        id_rol=3,  # Cliente por defecto: el rol NUNCA se acepta desde el registro público
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    nuevo = _find_by_id(db, nuevo.id_usuario)

    # Correo de confirmacion de la cuenta. La sesion se entrega igual para
    # no dejar al usuario fuera; lo que queda pendiente es la marca
    # `email_verificado`, que el frontend muestra hasta que la confirme.
    enviado = _enviar_verificacion_correo(db, nuevo)

    respuesta = _sesion_iniciada(nuevo)
    respuesta["message"] = (
        "Registro exitoso. Te enviamos un correo para confirmar tu cuenta."
    )
    respuesta["verificacion_enviada"] = enviado
    return respuesta


@router.post("/login", dependencies=[Depends(limite_login)])
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    datos = body.model_dump()
    is_valid, errors = validate_login(datos)
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    usuario = _find_by_email(db, body.email.strip().lower())

    # Mismo mensaje para "no existe" y "contraseña incorrecta": así no se
    # puede averiguar qué correos están registrados probando el login.
    # Cada fallo suma al contador anti-fuerza bruta; un acierto lo borra.
    if not usuario or not verify_password(body.password, usuario.password_hash):
        limite_login.registrar_fallo(request)
        raise AppError(401, "Correo o contraseña incorrectos.")

    if usuario.estado == "inactivo":
        raise AppError(403, "Tu cuenta se encuentra inactiva. Contacta al administrador.")

    limite_login.limpiar(request)

    # Segundo paso: si la cuenta lo tiene activado, aquí NO se entrega el
    # JWT. Solo sale un desafío público; la sesión se emite cuando llegue
    # el código correcto a /verificar-doble-factor.
    if usuario.doble_factor:
        desafio = _iniciar_doble_factor(db, usuario)
        correo_oculto = _ocultar_correo(usuario.email)
        return {
            "ok": True,
            "requiere_doble_factor": True,
            "desafio": desafio,
            "email_parcial": correo_oculto,
            "minutos": DOBLE_FACTOR_TTL_MIN,
            "message": (
                f"Enviamos un código de 6 dígitos a {correo_oculto}. "
                f"Caduca en {DOBLE_FACTOR_TTL_MIN} minutos."
            ),
        }

    return _sesion_iniciada(usuario)


@router.post("/verificar-doble-factor", dependencies=[Depends(limite_codigo)])
def verificar_doble_factor(
    request: Request, body: DobleFactorRequest, db: Session = Depends(get_db)
):
    """Segundo paso del login: cambia el código de 6 dígitos por el JWT."""
    registro = (
        db.query(CodigoVerificacion)
        .filter(
            CodigoVerificacion.desafio == body.desafio,
            CodigoVerificacion.tipo == "doble_factor",
            CodigoVerificacion.usado == False,  # noqa: E712
        )
        .order_by(CodigoVerificacion.id_codigo.desc())
        .first()
    )

    if not registro or registro.expira_en < datetime.now():
        limite_codigo.registrar_fallo(request)
        raise AppError(400, "El código caducó o no es válido. Inicia sesión otra vez.")

    # Tope de intentos: sin él, seis dígitos se adivinan probando.
    if registro.intentos >= DOBLE_FACTOR_MAX_INTENTOS:
        registro.usado = True
        db.commit()
        limite_codigo.registrar_fallo(request)
        raise AppError(429, "Demasiados intentos. Inicia sesión otra vez.")

    if registro.codigo_hash != hash_codigo(body.codigo.strip()):
        registro.intentos += 1
        db.commit()
        limite_codigo.registrar_fallo(request)
        restantes = max(0, DOBLE_FACTOR_MAX_INTENTOS - registro.intentos)
        raise AppError(
            401,
            f"Código incorrecto. Te quedan {restantes} intentos.",
            {"codigo": "Código incorrecto."},
        )

    usuario = _find_by_id(db, registro.id_usuario)
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")
    if usuario.estado == "inactivo":
        raise AppError(403, "Tu cuenta se encuentra inactiva. Contacta al administrador.")

    registro.usado = True
    db.commit()
    limite_codigo.limpiar(request)

    return _sesion_iniciada(usuario)


# ---------------------------------------------------------------
# Verificación del correo electrónico
# ---------------------------------------------------------------
@router.post("/verificar-correo", dependencies=[Depends(limite_codigo)])
def verificar_correo(body: VerificarCorreoRequest, db: Session = Depends(get_db)):
    """Consume el enlace enviado al registrarse y marca el correo como válido."""
    registro = (
        db.query(CodigoVerificacion)
        .filter(
            CodigoVerificacion.codigo_hash == hash_codigo(body.token),
            CodigoVerificacion.tipo == "correo",
            CodigoVerificacion.usado == False,  # noqa: E712
        )
        .order_by(CodigoVerificacion.id_codigo.desc())
        .first()
    )

    if not registro or registro.expira_en < datetime.now():
        raise AppError(
            400, "El enlace de verificación no es válido o ya caducó. Solicita uno nuevo."
        )

    usuario = _find_by_id(db, registro.id_usuario)
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    usuario.email_verificado = True
    registro.usado = True
    db.commit()
    db.refresh(usuario)

    return {
        "ok": True,
        "message": "Correo verificado correctamente.",
        "usuario": usuario_safe(usuario),
    }


@router.post("/reenviar-verificacion", dependencies=[Depends(limite_reset)])
def reenviar_verificacion(
    body: ReenviarVerificacionRequest, db: Session = Depends(get_db)
):
    """Vuelve a enviar el enlace de confirmación.

    Responde siempre lo mismo, exista o no la cuenta, para no revelar qué
    correos están registrados.
    """
    usuario = _find_by_email(db, (body.email or "").strip().lower())

    if usuario and usuario.estado == "activo" and not usuario.email_verificado:
        _enviar_verificacion_correo(db, usuario)

    return {
        "ok": True,
        "message": (
            "Si el correo está registrado y aún no se ha confirmado, "
            "enviamos un enlace nuevo."
        ),
    }


@router.put("/doble-factor")
def cambiar_doble_factor(
    body: DobleFactorPreferencia,
    current_user: dict = Depends(auth_required),
    db: Session = Depends(get_db),
):
    """Activa o desactiva el segundo paso para la propia cuenta.

    El id sale del token, nunca del body: nadie puede tocar la
    configuración de seguridad de otra persona.
    """
    usuario = _find_by_id(db, current_user["id_usuario"])
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    if body.activo and not usuario.email_verificado:
        raise AppError(
            400,
            "Confirma primero tu correo electrónico: el código del segundo "
            "paso se envía a esa dirección.",
        )

    usuario.doble_factor = bool(body.activo)
    db.commit()
    db.refresh(usuario)

    return {
        "ok": True,
        "message": (
            "Verificación en dos pasos activada."
            if usuario.doble_factor
            else "Verificación en dos pasos desactivada."
        ),
        "usuario": usuario_safe(usuario),
    }


@router.get("/me")
def me(current_user: dict = Depends(auth_required), db: Session = Depends(get_db)):
    usuario = _find_by_id(db, current_user["id_usuario"])
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")
    if usuario.estado == "inactivo":
        raise AppError(403, "Tu cuenta se encuentra inactiva. Contacta al administrador.")
    return {"ok": True, "usuario": usuario_safe(usuario)}


# ---------------------------------------------------------------
# Perfil propio (cualquier rol, solo sobre su propia cuenta)
# ---------------------------------------------------------------
@router.put("/perfil")
def actualizar_perfil(
    body: PerfilActualizar,
    current_user: dict = Depends(auth_required),
    db: Session = Depends(get_db),
):
    is_valid, errors = validate_perfil(body.model_dump())
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    # El id se toma del token, no del body: nadie puede editar el perfil de otro.
    usuario = _find_by_id(db, current_user["id_usuario"])
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    usuario.nombre = limpiar_texto(body.nombre, 40)
    usuario.apellido = limpiar_texto(body.apellido, 40)
    usuario.direccion = limpiar_texto(body.direccion, 150)
    usuario.telefono = body.telefono.strip()
    db.commit()
    db.refresh(usuario)

    return {"ok": True, "message": "Perfil actualizado.", "usuario": usuario_safe(usuario)}


@router.put("/password")
def cambiar_password(
    body: CambioPassword,
    current_user: dict = Depends(auth_required),
    db: Session = Depends(get_db),
):
    is_valid, errors = validate_password_nueva(body.passwordNueva)
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    usuario = _find_by_id(db, current_user["id_usuario"])
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    if not verify_password(body.passwordActual, usuario.password_hash):
        raise AppError(
            400,
            "La contraseña actual no es correcta.",
            {"passwordActual": "Contraseña incorrecta."},
        )

    usuario.password_hash = hash_password(body.passwordNueva)
    db.commit()

    return {"ok": True, "message": "Contraseña actualizada correctamente."}


# ---------------------------------------------------------------
# Recuperación de contraseña
# ---------------------------------------------------------------
def _aplicar_password_nueva(db: Session, usuario, registro, password: str):
    """Guarda la contraseña nueva y cierra la solicitud de recuperación.

    El registro queda marcado como usado para que ni el enlace ni el código
    del mismo correo sirvan una segunda vez.
    """
    usuario.password_hash = hash_password(password)
    registro.usado = True
    db.commit()


@router.post("/recuperar-password", dependencies=[Depends(limite_reset)])
def recuperar_password(body: RecuperarPasswordRequest, db: Session = Depends(get_db)):
    """Genera un token de un solo uso y lo envía por correo.

    La respuesta es siempre la misma exista o no la cuenta, para no
    revelar qué correos están registrados. El enlace nunca se devuelve
    en el JSON: sale por correo (o queda en el log del servidor cuando
    no hay SMTP configurado).
    """
    email = (body.email or "").strip().lower()
    usuario = _find_by_email(db, email)

    if usuario and usuario.estado == "activo":
        # Invalida los tokens anteriores del usuario
        db.query(PasswordReset).filter(
            PasswordReset.id_usuario == usuario.id_usuario,
            PasswordReset.usado == False,  # noqa: E712
        ).update({"usado": True})

        token_plano, token_hash, expira = generar_token_reset()
        codigo, codigo_hash = generar_codigo_reset()
        db.add(
            PasswordReset(
                id_usuario=usuario.id_usuario,
                token_hash=token_hash,
                codigo_hash=codigo_hash,
                expira_en=expira,
            )
        )
        db.commit()

        enlace = f"{FRONTEND_URL}/recuperar-contrasena?token={token_plano}"
        asunto, cuerpo, html = correo_recuperacion(
            usuario.nombre, enlace, RESET_TTL_MIN, codigo
        )
        enviar_correo(usuario.email, asunto, cuerpo, html)

    return {
        "ok": True,
        "message": (
            "Si el correo está registrado, enviamos las instrucciones para "
            "restablecer la contraseña."
        ),
    }


@router.post("/restablecer-password", dependencies=[Depends(limite_reset)])
def restablecer_password(body: RestablecerPasswordRequest, db: Session = Depends(get_db)):
    is_valid, errors = validate_password_nueva(body.password)
    if not is_valid:
        raise AppError(400, "Datos inválidos.", {"password": errors["passwordNueva"]})

    token_hash = hash_token_reset(body.token)
    registro = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.token_hash == token_hash,
            PasswordReset.usado == False,  # noqa: E712
        )
        .order_by(PasswordReset.id_reset.desc())
        .first()
    )

    if not registro or registro.expira_en < datetime.now():
        raise AppError(
            400, "El enlace de recuperación no es válido o ya caducó. Solicita uno nuevo."
        )

    usuario = _find_by_id(db, registro.id_usuario)
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    _aplicar_password_nueva(db, usuario, registro, body.password)

    return {
        "ok": True,
        "message": "Contraseña restablecida. Ya puedes iniciar sesión con la nueva contraseña.",
    }


@router.post("/restablecer-con-codigo", dependencies=[Depends(limite_codigo_reset)])
def restablecer_con_codigo(
    request: Request, body: RestablecerConCodigoRequest, db: Session = Depends(get_db)
):
    """Cambia la contraseña con el código de 6 dígitos del correo.

    Es el otro camino del mismo correo: quien prefiere no abrir el enlace
    escribe aquí su correo, el código y la contraseña nueva. Pide el correo
    además del código para que seis dígitos no basten por sí solos.
    """
    is_valid, errors = validate_password_nueva(body.password)
    if not is_valid:
        raise AppError(400, "Datos inválidos.", {"password": errors["passwordNueva"]})

    usuario = _find_by_email(db, (body.email or "").strip().lower())
    generico = "El código no es válido o ya caducó. Solicita uno nuevo."

    registro = None
    if usuario:
        registro = (
            db.query(PasswordReset)
            .filter(
                PasswordReset.id_usuario == usuario.id_usuario,
                PasswordReset.usado == False,  # noqa: E712
                PasswordReset.codigo_hash.isnot(None),
            )
            .order_by(PasswordReset.id_reset.desc())
            .first()
        )

    if not usuario or not registro or registro.expira_en < datetime.now():
        limite_codigo_reset.registrar_fallo(request)
        raise AppError(400, generico, {"codigo": "Código inválido o caducado."})

    # Tope de intentos: sin él, seis dígitos se adivinan probando.
    if registro.intentos >= RESET_MAX_INTENTOS:
        registro.usado = True
        db.commit()
        limite_codigo_reset.registrar_fallo(request)
        raise AppError(429, "Demasiados intentos. Solicita un código nuevo.")

    if registro.codigo_hash != hash_token_reset(body.codigo.strip()):
        registro.intentos += 1
        db.commit()
        limite_codigo_reset.registrar_fallo(request)
        restantes = max(0, RESET_MAX_INTENTOS - registro.intentos)
        raise AppError(
            400,
            f"El código no coincide. Te quedan {restantes} intentos.",
            {"codigo": "Código incorrecto."},
        )

    _aplicar_password_nueva(db, usuario, registro, body.password)

    return {
        "ok": True,
        "message": "Contraseña restablecida. Ya puedes iniciar sesión con la nueva contraseña.",
    }
