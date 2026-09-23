"""Cerebro del asistente de atención al cliente.

Funciona con dos motores y el mismo contrato de entrada y salida:

  1. Motor de catálogo (por defecto). Entiende la intención del mensaje y
     responde con datos reales leídos de la base de datos: qué productos
     hay, a qué precio, qué servicios se prestan, cómo son los envíos y
     las garantías, y cómo radicar una PQR. No necesita ninguna clave ni
     conexión a internet, así que el proyecto funciona siempre.

  2. Motor de Inteligencia Artificial. Si en el archivo de entorno hay una
     clave de OpenAI, Google Gemini o Anthropic, el mensaje se envía a ese
     proveedor junto con una ficha del catálogo, y la respuesta llega
     redactada de forma más natural. La clave se lee de una variable de
     entorno: nunca está escrita en el código.

Cuando el proveedor falla (clave vencida, sin saldo, sin internet) no se
deja al cliente sin respuesta: se cae de vuelta al motor de catálogo.
"""

import json
import os
import re
import unicodedata
import urllib.error
import urllib.request

from dotenv import load_dotenv

load_dotenv()

PROVEEDOR = os.getenv("IA_PROVEEDOR", "").strip().lower()
IA_API_KEY = os.getenv("IA_API_KEY", "").strip()
IA_MODELO = os.getenv("IA_MODELO", "").strip()
IA_TIMEOUT = int(os.getenv("IA_TIMEOUT", "25"))

MODELOS_POR_DEFECTO = {
    "openai": "gpt-4o-mini",
    "gemini": "gemini-2.0-flash",
    "anthropic": "claude-sonnet-4-5",
}

MAX_HISTORIAL = 8  # turnos que se mandan como contexto

INSTRUCCIONES = (
    "Eres el asistente virtual de PhoneStore, una tienda colombiana de "
    "celulares, accesorios y servicio tecnico ubicada en Medellin. "
    "Respondes en espanol, con trato cercano y de usted implicito, en un "
    "maximo de cuatro frases. Usa unicamente la informacion de la ficha "
    "que se te entrega: si algo no aparece ahi, dilo con honestidad y "
    "ofrece el canal de contacto. Nunca inventes precios, existencias, "
    "plazos ni politicas. Si el cliente tiene una queja o un reclamo, "
    "explicale que puede radicar una PQR desde la pagina y que recibira un "
    "numero de radicado para seguir el caso."
)


def ia_configurada() -> bool:
    return bool(PROVEEDOR and IA_API_KEY and PROVEEDOR in MODELOS_POR_DEFECTO)


def motor_actual() -> str:
    return PROVEEDOR if ia_configurada() else "catalogo"


# ===============================================================
# Utilidades de texto
# ===============================================================
def _normalizar(texto: str) -> str:
    """Minúsculas y sin tildes, para poder comparar lo que escribe la gente."""
    texto = (texto or "").lower().strip()
    return "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )


def _dinero(valor) -> str:
    try:
        return "$ " + f"{float(valor or 0):,.0f}".replace(",", ".")
    except (TypeError, ValueError):
        return "$ 0"


