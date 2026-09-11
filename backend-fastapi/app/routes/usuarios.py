# Gestión de usuarios desde el panel administrativo.
#
#   GET    /api/usuarios              admin/empleado (búsqueda, filtros, paginación)
#   GET    /api/usuarios/{id}         admin/empleado
#   POST   /api/usuarios              administrador
#   PUT    /api/usuarios/{id}         administrador
#   PATCH  /api/usuarios/{id}/estado  administrador
#   PATCH  /api/usuarios/{id}/rol     administrador
#   DELETE /api/usuarios/{id}         administrador
#
# Salvaguardas incluidas:
#   - Un administrador no puede desactivarse, cambiarse el rol ni
#     eliminarse a sí mismo (evita quedarse fuera del sistema).
#   - No se puede dejar el sistema sin ningún administrador activo.
#   - Un usuario con ventas registradas se desactiva en lugar de
#     borrarse, para no perder el histórico de compras.

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.auth import hash_password, require_role
from app.database import get_db
from app.errors import AppError
from app.models import Usuario, Venta
from app.schemas import (
    UsuarioActualizar,
    UsuarioCrear,
    UsuarioEstadoUpdate,
    UsuarioRolUpdate,
)
from app.serializers import usuario_safe
from app.validations import (
    REGEX,
    TIPOS_DOCUMENTO_VALIDOS,
    limpiar_texto,
    validate_registro,
)

router = APIRouter()

ROL_ADMIN = 1


def _find_by_id(db: Session, id_usuario) -> Optional[Usuario]:
    return (
        db.query(Usuario)
        .options(joinedload(Usuario.rol))
        .filter(Usuario.id_usuario == id_usuario)
        .first()
    )


def _find_by_email(db: Session, email: str, excepto: Optional[int] = None):
    query = db.query(Usuario).filter(Usuario.email == email)
    if excepto:
        query = query.filter(Usuario.id_usuario != excepto)
    return query.first()


def _admins_activos(db: Session, excepto: Optional[int] = None) -> int:
    query = db.query(Usuario).filter(
        Usuario.id_rol == ROL_ADMIN, Usuario.estado == "activo"
    )
    if excepto:
        query = query.filter(Usuario.id_usuario != excepto)
    return query.count()


def _bloquear_autogestion(id_objetivo: int, current_user: dict, accion: str):
    if id_objetivo == current_user.get("id_usuario"):
        raise AppError(
            400,
            f"No puedes {accion} tu propia cuenta mientras la estás usando.",
        )


# ---------------------------------------------------------------
# Consultas
# ---------------------------------------------------------------
@router.get("")
def listar(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role("administrador", "empleado")),
    buscar: Optional[str] = Query(default=None, max_length=120),
    rol: Optional[int] = Query(default=None, ge=1, le=3),
    estado: Optional[str] = Query(default=None, max_length=10),
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=10, ge=1, le=100),
):
    query = db.query(Usuario).options(joinedload(Usuario.rol))

    if buscar:
        patron = f"%{buscar.strip()}%"
        query = query.filter(
            or_(
                Usuario.nombre.like(patron),
                Usuario.apellido.like(patron),
                Usuario.email.like(patron),
                Usuario.numero_documento.like(patron),
            )
        )
    if rol:
        query = query.filter(Usuario.id_rol == rol)
    if estado in ("activo", "inactivo"):
        query = query.filter(Usuario.estado == estado)

    total = query.count()
    usuarios = (
        query.order_by(Usuario.id_usuario.desc())
        .offset((pagina - 1) * limite)
        .limit(limite)
        .all()
    )

    return {
        "ok": True,
        "usuarios": [usuario_safe(u) for u in usuarios],
        "paginacion": {
            "pagina": pagina,
            "limite": limite,
            "total": total,
            "total_paginas": max(1, (total + limite - 1) // limite),
        },
    }


@router.get("/{id_usuario}")
def obtener(
    id_usuario: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role("administrador", "empleado")),
):
    usuario = _find_by_id(db, id_usuario)
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    total_pedidos = db.query(Venta).filter(Venta.id_usuario == id_usuario).count()
    data = usuario_safe(usuario)
    data["total_pedidos"] = total_pedidos
    return {"ok": True, "usuario": data}


