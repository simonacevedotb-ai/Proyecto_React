"""Configura el envío real de correos y comprueba que llegan.

Por qué existe
--------------
El sistema ya genera y manda los correos de recuperación de contraseña,
de verificación de cuenta y del código de dos pasos. Pero si en .env no
hay un servidor de correo, no tiene por dónde sacarlos: los deja escritos
en backend-fastapi/correos_enviados.log y nunca llegan a una bandeja.

Este asistente pide los datos del proveedor, los guarda en .env y manda
un correo de prueba para confirmar que salió. La contraseña se escribe
aquí, nunca queda en el historial de la terminal y solo se guarda en
.env, que está excluido del repositorio.

Cómo se usa
-----------
    cd backend-fastapi
    .\\venv\\Scripts\\activate
    python configurar_correo.py

Gmail no acepta la contraseña normal de la cuenta: hay que crear una
"contraseña de aplicación" de 16 letras en
https://myaccount.google.com/apppasswords (requiere tener activada la
verificación en dos pasos de Google).
"""

import getpass
import io
import os
import re
import smtplib
import ssl
import sys
from datetime import datetime
from email.message import EmailMessage

RUTA_ENV = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

PROVEEDORES = {
    "1": ("Gmail", "smtp.gmail.com", 587, True),
    "2": ("Outlook / Hotmail", "smtp-mail.outlook.com", 587, True),
    "3": ("Yahoo", "smtp.mail.yahoo.com", 587, True),
    "4": ("Servidor local de pruebas", "127.0.0.1", 1025, False),
}


def preguntar(texto, por_defecto=""):
    respuesta = input(f"{texto}{f' [{por_defecto}]' if por_defecto else ''}: ").strip()
    return respuesta or por_defecto


def pedir_clave(esperadas=0):
    """Pide la contraseña y confirma cuántos caracteres llegaron.

    Escribirla a ciegas es lo normal, pero en algunas terminales de Windows
    el pegado no entra en el campo oculto y se envía algo incompleto sin que
    se note. Por eso se informa la cantidad de caracteres recibidos (nunca su
    contenido) y, si no cuadra, se ofrece escribirla a la vista.
    """
    for intento in range(3):
        try:
            clave = getpass.getpass("Contraseña de aplicación (no se ve al escribir): ")
        except Exception:  # noqa: BLE001 - terminal sin soporte para ocultar
            clave = input("Contraseña de aplicación: ")

        clave = clave.replace(" ", "").strip()

        if not clave:
            print("  No se recibió nada. ¿El pegado entró en la terminal?")
        else:
            print(f"  Se recibieron {len(clave)} caracteres.")
            if not esperadas or len(clave) == esperadas:
                return clave
            print(
                f"  Gmail usa exactamente {esperadas} letras. Lo que llegó no cuadra:\n"
                "  seguramente se pegó a medias o es la contraseña normal de la cuenta."
            )

        if intento == 2:
            break
        respuesta = preguntar("¿Reintentar escribiéndola a la vista? (s/n)", "s")
        if respuesta.lower().startswith("s"):
            clave = input("Contraseña de aplicación (visible): ").replace(" ", "").strip()
            if clave and (not esperadas or len(clave) == esperadas):
                return clave
            if clave:
                print(f"  Siguen sin cuadrar: {len(clave)} caracteres.")

    print("\n  No se pudo leer una contraseña válida. No se guardó nada.\n")
    return ""


def explicar_fallo(error, opcion):
    """Traduce el error de SMTP a una causa concreta."""
    texto = str(error)

    if "5.7.8" in texto or "BadCredentials" in texto or "535" in texto:
        print("  Gmail dice que el usuario o la contraseña no son válidos.")
        print("  Las tres causas, en orden de probabilidad:\n")
        print("   1. Es la contraseña normal de la cuenta, no una de aplicación.")
        print("      Las de aplicación son 16 letras minúsculas y se crean en")
        print("      https://myaccount.google.com/apppasswords")
        print("   2. La cuenta todavía no tiene activada la verificación en dos")
        print("      pasos de Google. Sin eso, esa página ni siquiera aparece:")
        print("      https://myaccount.google.com/signinoptions/two-step-verification")
        print("   3. La contraseña se pegó incompleta en la terminal.")
        print("      Vuelve a ejecutar esto y revisa el número de caracteres.")
    elif "Name or service not known" in texto or "getaddrinfo" in texto:
        print("  No se pudo resolver el servidor. Revisa la conexión a internet.")
    elif "timed out" in texto.lower():
        print("  El servidor no respondió a tiempo. Puede haber un firewall")
        print("  bloqueando el puerto de salida.")
    elif opcion == "4":
        print("  ¿Está corriendo el servidor de pruebas en otra terminal?")
        print("      python -m tests.servidor_correo_local")
    else:
        print("  Revisa la dirección, la contraseña y la conexión a internet.")