# ===============================================================
# Ficha de la tienda que alimenta a los dos motores
# ===============================================================
def construir_ficha(db) -> dict:
    """Lee el catálogo real. Es la única fuente de verdad del asistente."""
    from app.models import Categoria, Producto, Servicio

    productos = (
        db.query(Producto)
        .filter(Producto.estado == "activo")
        .order_by(Producto.destacado.desc(), Producto.precio.desc())
        .limit(40)
        .all()
    )
    servicios = (
        db.query(Servicio).filter(Servicio.estado == "activo").limit(20).all()
    )
    categorias = (
        db.query(Categoria).filter(Categoria.estado == "activo").all()
    )

    return {
        "productos": [
            {
                "nombre": p.nombre,
                "marca": p.marca,
                "precio": float(p.precio or 0),
                "stock": int(p.stock or 0),
                "categoria": p.categoria.nombre if p.categoria else None,
                "descripcion": (p.descripcion or "")[:160],
            }
            for p in productos
        ],
        "servicios": [
            {
                "nombre": s.nombre,
                "precio": float(s.precio or 0),
                "duracion": s.duracion,
                "descripcion": (s.descripcion or "")[:160],
            }
            for s in servicios
        ],
        "categorias": [c.nombre for c in categorias],
        "politicas": {
            "envio_gratis_desde": 1500000,
            "costo_envio": 15000,
            "tiempo_entrega": "24 a 48 horas a todo el pais",
            "garantia": "12 meses en todos los equipos",
            "cambios": "5 dias calendario para cambios",
            "medios_pago": "contra entrega, transferencia y efectivo en tienda",
            "horario": (
                "lunes a viernes de 8:00 a. m. a 6:00 p. m., "
                "sabados de 9:00 a. m. a 2:00 p. m."
            ),
            "direccion": "Calle 45 #12-34, Medellin, Antioquia",
            "telefono": "+57 314 772 8502",
            "correo": "contacto@phonestore.com",
        },
    }


def _ficha_en_texto(ficha: dict) -> str:
    """Resume la ficha para pasársela al proveedor de IA."""
    lineas = ["CATALOGO DE PRODUCTOS (nombre | marca | precio | existencias):"]
    for p in ficha["productos"][:25]:
        estado = f"{p['stock']} disponibles" if p["stock"] > 0 else "agotado"
        lineas.append(f"- {p['nombre']} | {p['marca']} | {_dinero(p['precio'])} | {estado}")

    lineas.append("")
    lineas.append("SERVICIOS TECNICOS (nombre | precio | duracion):")
    for s in ficha["servicios"]:
        lineas.append(
            f"- {s['nombre']} | {_dinero(s['precio'])} | {s['duracion'] or 'a convenir'}"
        )

    pol = ficha["politicas"]
    lineas += [
        "",
        "POLITICAS DE LA TIENDA:",
        f"- Envio gratis desde {_dinero(pol['envio_gratis_desde'])}; "
        f"por debajo cuesta {_dinero(pol['costo_envio'])}.",
        f"- Entrega: {pol['tiempo_entrega']}.",
        f"- Garantia: {pol['garantia']}.",
        f"- Cambios: {pol['cambios']}.",
        f"- Medios de pago: {pol['medios_pago']}.",
        f"- Horario: {pol['horario']}.",
        f"- Direccion: {pol['direccion']}. Telefono: {pol['telefono']}. "
        f"Correo: {pol['correo']}.",
        "",
        "PQR: el cliente radica peticiones, quejas y reclamos desde la pagina "
        "/pqr y recibe un numero de radicado con el que consulta el estado.",
    ]
    return "\n".join(lineas)


