# Asistente de atención al cliente.
#
#   POST /api/chatbot/mensaje        envía un turno y recibe la respuesta
#   GET  /api/chatbot/{clave}        recupera una conversación abierta
#   GET  /api/chatbot/estado/motor   qué motor está activo (para el panel)
#
# La conversación se identifica con una clave aleatoria que el navegador
# guarda. Así un visitante sin cuenta puede seguir su charla, y cuando hay
# sesión iniciada la conversación además queda enlazada al usuario.
#
# El cerebro vive en app/asistente.py: aquí solo se persisten los turnos y
# se resuelven permisos.

import secrets

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from starlette.concurrency import run_in_threadpool
from typing import Optional

from app.asistente import construir_ficha, ia_configurada, motor_actual, responder
from app.auth import auth_optional
from app.database import get_db
from app.errors import AppError
from app.models import Conversacion, MensajeChat
from app.schemas import ChatMensaje
from app.security import limite_chat
from app.serializers import conversacion_dict, mensaje_chat_dict
from app.validations import limpiar_texto

router = APIRouter()

MAX_TURNOS = 60  # tope por conversación, para no crecer sin control


def _buscar(db: Session, clave: str) -> Optional[Conversacion]:
    if not clave:
        return None
    return (
        db.query(Conversacion)
        .options(joinedload(Conversacion.mensajes))
        .filter(Conversacion.clave == clave)
        .first()
    )


@router.get("/estado/motor")
def estado_motor():
    """Qué motor responde ahora mismo.

    Sirve para que el panel muestre si la Inteligencia Artificial está
    conectada. Nunca devuelve la clave, solo el nombre del proveedor.
    """
    return {
        "ok": True,
        "motor": motor_actual(),
        "ia_activa": ia_configurada(),
        "descripcion": (
            "Respuestas generadas por Inteligencia Artificial."
            if ia_configurada()
            else "Respuestas basadas en el catalogo y las politicas de la tienda."
        ),
    }


def _abrir_turno(db: Session, texto: str, clave: str, current_user: Optional[dict]):
    """Busca o crea la conversación y reúne lo que necesita el motor."""
    conversacion = _buscar(db, clave)

    if not conversacion:
        conversacion = Conversacion(
            clave=secrets.token_urlsafe(32),
            id_usuario=current_user["id_usuario"] if current_user else None,
            titulo=texto[:80],
            motor=motor_actual(),
        )
        db.add(conversacion)
        db.flush()
    elif current_user and not conversacion.id_usuario:
        # La charla empezó sin sesión y el cliente entró después
        conversacion.id_usuario = current_user["id_usuario"]

    if len(conversacion.mensajes) >= MAX_TURNOS:
        raise AppError(
            429,
            "Esta conversación es muy larga. Empieza una nueva para seguir.",
        )

    historial = [
        {"autor": m.autor, "contenido": m.contenido} for m in conversacion.mensajes
    ]
    return conversacion, historial, construir_ficha(db)


def _cerrar_turno(db: Session, conversacion: Conversacion, texto: str,
                  respuesta: str, motor: str) -> dict:
    """Guarda los dos turnos (pregunta y respuesta) en una sola transacción."""
    db.add(MensajeChat(
        id_conversacion=conversacion.id_conversacion, autor="cliente", contenido=texto
    ))
    db.add(MensajeChat(
        id_conversacion=conversacion.id_conversacion,
        autor="asistente",
        contenido=respuesta,
    ))
    conversacion.motor = motor

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise AppError(500, "No se pudo guardar la conversación.")

    db.refresh(conversacion)
    return {
        "ok": True,
        "clave": conversacion.clave,
        "motor": motor,
        "respuesta": mensaje_chat_dict(conversacion.mensajes[-1]),
    }


@router.post(
    "/mensaje",
    dependencies=[Depends(limite_chat)],
    summary="Envía un mensaje al asistente y recibe la respuesta",
    response_description="La respuesta del asistente y la clave de la conversación.",
)
async def mensaje(
    body: ChatMensaje,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
):
    """Único endpoint asíncrono del proyecto, y por una razón concreta.

    Cuando hay una clave de IA configurada, responder implica una llamada
    HTTP a un proveedor externo que puede tardar varios segundos. Si el
    endpoint fuera síncrono, esa espera ocuparía un hilo del servidor y
    dejaría a los demás clientes esperando su turno.

    Al declararlo `async`, mientras se espera al proveedor el bucle de
    eventos atiende otras peticiones. Las partes que sí bloquean (las
    consultas con SQLAlchemy, que no es asíncrono, y la llamada al motor)
    se delegan a un hilo con `run_in_threadpool`, que es justo lo que no
    hay que hacer dentro de una corrutina: bloquearla.
    """
    texto = limpiar_texto(body.mensaje, 1000)
    if not texto:
        raise AppError(400, "Escribe un mensaje.", {"mensaje": "El mensaje está vacío."})

    conversacion, historial, ficha = await run_in_threadpool(
        _abrir_turno, db, texto, (body.clave or "").strip(), current_user
    )

    respuesta, motor = await run_in_threadpool(responder, texto, ficha, historial)

    return await run_in_threadpool(
        _cerrar_turno, db, conversacion, texto, respuesta, motor
    )


@router.get("/{clave}")
def historial(
    clave: str,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(auth_optional),
):
    """Recupera una conversación por su clave.

    La clave es larga y aleatoria, así que hace de contraseña: quien no la
    tenga no puede leer la charla de otra persona. Además, si la
    conversación pertenece a un usuario, solo ese usuario puede abrirla.
    """
    conversacion = _buscar(db, clave.strip())
    if not conversacion:
        raise AppError(404, "Esa conversación no existe.")

    if conversacion.id_usuario and (
        not current_user or current_user["id_usuario"] != conversacion.id_usuario
    ):
        raise AppError(403, "No tienes permiso para ver esta conversación.")

    return {"ok": True, "conversacion": conversacion_dict(conversacion)}
