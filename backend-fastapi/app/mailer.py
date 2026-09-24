# Envío de correos del sistema: verificación de la cuenta, código del
# segundo paso del login y recuperación de contraseña.
#
# Funciona en tres modos, según lo que haya en .env, en este orden:
#
#   1. RESEND_API_KEY configurada:
#      el correo sale por la API HTTPS de Resend (https://resend.com).
#      Es el modo recomendado para producción: plataformas como Railway
#      bloquean las conexiones SMTP salientes (puertos 25/465/587) como
#      medida antispam, así que un Gmail u otro proveedor por SMTP nunca
#      llega a conectar ahí, aunque las credenciales sean correctas. Al
#      viajar por HTTPS (puerto 443), Resend sí atraviesa ese bloqueo.
#
#   2. SMTP configurado (SMTP_HOST, SMTP_USER, SMTP_PASSWORD):
#      funciona en local o en cualquier host que no bloquee SMTP.
#
#   3. Ninguno de los dos configurado (caso habitual en desarrollo):
#      el mensaje se imprime en la consola del backend y se guarda en
#      backend-fastapi/correos_enviados.log.
#
# En ningún caso el enlace o el código viajan en la respuesta HTTP: si lo
# hicieran, cualquiera podría pedir el enlace de otra persona desde el
# navegador y tomar su cuenta.

import os
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
RESEND_FROM = os.getenv("RESEND_FROM", "PhoneStore <onboarding@resend.dev>").strip()

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587") or 587)
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@phonestore.com").strip()

# Un servidor de pruebas local no pide usuario ni TLS. Con esta variable
# el envío real se puede comprobar sin credenciales de ningún proveedor.
SMTP_TLS = os.getenv("SMTP_TLS", "1").strip().lower() not in ("0", "false", "no")

# Dominios que nunca reciben correo real, aunque el SMTP esté configurado.
# Las pruebas automatizadas crean cuentas en dominios inventados; sin esta
# lista, cada ejecución intentaría entregarles correo de verdad y el
# proveedor devolvería un rebote por cada una.
DOMINIOS_SIN_ENVIO = tuple(
    d.strip().lower()
    for d in os.getenv("SMTP_DOMINIOS_SIN_ENVIO", "phonestore.com,example.com").split(",")
    if d.strip()
)

LOG_PATH = Path(__file__).resolve().parent.parent / "correos_enviados.log"


def resend_configurado() -> bool:
    return bool(RESEND_API_KEY)


def smtp_configurado() -> bool:
    """Basta con el host: usuario y contraseña solo hacen falta si el
    servidor los exige (los de pruebas en localhost no lo hacen)."""
    return bool(SMTP_HOST)


def es_dominio_de_pruebas(destinatario: str) -> bool:
    dominio = (destinatario or "").rsplit("@", 1)[-1].strip().lower()
    return dominio in DOMINIOS_SIN_ENVIO


def _registrar_en_log(destinatario: str, asunto: str, cuerpo: str, enviado: bool, medio: str = ""):
    marca = f"ENVIADO POR {medio}" if enviado else "NO ENVIADO (sin proveedor de correo configurado)"
    bloque = (
        f"\n{'=' * 70}\n"
        f"[{datetime.now().isoformat(sep=' ', timespec='seconds')}] {marca}\n"
        f"Para: {destinatario}\n"
        f"Asunto: {asunto}\n"
        f"{'-' * 70}\n{cuerpo}\n{'=' * 70}\n"
    )
    try:
        with LOG_PATH.open("a", encoding="utf-8") as archivo:
            archivo.write(bloque)
    except OSError:
        pass
    print(bloque)


def _enviar_por_resend(destinatario: str, asunto: str, cuerpo: str, html: str) -> bool:
    try:
        respuesta = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={
                "from": RESEND_FROM,
                "to": [destinatario],
                "subject": asunto,
                "text": cuerpo,
                **({"html": html} if html else {}),
            },
            timeout=15,
        )
        if respuesta.status_code >= 400:
            print(f"❌ Resend rechazó el correo a {destinatario}: {respuesta.status_code} {respuesta.text}")
            return False
        return True
    except Exception as error:  # noqa: BLE001
        print(f"❌ No se pudo enviar el correo (Resend) a {destinatario}: {error}")
        return False