# ===============================================================
# Motor 1: catálogo (sin IA)
# ===============================================================
# El tema de la pregunta manda sobre la forma de preguntarla. En
# "cuanto cuesta el envio" el tema es el envio, aunque la frase empiece
# igual que una pregunta de precio; por eso los temas se buscan primero y
# el precio solo entra cuando no hay ningún otro tema en la frase.
TEMAS = (
    ("envio", ("envio", "enviar", "domicilio", "entrega", "entregan",
               "cuanto demora", "cuanto tarda", "cuando llega", "despacho")),
    ("garantia", ("garantia", "devolucion", "devolver", "cambio", "cambiar",
                  "defectuoso", "danado", "averiado")),
    ("pago", ("medios de pago", "forma de pago", "metodo de pago", "pagar",
              "tarjeta", "efectivo", "transferencia", "contra entrega",
              "contraentrega")),
    ("pqr", ("pqr", "queja", "reclamo", "peticion", "sugerencia", "inconforme",
             "reclamar", "quejarme")),
    ("estado_pedido", ("mi pedido", "mis pedidos", "estado de mi pedido",
                       "rastrear", "donde esta mi pedido", "seguimiento")),
    ("servicio", ("servicio tecnico", "servicio", "reparar", "reparacion",
                  "cambio de pantalla", "bateria", "liberar", "liberacion",
                  "diagnostico", "arreglar")),
    ("horario", ("horario", "a que hora", "abren", "cierran", "atienden")),
    ("contacto", ("whatsapp", "donde quedan", "donde estan", "ubicacion",
                  "direccion", "contacto", "telefono", "correo")),
    ("compra", ("como compro", "como comprar", "comprar", "carrito", "ordenar",
                "hacer un pedido")),
    ("producto", ("celular", "telefono movil", "iphone", "samsung", "galaxy",
                  "xiaomi", "audifono", "airpod", "reloj", "watch", "tablet",
                  "ipad", "cargador", "accesorio", "producto", "catalogo",
                  "que tienen", "que venden")),
    ("saludo", ("hola", "buenas", "buen dia", "buenas tardes", "buenas noches",
                "que tal")),
    ("despedida", ("gracias", "chao", "adios", "hasta luego")),
)

# Formas de preguntar por un precio. Solo deciden la intención cuando la
# frase no habla de ningún otro tema.
CLAVES_PRECIO = (
    "precio", "cuanto cuesta", "cuanto vale", "cuanto esta", "valor",
)


def _detectar_intencion(mensaje: str) -> str:
    texto = _normalizar(mensaje)

    puntajes = {}
    for nombre, claves in TEMAS:
        for clave in claves:
            if clave in texto:
                # Entre dos temas gana el que coincide con más texto
                puntajes[nombre] = max(puntajes.get(nombre, 0), len(clave))

    # Un saludo suelto no debe ganarle al tema real de la frase
    if len(puntajes) > 1:
        for cortesia in ("saludo", "despedida"):
            puntajes.pop(cortesia, None)

    if puntajes:
        return max(puntajes, key=puntajes.get)

    if any(clave in texto for clave in CLAVES_PRECIO):
        return "precio"

    return "desconocida"


def _buscar_productos(mensaje: str, ficha: dict, limite: int = 4) -> list:
    """Productos cuyo nombre, marca o categoría aparecen en el mensaje."""
    texto = _normalizar(mensaje)
    encontrados = []
    for p in ficha["productos"]:
        campos = _normalizar(f"{p['nombre']} {p['marca']} {p['categoria'] or ''}")
        palabras = [w for w in campos.split() if len(w) > 2]
        if any(w in texto for w in palabras):
            encontrados.append(p)
    return encontrados[:limite]


def _listar_productos(productos: list) -> str:
    return "\n".join(
        f"• {p['nombre']} ({p['marca']}): {_dinero(p['precio'])}"
        + (f", {p['stock']} disponibles" if p["stock"] > 0 else ", agotado")
        for p in productos
    )