# ---------------------------------------------------------------
# Escritura (solo administrador)
# ---------------------------------------------------------------
@router.post("", status_code=201)
def crear(
    body: UsuarioCrear,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role("administrador")),
):
    # Se reutilizan exactamente las mismas reglas del registro público.
    is_valid, errors = validate_registro(body.model_dump())
    if not is_valid:
        raise AppError(400, "Datos inválidos.", errors)

    if body.id_rol is not None and body.id_rol not in (1, 2, 3):
        raise AppError(400, "Rol inválido.", {"id_rol": "Debe ser 1, 2 o 3."})
    if body.tipoDocumento not in TIPOS_DOCUMENTO_VALIDOS:
        raise AppError(400, "Tipo de documento inválido.", {"tipoDocumento": "Valor no permitido."})

    email = body.email.strip().lower()
    if _find_by_email(db, email):
        raise AppError(409, "El correo ya está registrado.", {"email": "Correo duplicado."})
    if db.query(Usuario).filter(Usuario.numero_documento == body.numeroDocumento).first():
        raise AppError(
            409,
            "El número de documento ya está registrado.",
            {"numeroDocumento": "Documento duplicado."},
        )

    usuario = Usuario(
        nombre=limpiar_texto(body.nombre, 40),
        apellido=limpiar_texto(body.apellido, 40),
        tipo_documento=body.tipoDocumento,
        numero_documento=body.numeroDocumento.strip(),
        direccion=limpiar_texto(body.direccion, 150),
        telefono=body.telefono.strip(),
        email=email,
        password_hash=hash_password(body.password),
        id_rol=body.id_rol or 3,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    usuario = _find_by_id(db, usuario.id_usuario)

    return {"ok": True, "message": "Usuario creado.", "usuario": usuario_safe(usuario)}


@router.put("/{id_usuario}")
def actualizar(
    id_usuario: int,
    body: UsuarioActualizar,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_role("administrador")),
):
    errors = {}
    if not REGEX["solo_letras"].match(body.nombre or ""):
        errors["nombre"] = "El nombre solo puede contener letras y espacios."
    if not REGEX["solo_letras"].match(body.apellido or ""):
        errors["apellido"] = "El apellido solo puede contener letras y espacios."
    if not REGEX["email"].match(body.email or ""):
        errors["email"] = "Correo electrónico inválido."
    if not REGEX["telefono"].match(body.telefono or ""):
        errors["telefono"] = "El teléfono debe tener entre 7 y 15 dígitos numéricos."
    if errors:
        raise AppError(400, "Datos inválidos.", errors)

    usuario = _find_by_id(db, id_usuario)
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    email = body.email.strip().lower()
    if _find_by_email(db, email, excepto=id_usuario):
        raise AppError(409, "Ese correo ya pertenece a otro usuario.", {"email": "Correo duplicado."})

    usuario.nombre = limpiar_texto(body.nombre, 40)
    usuario.apellido = limpiar_texto(body.apellido, 40)
    usuario.direccion = limpiar_texto(body.direccion, 150)
    usuario.telefono = body.telefono.strip()
    usuario.email = email
    db.commit()
    db.refresh(usuario)

    return {"ok": True, "message": "Usuario actualizado.", "usuario": usuario_safe(usuario)}


@router.patch("/{id_usuario}/estado")
def cambiar_estado(
    id_usuario: int,
    body: UsuarioEstadoUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    if body.estado not in ("activo", "inactivo"):
        raise AppError(400, "Estado inválido.", {"estado": "Debe ser 'activo' o 'inactivo'."})

    usuario = _find_by_id(db, id_usuario)
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    if body.estado == "inactivo":
        _bloquear_autogestion(id_usuario, current_user, "desactivar")
        if usuario.id_rol == ROL_ADMIN and _admins_activos(db, excepto=id_usuario) == 0:
            raise AppError(409, "Debe quedar al menos un administrador activo en el sistema.")

    usuario.estado = body.estado
    db.commit()
    db.refresh(usuario)

    return {
        "ok": True,
        "message": f"Usuario marcado como {body.estado}.",
        "usuario": usuario_safe(usuario),
    }


@router.patch("/{id_usuario}/rol")
def cambiar_rol(
    id_usuario: int,
    body: UsuarioRolUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    if body.id_rol not in (1, 2, 3):
        raise AppError(400, "Rol inválido.", {"id_rol": "Debe ser 1 (admin), 2 (empleado) o 3 (cliente)."})

    usuario = _find_by_id(db, id_usuario)
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    if body.id_rol != ROL_ADMIN:
        _bloquear_autogestion(id_usuario, current_user, "quitarle el rol de administrador a")
        if usuario.id_rol == ROL_ADMIN and _admins_activos(db, excepto=id_usuario) == 0:
            raise AppError(409, "Debe quedar al menos un administrador activo en el sistema.")

    usuario.id_rol = body.id_rol
    db.commit()
    db.refresh(usuario)
    usuario = _find_by_id(db, id_usuario)

    return {"ok": True, "message": "Rol actualizado.", "usuario": usuario_safe(usuario)}


@router.delete("/{id_usuario}")
def eliminar(
    id_usuario: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    usuario = _find_by_id(db, id_usuario)
    if not usuario:
        raise AppError(404, "Usuario no encontrado.")

    _bloquear_autogestion(id_usuario, current_user, "eliminar")

    if usuario.id_rol == ROL_ADMIN and _admins_activos(db, excepto=id_usuario) == 0:
        raise AppError(409, "Debe quedar al menos un administrador activo en el sistema.")

    tiene_ventas = db.query(Venta).filter(Venta.id_usuario == id_usuario).first() is not None
    if tiene_ventas:
        usuario.estado = "inactivo"
        db.commit()
        db.refresh(usuario)
        return {
            "ok": True,
            "message": (
                "El usuario tiene pedidos registrados, por eso se desactivó en lugar de "
                "eliminarse (así no se pierde el histórico de ventas)."
            ),
            "usuario": usuario_safe(usuario),
            "desactivado": True,
        }

    db.delete(usuario)
    db.commit()
    return {"ok": True, "message": "Usuario eliminado.", "desactivado": False}