def _enviar_por_smtp(destinatario: str, asunto: str, cuerpo: str, html: str) -> bool:
    mensaje = EmailMessage()
    mensaje["From"] = SMTP_FROM
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(cuerpo)
    if html:
        mensaje.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as servidor:
            if SMTP_TLS:
                servidor.starttls(context=ssl.create_default_context())
            if SMTP_USER and SMTP_PASSWORD:
                servidor.login(SMTP_USER, SMTP_PASSWORD)
            servidor.send_message(mensaje)
        return True
    except Exception as error:  # noqa: BLE001
        print(f"❌ No se pudo enviar el correo (SMTP) a {destinatario}: {error}")
        return False


def enviar_correo(destinatario: str, asunto: str, cuerpo: str, html: str = "") -> bool:
    """Devuelve True si el correo salió de verdad, False si solo se registró.

    Prueba Resend primero (funciona detrás del bloqueo SMTP de Railway y
    plataformas similares), y si no está configurado cae a SMTP clásico.

    `cuerpo` es la versión en texto plano y siempre viaja: es la que se ve
    en los clientes que no muestran HTML y la que queda en el registro.
    `html` es opcional y se adjunta como alternativa con formato.
    """
    if es_dominio_de_pruebas(destinatario):
        _registrar_en_log(destinatario, asunto, cuerpo, enviado=False)
        return False

    if resend_configurado():
        enviado = _enviar_por_resend(destinatario, asunto, cuerpo, html)
        _registrar_en_log(destinatario, asunto, cuerpo, enviado=enviado, medio="RESEND")
        return enviado

    if smtp_configurado():
        enviado = _enviar_por_smtp(destinatario, asunto, cuerpo, html)
        _registrar_en_log(destinatario, asunto, cuerpo, enviado=enviado, medio="SMTP")
        return enviado

    _registrar_en_log(destinatario, asunto, cuerpo, enviado=False)
    return False


def enviar_en_segundo_plano(
    tareas: BackgroundTasks, destinatario: str, asunto: str, cuerpo: str, html: str = ""
) -> bool:
    """Encola el correo para después de haber respondido al navegador.

    Hablar con un servidor SMTP tarda entre uno y varios segundos, y en
    los correos que nadie está esperando en pantalla (confirmación de la
    cuenta, aviso de recuperación, respuesta a una PQR) esa espera solo
    sirve para que la página se quede pensando. `BackgroundTasks` deja
    que FastAPI mande la respuesta primero y envíe el correo después, con
    la misma petición todavía viva.

    En la recuperación de contraseña, además, es una cuestión de
    seguridad: si el envío bloqueara, responder tarde delataría que el
    correo sí existe en la base de datos.

    Los códigos de doble factor NO usan esta vía: ahí el usuario está
    mirando la pantalla, esperando el código, y conviene saber en el acto
    si el envío falló.

    Devuelve si hay algún proveedor de correo configurado (Resend o SMTP);
    el resultado real del envío se conoce después y queda en
    `correos_enviados.log`.
    """
    tareas.add_task(enviar_correo, destinatario, asunto, cuerpo, html)
    return resend_configurado() or smtp_configurado()


# ---------------------------------------------------------------
# Plantillas
# ---------------------------------------------------------------
# Los correos se maquetan con tablas y estilos escritos en cada etiqueta.
# Es la única forma de que se vean igual en Gmail, Outlook y el resto:
# esos clientes descartan las hojas de estilo y buena parte del CSS
# moderno. Tampoco se usan imágenes del sitio, porque viven en localhost
# y el buzón de quien recibe no puede descargarlas.

NEGRO = "#000000"
ROJO = "#ff003d"
GRIS_FONDO = "#f1f1f3"
GRIS_TEXTO = "#5b5b66"
BORDE = "#e3e3e8"