def responder_con_catalogo(mensaje: str, ficha: dict) -> str:
    """Respuesta armada con los datos reales de la tienda."""
    pol = ficha["politicas"]
    intencion = _detectar_intencion(mensaje)
    coincidencias = _buscar_productos(mensaje, ficha)

    # Si nombran un producto concreto, eso manda sobre la intención general
    if coincidencias and intencion in ("precio", "producto", "desconocida", "compra"):
        cuerpo = _listar_productos(coincidencias)
        return (
            f"Esto es lo que tenemos:\n{cuerpo}\n\n"
            "Puedes verlos con fotos y ficha completa en la seccion Productos. "
            "¿Quieres que te cuente de alguno en particular?"
        )

    if intencion == "saludo":
        return (
            "¡Hola! Soy el asistente de PhoneStore. Puedo ayudarte con "
            "precios y disponibilidad, servicios tecnicos, envios, garantias "
            "y con radicar una PQR. ¿Que necesitas?"
        )

    if intencion == "despedida":
        return "¡Con gusto! Aqui estare si necesitas algo mas. Que tengas un buen dia."

    if intencion == "producto" or intencion == "precio":
        destacados = ficha["productos"][:4]
        categorias = ", ".join(ficha["categorias"]) or "varias categorias"
        return (
            f"Manejamos {categorias}. Algunos de nuestros equipos:\n"
            f"{_listar_productos(destacados)}\n\n"
            "Dime que modelo te interesa y te doy el precio y las existencias."
        )

    if intencion == "servicio":
        if not ficha["servicios"]:
            return (
                "Tenemos servicio tecnico propio. Escribenos al "
                f"{pol['telefono']} y te contamos los detalles."
            )
        cuerpo = "\n".join(
            f"• {s['nombre']}: {_dinero(s['precio'])}"
            + (f" ({s['duracion']})" if s["duracion"] else "")
            for s in ficha["servicios"][:5]
        )
        return (
            f"Estos son nuestros servicios tecnicos:\n{cuerpo}\n\n"
            "Puedes agendar en linea desde la seccion Servicios y seguir el "
            "estado de tu orden desde tu cuenta."
        )

    if intencion == "envio":
        return (
            f"El envio es gratis en compras desde {_dinero(pol['envio_gratis_desde'])}. "
            f"Por debajo de ese monto cuesta {_dinero(pol['costo_envio'])}. "
            f"La entrega tarda {pol['tiempo_entrega']}."
        )

    if intencion == "garantia":
        return (
            f"Todos los equipos tienen {pol['garantia']}. "
            f"Ademas cuentas con {pol['cambios']} si el producto no era lo que esperabas. "
            "Si tu equipo presenta una falla, radica una PQR y le hacemos seguimiento."
        )

    if intencion == "pago":
        return (
            f"Aceptamos {pol['medios_pago']}. "
            "El precio final siempre lo confirma el sistema al cerrar el pedido."
        )

    if intencion == "compra":
        return (
            "Es sencillo: agrega los productos al carrito, abre el carrito y "
            "pulsa Finalizar compra. Te pediremos los datos de entrega y al "
            "confirmar recibiras el numero de tu pedido. "
            f"Recuerda que el envio es gratis desde {_dinero(pol['envio_gratis_desde'])}."
        )

    if intencion == "pqr":
        return (
            "Lamento el inconveniente. Puedes radicar tu peticion, queja o "
            "reclamo desde la seccion PQR de la pagina. Al enviarla recibes un "
            "numero de radicado con el que consultas el estado cuando quieras, "
            "y te respondemos al correo que registres."
        )

    if intencion == "estado_pedido":
        return (
            "Puedes ver el estado de tus pedidos entrando a tu cuenta, en la "
            "seccion Mis pedidos. Ahi aparece cada compra con su numero y su "
            "estado actual. Si algo no cuadra, radica una PQR y lo revisamos."
        )

    if intencion == "horario":
        return f"Atendemos {pol['horario']}. Los domingos y festivos estamos cerrados."

    if intencion == "contacto":
        return (
            f"Estamos en {pol['direccion']}. "
            f"Telefono y WhatsApp: {pol['telefono']}. Correo: {pol['correo']}. "
            f"Horario: {pol['horario']}."
        )

    return (
        "No estoy seguro de haber entendido. Puedo ayudarte con precios y "
        "disponibilidad de productos, servicios tecnicos, envios, garantias, "
        "medios de pago, el estado de tus pedidos o radicar una PQR. "
        f"Si prefieres hablar con una persona, escribenos al {pol['telefono']}."
    )


# ===============================================================
# Motor 2: proveedor de Inteligencia Artificial
# ===============================================================
def _pedir(url: str, cuerpo: dict, cabeceras: dict) -> dict:
    datos = json.dumps(cuerpo).encode("utf-8")
    peticion = urllib.request.Request(url, data=datos, method="POST")
    peticion.add_header("Content-Type", "application/json")
    for clave, valor in cabeceras.items():
        peticion.add_header(clave, valor)
    with urllib.request.urlopen(peticion, timeout=IA_TIMEOUT) as respuesta:
        return json.loads(respuesta.read().decode("utf-8"))


