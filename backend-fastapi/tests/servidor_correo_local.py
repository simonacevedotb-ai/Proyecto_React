"""Servidor SMTP de pruebas para comprobar que los correos SALEN de verdad.

Para qué sirve
--------------
Sin credenciales de Gmail no se puede demostrar que el sistema entrega
correos. Este script levanta un servidor SMTP mínimo en la propia
máquina: el backend le entrega los mensajes igual que se los entregaría
a Gmail, y aquí quedan guardados como archivos .eml que se pueden abrir.

Cómo se usa
-----------
1. En backend-fastapi/.env:

       SMTP_HOST=127.0.0.1
       SMTP_PORT=1025
       SMTP_TLS=0
       SMTP_FROM=no-reply@phonestore.com

2. En una terminal:  python -m tests.servidor_correo_local
3. Reinicia el backend para que lea el .env nuevo.
4. Regístrate o inicia sesión: los correos aparecen en
   backend-fastapi/tests/correos_recibidos/

Para enviar a buzones reales basta con cambiar esas variables por las de
un proveedor (Gmail con contraseña de aplicación, Outlook, Brevo…). El
código del backend no cambia.
"""

import asyncio
import email
import re
import sys
from datetime import datetime
from pathlib import Path

HOST = "127.0.0.1"
PUERTO = 1025
DESTINO = Path(__file__).resolve().parent / "correos_recibidos"


def _nombre_archivo(destinatario: str, asunto: str) -> str:
    marca = datetime.now().strftime("%H%M%S")
    limpio = re.sub(r"[^a-zA-Z0-9]+", "-", f"{destinatario}-{asunto}")[:60].strip("-")
    return f"{marca}-{limpio}.eml"


def _guardar(datos: bytes, remitente: str, destinatarios: list[str]) -> Path:
    DESTINO.mkdir(parents=True, exist_ok=True)
    mensaje = email.message_from_bytes(datos)
    asunto = mensaje.get("Subject", "sin-asunto")
    destino = destinatarios[0] if destinatarios else "desconocido"

    ruta = DESTINO / _nombre_archivo(destino, asunto)
    ruta.write_bytes(datos)

    cuerpo = mensaje.get_payload(decode=True) or b""
    print("=" * 70)
    print(f"CORREO RECIBIDO  {datetime.now():%Y-%m-%d %H:%M:%S}")
    print(f"  De:      {remitente}")
    print(f"  Para:    {', '.join(destinatarios)}")
    print(f"  Asunto:  {asunto}")
    print(f"  Archivo: {ruta.name}")
    print("-" * 70)
    print(cuerpo.decode("utf-8", errors="replace").strip())
    print("=" * 70)
    return ruta


async def _atender(lector: asyncio.StreamReader, escritor: asyncio.StreamWriter):
    """Implementa el mínimo de SMTP que usa smtplib: EHLO, MAIL, RCPT, DATA, QUIT."""

    def responder(texto: str):
        escritor.write((texto + "\r\n").encode("utf-8"))

    remitente = ""
    destinatarios: list[str] = []

    responder("220 phonestore-pruebas SMTP listo")
    await escritor.drain()

    while True:
        linea = await lector.readline()
        if not linea:
            break
        comando = linea.decode("utf-8", errors="replace").strip()
        mayus = comando.upper()

        if mayus.startswith(("HELO", "EHLO")):
            responder("250-phonestore-pruebas")
            responder("250 8BITMIME")
        elif mayus.startswith("MAIL FROM"):
            remitente = comando.partition(":")[2].strip().strip("<>")
            responder("250 OK")
        elif mayus.startswith("RCPT TO"):
            destinatarios.append(comando.partition(":")[2].strip().strip("<>"))
            responder("250 OK")
        elif mayus == "DATA":
            responder("354 Escribe el mensaje y termina con un punto solo")
            await escritor.drain()
            cuerpo = bytearray()
            while True:
                trozo = await lector.readline()
                if not trozo or trozo in (b".\r\n", b".\n"):
                    break
                # El punto inicial duplicado es el escape del protocolo
                cuerpo += trozo[1:] if trozo.startswith(b"..") else trozo
            _guardar(bytes(cuerpo), remitente, destinatarios)
            responder("250 Mensaje aceptado")
            remitente, destinatarios = "", []
        elif mayus == "RSET":
            remitente, destinatarios = "", []
            responder("250 OK")
        elif mayus == "NOOP":
            responder("250 OK")
        elif mayus == "QUIT":
            responder("221 Adios")
            await escritor.drain()
            break
        else:
            responder("502 Comando no implementado")

        await escritor.drain()

    escritor.close()


async def main():
    servidor = await asyncio.start_server(_atender, HOST, PUERTO)
    print(f"Servidor SMTP de pruebas escuchando en {HOST}:{PUERTO}")
    print(f"Los correos se guardan en: {DESTINO}")
    print("Ctrl+C para detenerlo.\n")
    async with servidor:
        await servidor.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        sys.exit(0)
