"""Comprueba de punta a punta que los correos del sistema llegan.

Recorre el camino completo, igual que lo haría una persona:

  1. Registra una cuenta nueva  -> debe salir el correo de verificación
  2. Abre el enlace del correo  -> la cuenta queda verificada
  3. Activa la verificación en dos pasos
  4. Inicia sesión              -> NO entrega sesión, manda un código
  5. Escribe un código erróneo  -> lo rechaza y descuenta un intento
  6. Escribe el código correcto -> ahora sí entrega el JWT
  7. Usa el JWT en /me          -> la sesión funciona

Los correos se leen del buzón donde los deja tests/servidor_correo_local.py
cuando SMTP apunta a él, o de backend-fastapi/correos_enviados.log cuando
no hay SMTP configurado. En los dos casos se verifica lo mismo: que el
mensaje salió con su enlace o su código dentro.

Uso:
    python -m tests.prueba_correos
"""

import email as libreria_correo
import email.header  # noqa: F401
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

BASE = os.getenv("API_URL", "http://127.0.0.1:3000/api")
RAIZ = Path(__file__).resolve().parent.parent
BUZON = Path(__file__).resolve().parent / "correos_recibidos"
LOG = RAIZ / "correos_enviados.log"

VERDE, ROJO, GRIS, FIN = "\033[92m", "\033[91m", "\033[90m", "\033[0m"

resultados = []