def _openai(mensaje: str, ficha_texto: str, historial: list) -> str:
    modelo = IA_MODELO or MODELOS_POR_DEFECTO["openai"]
    mensajes = [{"role": "system", "content": f"{INSTRUCCIONES}\n\n{ficha_texto}"}]
    for turno in historial[-MAX_HISTORIAL:]:
        mensajes.append({
            "role": "assistant" if turno["autor"] == "asistente" else "user",
            "content": turno["contenido"],
        })
    mensajes.append({"role": "user", "content": mensaje})

    datos = _pedir(
        "https://api.openai.com/v1/chat/completions",
        {"model": modelo, "messages": mensajes, "max_tokens": 400, "temperature": 0.4},
        {"Authorization": f"Bearer {IA_API_KEY}"},
    )
    return datos["choices"][0]["message"]["content"].strip()


def _gemini(mensaje: str, ficha_texto: str, historial: list) -> str:
    modelo = IA_MODELO or MODELOS_POR_DEFECTO["gemini"]
    contenidos = []
    for turno in historial[-MAX_HISTORIAL:]:
        contenidos.append({
            "role": "model" if turno["autor"] == "asistente" else "user",
            "parts": [{"text": turno["contenido"]}],
        })
    contenidos.append({"role": "user", "parts": [{"text": mensaje}]})

    datos = _pedir(
        f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent",
        {
            "systemInstruction": {"parts": [{"text": f"{INSTRUCCIONES}\n\n{ficha_texto}"}]},
            "contents": contenidos,
            "generationConfig": {"maxOutputTokens": 400, "temperature": 0.4},
        },
        {"x-goog-api-key": IA_API_KEY},
    )
    return datos["candidates"][0]["content"]["parts"][0]["text"].strip()


def _anthropic(mensaje: str, ficha_texto: str, historial: list) -> str:
    modelo = IA_MODELO or MODELOS_POR_DEFECTO["anthropic"]
    mensajes = []
    for turno in historial[-MAX_HISTORIAL:]:
        mensajes.append({
            "role": "assistant" if turno["autor"] == "asistente" else "user",
            "content": turno["contenido"],
        })
    mensajes.append({"role": "user", "content": mensaje})

    datos = _pedir(
        "https://api.anthropic.com/v1/messages",
        {
            "model": modelo,
            "system": f"{INSTRUCCIONES}\n\n{ficha_texto}",
            "messages": mensajes,
            "max_tokens": 400,
        },
        {"x-api-key": IA_API_KEY, "anthropic-version": "2023-06-01"},
    )
    return datos["content"][0]["text"].strip()


MOTORES = {"openai": _openai, "gemini": _gemini, "anthropic": _anthropic}


# ===============================================================
# Punto de entrada
# ===============================================================
def responder(mensaje: str, ficha: dict, historial: list) -> tuple[str, str]:
    """Devuelve (respuesta, motor que la produjo).

    Si hay proveedor configurado se intenta primero; ante cualquier fallo
    se responde con el catálogo, para que el cliente nunca se quede sin
    contestación.
    """
    if ia_configurada():
        try:
            texto = MOTORES[PROVEEDOR](mensaje, _ficha_en_texto(ficha), historial)
            if texto:
                return texto[:2000], PROVEEDOR
        except (urllib.error.URLError, KeyError, IndexError, ValueError, TimeoutError) as error:
            print(f"⚠️  El proveedor de IA ({PROVEEDOR}) no respondió: {error}")
        except Exception as error:  # noqa: BLE001 - nunca dejar caer la respuesta
            print(f"⚠️  Error inesperado del proveedor de IA: {error}")

    return responder_con_catalogo(mensaje, ficha)[:2000], "catalogo"