def _plantilla_html(titulo: str, contenido: str) -> str:
    """Envuelve el contenido en la cabecera y el pie de la marca."""
    return f"""\
<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:{GRIS_FONDO};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:{GRIS_FONDO};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="width:600px;max-width:100%;background:#ffffff;border:1px solid {BORDE};">

        <tr><td style="background:{NEGRO};padding:26px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;">
              <div style="width:38px;height:38px;border:2px solid {ROJO};
                          color:{ROJO};font:700 19px/34px Arial,sans-serif;
                          text-align:center;">PS</div>
            </td>
            <td>
              <div style="color:#ffffff;font:700 19px/1.1 Arial,sans-serif;
                          letter-spacing:.5px;">PHONESTORE</div>
              <div style="color:#8a8a94;font:400 10px/1.6 Arial,sans-serif;
                          letter-spacing:2.4px;">CELULARES Y SERVICIO TECNICO</div>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:34px 32px 30px;">
          <h1 style="margin:0 0 18px;color:#16161a;
                     font:700 22px/1.3 Arial,sans-serif;">{titulo}</h1>
          {contenido}
        </td></tr>

        <tr><td style="background:#fafafb;border-top:1px solid {BORDE};
                       padding:18px 32px;color:{GRIS_TEXTO};
                       font:400 11px/1.7 Arial,sans-serif;">
          Este mensaje se envio automaticamente, no hace falta responderlo.<br>
          PhoneStore &middot; Calle 45 #12-34, Medellin &middot; +57 314 772 8502
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _bloque_codigo(codigo: str) -> str:
    return f"""\
          <p style="margin:0 0 10px;text-align:center;color:{GRIS_TEXTO};
                    font:700 11px/1.6 Arial,sans-serif;letter-spacing:2.2px;">
            TU CODIGO DE VERIFICACION
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:4px 0 10px;">
              <div style="display:inline-block;border:2px dashed {ROJO};
                          background:#fff5f7;padding:16px 34px;color:#16161a;
                          font:700 30px/1 Arial,sans-serif;letter-spacing:9px;">
                {codigo}
              </div>
            </td></tr>
          </table>
          <p style="margin:0 0 26px;text-align:center;color:{GRIS_TEXTO};
                    font:400 12px/1.6 Arial,sans-serif;">
            Escribelo en la pagina de recuperacion
          </p>"""


def _boton(enlace: str, texto: str) -> str:
    return f"""\
          <p style="margin:0 0 16px;text-align:center;color:#a0a0aa;
                    font:400 11px/1.6 Arial,sans-serif;letter-spacing:1.4px;">
            &mdash; o entra directamente &mdash;
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="{enlace}"
                 style="display:inline-block;background:{ROJO};color:#ffffff;
                        text-decoration:none;padding:15px 34px;
                        font:700 12px/1 Arial,sans-serif;letter-spacing:2px;">
                {texto}
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:{GRIS_TEXTO};
                    font:400 11px/1.6 Arial,sans-serif;">
            Si el boton no funciona, copia y pega esta direccion en tu navegador:
          </p>
          <p style="margin:0 0 22px;padding:11px 13px;background:#f5f5f7;
                    border:1px solid {BORDE};word-break:break-all;">
            <a href="{enlace}" style="color:{ROJO};text-decoration:none;
               font:400 11px/1.6 Arial,sans-serif;">{enlace}</a>
          </p>"""


def _aviso(texto: str) -> str:
    return f"""\
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-left:3px solid {ROJO};background:#fafafb;
                           padding:12px 14px;color:{GRIS_TEXTO};
                           font:400 12px/1.7 Arial,sans-serif;">{texto}</td></tr>
          </table>"""


def correo_recuperacion(
    nombre: str, enlace: str, minutos: int, codigo: str = ""
) -> tuple[str, str, str]:
    """Devuelve (asunto, texto plano, html).

    El mismo mensaje ofrece los dos caminos: escribir el código de seis
    dígitos en la página o abrir el enlace, que lleva al formulario con el
    paso ya resuelto.
    """
    asunto = "PhoneStore - Restablece tu contraseña"

    linea_codigo = f"Tu código de verificación es: {codigo}\n\n" if codigo else ""
    cuerpo = (
        f"Hola {nombre},\n\n"
        "Recibimos una solicitud para cambiar la contraseña de tu cuenta "
        "en PhoneStore.\n\n"
        f"{linea_codigo}"
        f"También puedes abrir este enlace y crear la contraseña nueva:\n"
        f"{enlace}\n\n"
        f"Caduca en {minutos} minutos y solo se puede usar una vez.\n"
        "Si no fuiste tú, ignora este mensaje: tu contraseña actual sigue "
        "siendo válida.\n\n"
        "Equipo PhoneStore"
    )

    contenido = (
        f'<p style="margin:0 0 24px;color:#3a3a44;'
        f'font:400 14px/1.7 Arial,sans-serif;">Hola <strong>{nombre}</strong>, '
        "recibimos una solicitud para cambiar la contrase&ntilde;a de tu "
        "cuenta.</p>"
        + (_bloque_codigo(codigo) if codigo else "")
        + _boton(enlace, "CREAR CONTRASE&Ntilde;A NUEVA")
        + _aviso(
            f"El c&oacute;digo y el enlace caducan en {minutos} minutos y solo "
            "sirven una vez. Si no pediste este cambio, ignora el mensaje: tu "
            "contrase&ntilde;a actual sigue siendo v&aacute;lida."
        )
    )

    return asunto, cuerpo, _plantilla_html("Restablece tu contrase&ntilde;a", contenido)


def correo_verificacion(nombre: str, enlace: str, horas: int) -> tuple[str, str, str]:
    asunto = "PhoneStore - Confirma tu correo electrónico"
    cuerpo = (
        f"Hola {nombre},\n\n"
        "Gracias por crear tu cuenta en PhoneStore. Solo falta confirmar que "
        "este correo es tuyo.\n\n"
        f"Abre este enlace para activarla:\n{enlace}\n\n"
        f"El enlace caduca en {horas} horas.\n"
        "Si no creaste ninguna cuenta, ignora este mensaje.\n\n"
        "Equipo PhoneStore"
    )

    contenido = (
        f'<p style="margin:0 0 24px;color:#3a3a44;'
        f'font:400 14px/1.7 Arial,sans-serif;">Hola <strong>{nombre}</strong>, '
        "gracias por crear tu cuenta. Solo falta confirmar que este correo "
        "es tuyo.</p>"
        + _boton(enlace, "CONFIRMAR MI CUENTA")
        + _aviso(
            f"El enlace caduca en {horas} horas. Si no creaste ninguna cuenta, "
            "ignora este mensaje."
        )
    )
    return asunto, cuerpo, _plantilla_html("Confirma tu correo", contenido)


def correo_doble_factor(nombre: str, codigo: str, minutos: int) -> tuple[str, str, str]:
    asunto = f"PhoneStore - Tu código de acceso: {codigo}"
    cuerpo = (
        f"Hola {nombre},\n\n"
        "Alguien está iniciando sesión en tu cuenta de PhoneStore. "
        "Escribe este código para terminar de entrar:\n\n"
        f"    {codigo}\n\n"
        f"El código caduca en {minutos} minutos y solo sirve una vez.\n"
        "Si no fuiste tú, cambia tu contraseña: alguien más la conoce.\n\n"
        "Equipo PhoneStore"
    )

    contenido = (
        f'<p style="margin:0 0 24px;color:#3a3a44;'
        f'font:400 14px/1.7 Arial,sans-serif;">Hola <strong>{nombre}</strong>, '
        "alguien est&aacute; iniciando sesi&oacute;n en tu cuenta. Escribe este "
        "c&oacute;digo para terminar de entrar.</p>"
        + _bloque_codigo(codigo)
        + _aviso(
            f"El c&oacute;digo caduca en {minutos} minutos y solo sirve una vez. "
            "Si no fuiste t&uacute;, cambia tu contrase&ntilde;a: alguien m&aacute;s "
            "la conoce."
        )
    )
    return asunto, cuerpo, _plantilla_html("Tu c&oacute;digo de acceso", contenido)


def correo_respuesta_pqr(
    nombre: str, radicado: str, asunto_pqr: str, respuesta: str
) -> tuple[str, str, str]:
    """Aviso al cliente cuando su PQR recibe respuesta."""
    asunto = f"PhoneStore - Respuesta a tu solicitud {radicado}"
    cuerpo = (
        f"Hola {nombre},\n\n"
        f"Respondimos tu solicitud {radicado} sobre \"{asunto_pqr}\".\n\n"
        f"Nuestra respuesta:\n{respuesta}\n\n"
        "Puedes consultar el estado en cualquier momento con tu numero de "
        "radicado desde la pagina de PQR.\n\n"
        "Equipo PhoneStore"
    )

    contenido = (
        f'<p style="margin:0 0 20px;color:#3a3a44;'
        f'font:400 14px/1.7 Arial,sans-serif;">Hola <strong>{nombre}</strong>, '
        f"respondimos tu solicitud <strong>{radicado}</strong>.</p>"
        f'<p style="margin:0 0 6px;color:{GRIS_TEXTO};'
        f'font:700 11px/1.6 Arial,sans-serif;letter-spacing:1.6px;">ASUNTO</p>'
        f'<p style="margin:0 0 18px;color:#16161a;'
        f'font:400 14px/1.6 Arial,sans-serif;">{asunto_pqr}</p>'
        f'<p style="margin:0 0 6px;color:{GRIS_TEXTO};'
        f'font:700 11px/1.6 Arial,sans-serif;letter-spacing:1.6px;">RESPUESTA</p>'
        f'<div style="margin:0 0 22px;padding:14px 16px;background:#fafafb;'
        f'border-left:3px solid {ROJO};color:#3a3a44;'
        f'font:400 14px/1.7 Arial,sans-serif;">{respuesta}</div>'
        + _aviso(
            "Si necesitas ampliar la informacion, responde radicando una "
            "solicitud nueva con este mismo numero como referencia."
        )
    )
    return asunto, cuerpo, _plantilla_html("Respuesta a tu solicitud", contenido)