def pedir(metodo, ruta, cuerpo=None, token=None):
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    peticion = urllib.request.Request(BASE + ruta, data=datos, method=metodo)
    peticion.add_header("Content-Type", "application/json")
    if token:
        peticion.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(peticion, timeout=20) as respuesta:
            return respuesta.status, json.loads(respuesta.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        texto = error.read().decode("utf-8")
        try:
            return error.code, json.loads(texto)
        except json.JSONDecodeError:
            return error.code, {"raw": texto}


def comprobar(descripcion, condicion, detalle=""):
    resultados.append((descripcion, bool(condicion), detalle))
    marca = f"{VERDE}OK  {FIN}" if condicion else f"{ROJO}FALLA{FIN}"
    print(f"  {marca} {descripcion}")
    if detalle:
        print(f"        {GRIS}{detalle}{FIN}")
    return bool(condicion)


def _asunto_legible(mensaje) -> str:
    """El asunto viaja codificado cuando lleva tildes (RFC 2047)."""
    crudo = mensaje.get("Subject", "")
    try:
        return str(libreria_correo.header.make_header(
            libreria_correo.header.decode_header(crudo)
        ))
    except Exception:  # noqa: BLE001 - cabecera rara: se usa tal cual
        return crudo


def leer_correos_recientes(desde: float) -> str:
    """Junta todo lo que llegó al buzón y al log después de `desde`.

    Los .eml guardan el cuerpo en quoted-printable, donde un '=' se
    escribe '=3D'. Hay que decodificarlo o los enlaces salen partidos.
    """
    partes = []
    if BUZON.exists():
        for archivo in BUZON.glob("*.eml"):
            if archivo.stat().st_mtime >= desde - 1:
                mensaje = libreria_correo.message_from_bytes(archivo.read_bytes())
                cuerpo = mensaje.get_payload(decode=True) or b""
                partes.append(_asunto_legible(mensaje))
                partes.append(cuerpo.decode("utf-8", errors="replace"))
    if LOG.exists() and LOG.stat().st_mtime >= desde - 1:
        texto = LOG.read_text(encoding="utf-8", errors="replace")
        partes.append(texto[-6000:])
    return "\n".join(partes)


def esperar_correo(desde: float, patron: str, segundos: int = 6):
    """Reintenta unos segundos: el correo sale justo después de la respuesta.

    Se queda con la ÚLTIMA coincidencia: el log va acumulando los correos
    de ejecuciones anteriores y el primero que aparece sería uno viejo.
    """
    limite = time.time() + segundos
    while time.time() < limite:
        encontrados = re.findall(patron, leer_correos_recientes(desde))
        if encontrados:
            ultimo = encontrados[-1]
            return ultimo[0] if isinstance(ultimo, tuple) else ultimo
        time.sleep(0.4)
    return None


def main():
    marca = datetime.now().strftime("%H%M%S")
    email = f"cliente.correo{marca}@phonestore.com"
    password = "Prueba1234"

    print("\n" + "=" * 70)
    print("  PRUEBA DE CORREOS: VERIFICACIÓN DE CUENTA Y DOS PASOS")
    print("=" * 70)
    print(f"  Cuenta de prueba: {email}\n")

    # ---------------------------------------------------------- 1
    print("1. Registro y correo de verificación")
    t0 = time.time()
    estado, datos = pedir("POST", "/auth/register", {
        "nombre": "Correo",
        "apellido": "Prueba",
        "tipoDocumento": "CC",
        "numeroDocumento": f"77{marca}1",
        "direccion": "Calle 45 numero 12-34",
        "telefono": "3140000000",
        "email": email,
        "password": password,
    })
    comprobar("El registro responde 201", estado == 201, f"HTTP {estado}")
    comprobar(
        "La cuenta nace SIN verificar",
        datos.get("usuario", {}).get("email_verificado") is False,
        f"email_verificado = {datos.get('usuario', {}).get('email_verificado')}",
    )

    enlace = esperar_correo(t0, r"(https?://[^\s]*verificar-correo\?token=[A-Za-z0-9_\-]+)")
    comprobar("Llega el correo con el enlace de verificación", enlace is not None,
              enlace or "no se encontró el enlace")
    if not enlace:
        return terminar()

    token_verificacion = enlace.split("token=")[1].strip()
    comprobar(
        "El token NO viaja en la respuesta HTTP",
        token_verificacion not in json.dumps(datos),
        "solo sale por correo",
    )

    # ---------------------------------------------------------- 2
    print("\n2. Confirmación del correo")
    estado, datos = pedir("POST", "/auth/verificar-correo", {"token": token_verificacion})
    comprobar("El enlace verifica la cuenta", estado == 200, f"HTTP {estado}")
    comprobar(
        "email_verificado pasa a verdadero",
        datos.get("usuario", {}).get("email_verificado") is True,
    )
    estado, _ = pedir("POST", "/auth/verificar-correo", {"token": token_verificacion})
    comprobar("El mismo enlace no sirve dos veces", estado == 400, f"HTTP {estado}")

    # ---------------------------------------------------------- 3
    print("\n3. Activación de la verificación en dos pasos")
    estado, datos = pedir("POST", "/auth/login", {"email": email, "password": password})
    token_sesion = datos.get("token")
    comprobar("Inicio de sesión normal (sin dos pasos todavía)", estado == 200 and token_sesion)

    estado, datos = pedir("PUT", "/auth/doble-factor", {"activo": True}, token=token_sesion)
    comprobar("Se activa el segundo paso", estado == 200, f"HTTP {estado}")
    comprobar(
        "Queda guardado en la cuenta",
        datos.get("usuario", {}).get("doble_factor") is True,
    )

    # ---------------------------------------------------------- 4
    print("\n4. Inicio de sesión con segundo paso")
    t0 = time.time()
    estado, datos = pedir("POST", "/auth/login", {"email": email, "password": password})
    comprobar("El login responde 200", estado == 200, f"HTTP {estado}")
    comprobar("Pide el segundo paso", datos.get("requiere_doble_factor") is True)
    comprobar(
        "NO entrega la sesión todavía",
        "token" not in datos,
        "sin JWT hasta que llegue el código",
    )
    comprobar(
        "Oculta parte del correo en la respuesta",
        "*" in (datos.get("email_parcial") or ""),
        datos.get("email_parcial", ""),
    )

    desafio = datos.get("desafio")
    codigo = esperar_correo(t0, r"terminar de entrar:\s*(\d{6})")
    comprobar("Llega el correo con el código de 6 dígitos", codigo is not None,
              f"código {codigo}" if codigo else "no llegó")
    if not codigo or not desafio:
        return terminar()

    comprobar(
        "El código NO viaja en la respuesta HTTP",
        codigo not in json.dumps(datos),
        "solo sale por correo",
    )

    # ---------------------------------------------------------- 5
    print("\n5. Código incorrecto")
    erroneo = "000000" if codigo != "000000" else "111111"
    estado, datos = pedir(
        "POST", "/auth/verificar-doble-factor", {"desafio": desafio, "codigo": erroneo}
    )
    comprobar("Rechaza el código incorrecto", estado == 401, f"HTTP {estado}")
    comprobar("Avisa cuántos intentos quedan", "intentos" in datos.get("message", ""),
              datos.get("message", ""))

    # ---------------------------------------------------------- 6
    print("\n6. Código correcto")
    estado, datos = pedir(
        "POST", "/auth/verificar-doble-factor", {"desafio": desafio, "codigo": codigo}
    )
    jwt = datos.get("token")
    comprobar("El código correcto entrega el JWT", estado == 200 and bool(jwt), f"HTTP {estado}")

    estado, _ = pedir(
        "POST", "/auth/verificar-doble-factor", {"desafio": desafio, "codigo": codigo}
    )
    comprobar("El código no se puede reutilizar", estado == 400, f"HTTP {estado}")

    # ---------------------------------------------------------- 7
    print("\n7. La sesión obtenida funciona")
    estado, datos = pedir("GET", "/auth/me", token=jwt)
    comprobar("El JWT del segundo paso sirve en /me", estado == 200, f"HTTP {estado}")
    comprobar("Es la misma cuenta", datos.get("usuario", {}).get("email") == email)

    # ---------------------------------------------------------- 8
    print("\n8. Recuperación de contraseña con el código del correo")
    t0 = time.time()
    estado, _ = pedir("POST", "/auth/recuperar-password", {"email": email})
    comprobar("La solicitud responde 200", estado == 200, f"HTTP {estado}")

    codigo_reset = esperar_correo(t0, r"verificaci\S*n es: (\d{6})")
    enlace_reset = esperar_correo(
        t0, r"(https?://[^\s]*recuperar-contrasena\?token=[A-Za-z0-9_\-]+)"
    )
    comprobar("El correo trae el código de 6 dígitos", codigo_reset is not None,
              f"código {codigo_reset}" if codigo_reset else "no llegó")
    comprobar("El mismo correo trae el enlace directo", enlace_reset is not None,
              "los dos caminos viajan juntos")
    if not codigo_reset:
        return terminar()

    nueva = "Recuperada9"
    estado, datos = pedir("POST", "/auth/restablecer-con-codigo",
                          {"email": email, "codigo": "000000", "password": nueva})
    comprobar("Rechaza un código incorrecto", estado == 400, f"HTTP {estado}")
    comprobar("Avisa cuántos intentos quedan", "intentos" in datos.get("message", ""),
              datos.get("message", ""))

    estado, _ = pedir("POST", "/auth/restablecer-con-codigo",
                      {"email": email, "codigo": codigo_reset, "password": nueva})
    comprobar("El código correcto cambia la contraseña", estado == 200, f"HTTP {estado}")

    estado, _ = pedir("POST", "/auth/restablecer-con-codigo",
                      {"email": email, "codigo": codigo_reset, "password": "Otra12345"})
    comprobar("El código no se puede reutilizar", estado == 400, f"HTTP {estado}")

    estado, datos = pedir("POST", "/auth/login", {"email": email, "password": nueva})
    comprobar(
        "Se puede entrar con la contraseña nueva",
        estado == 200 and (datos.get("requiere_doble_factor") or datos.get("token")),
        f"HTTP {estado}",
    )

    terminar()


def terminar():
    total = len(resultados)
    bien = sum(1 for _, ok, _ in resultados if ok)
    print("\n" + "=" * 70)
    color = VERDE if bien == total else ROJO
    print(f"  {color}RESULTADO: {bien}/{total} comprobaciones superadas{FIN}")
    print("=" * 70 + "\n")
    sys.exit(0 if bien == total else 1)


if __name__ == "__main__":
    main()