def escribir_env(valores):
    """Actualiza las claves indicadas sin tocar el resto del archivo."""
    if os.path.exists(RUTA_ENV):
        texto = io.open(RUTA_ENV, encoding="utf-8").read()
    else:
        texto = ""

    for clave, valor in valores.items():
        linea = f"{clave}={valor}"
        if re.search(rf"^{clave}=.*$", texto, flags=re.M):
            texto = re.sub(rf"^{clave}=.*$", linea, texto, flags=re.M)
        else:
            texto = texto.rstrip("\n") + "\n" + linea + "\n"

    io.open(RUTA_ENV, "w", encoding="utf-8", newline="\n").write(texto)


def enviar_prueba(host, puerto, usuario, clave, remitente, destinatario, tls):
    mensaje = EmailMessage()
    mensaje["From"] = remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = "PhoneStore - Prueba de configuración de correo"
    mensaje.set_content(
        "Si estás leyendo esto, el envío de correos de PhoneStore quedó "
        "funcionando.\n\n"
        "A partir de ahora llegarán a esta bandeja:\n"
        "  - el enlace para restablecer la contraseña\n"
        "  - el enlace para verificar la cuenta al registrarse\n"
        "  - el código de 6 dígitos de la verificación en dos pasos\n\n"
        f"Enviado el {datetime.now():%d/%m/%Y a las %H:%M}.\n\n"
        "Equipo PhoneStore"
    )

    with smtplib.SMTP(host, puerto, timeout=20) as servidor:
        if tls:
            servidor.starttls(context=ssl.create_default_context())
        if usuario and clave:
            servidor.login(usuario, clave)
        servidor.send_message(mensaje)


def main():
    print()
    print("=" * 66)
    print("  CONFIGURACIÓN DEL CORREO SALIENTE DE PHONESTORE")
    print("=" * 66)
    print()
    for clave, (nombre, host, puerto, _) in PROVEEDORES.items():
        print(f"  {clave}. {nombre:<28} ({host}:{puerto})")
    print("  5. Otro servidor (lo escribo yo)")
    print()

    opcion = preguntar("Elige una opción", "1")

    if opcion in PROVEEDORES:
        nombre, host, puerto, tls = PROVEEDORES[opcion]
    elif opcion == "5":
        nombre = "Personalizado"
        host = preguntar("Servidor SMTP")
        puerto = int(preguntar("Puerto", "587"))
        tls = preguntar("¿Usa cifrado TLS? (s/n)", "s").lower().startswith("s")
    else:
        print("\nOpción no válida.")
        return 1

    print(f"\nProveedor: {nombre}")

    if opcion == "4":
        usuario = clave = ""
        remitente = preguntar("Remitente", "no-reply@phonestore.com")
        print(
            "\n  Recuerda dejar corriendo en otra terminal:\n"
            "      python -m tests.servidor_correo_local\n"
        )
    else:
        usuario = preguntar("Tu dirección de correo")
        if not usuario:
            print("\nHace falta la dirección de correo.")
            return 1
        if opcion == "1":
            print(
                "\n  Gmail NO acepta la contraseña normal de la cuenta.\n"
                "  Crea una contraseña de aplicación de 16 letras en:\n"
                "      https://myaccount.google.com/apppasswords\n"
            )
        clave = pedir_clave(esperadas=16 if opcion == "1" else 0)
        if not clave:
            return 1
        remitente = usuario

    destino = preguntar("Correo al que mandar la prueba", usuario or remitente)

    print("\nEnviando correo de prueba...")
    try:
        enviar_prueba(host, puerto, usuario, clave, remitente, destino, tls)
    except Exception as error:  # noqa: BLE001 - se le muestra al usuario tal cual
        print(f"\n  [X] No se pudo enviar.\n")
        print(f"  Respuesta del servidor: {error}\n")
        explicar_fallo(error, opcion)
        print("\n  No se guardó nada en .env.\n")
        return 1

    escribir_env({
        "SMTP_HOST": host,
        "SMTP_PORT": str(puerto),
        "SMTP_USER": usuario,
        "SMTP_PASSWORD": clave,
        "SMTP_FROM": remitente,
        "SMTP_TLS": "1" if tls else "0",
    })

    print(f"\n  [OK] Correo enviado a {destino}. Revisa la bandeja de entrada")
    print("       (y la carpeta de correo no deseado la primera vez).")
    print(f"\n  Configuración guardada en {RUTA_ENV}")
    print("\n  IMPORTANTE: reinicia el backend para que lea la configuración nueva.\n")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nCancelado. No se cambió nada.\n")
        sys.exit(1)
