# Validaciones y saneamiento del backend.
#
# Estas reglas se ejecutan SIEMPRE, aunque el Frontend ya haya validado
# los mismos campos: nunca se confía en lo que llega del navegador.
#
# Contiene:
#   - REGEX          -> expresiones regulares compartidas
#   - limpiar_texto  -> saneamiento anti-XSS de todo texto libre
#   - validate_*     -> reglas de negocio por entidad

import html
import re
import unicodedata

REGEX = {
    "email": re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"),
    "solo_letras": re.compile(r"^[a-zA-ZÀ-ÿ\s]+$"),
    "solo_numeros": re.compile(r"^[0-9]+$"),
    "telefono": re.compile(r"^[0-9]{7,15}$"),
    "password": re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"),
    "caracteres_permitidos": re.compile(r"^[a-zA-Z0-9À-ÿ\s.,#\-]*$"),
    "url_imagen": re.compile(r"^(https?://|/)[^\s<>\"']+$", re.IGNORECASE),
}

TIPOS_DOCUMENTO_VALIDOS = ["CC", "TI", "CE", "PA"]
METODOS_PAGO_VALIDOS = ["contraentrega", "transferencia", "efectivo"]
ESTADOS_VENTA = ["pendiente", "pagada", "enviada", "entregada", "cancelada"]
ESTADOS_SOLICITUD = ["pendiente", "en_proceso", "completada", "cancelada"]
ESTADOS_MENSAJE = ["nuevo", "leido", "respondido"]
TIPOS_MOVIMIENTO = ["entrada", "salida", "ajuste"]

# Etiquetas y atributos peligrosos que nunca deben quedar guardados.
_ETIQUETAS = re.compile(r"<[^>]*>")
_PROTOCOLOS_PELIGROSOS = re.compile(
    r"(javascript|vbscript|data)\s*:", re.IGNORECASE
)


def _s(value):
    """Convierte a str vacío si viene None, para evitar errores en regex/len."""
    return value if isinstance(value, str) else ""


def limpiar_texto(valor, max_len: int | None = None):
    """Sanea texto libre antes de guardarlo (defensa contra XSS almacenado).

    Quita etiquetas HTML, neutraliza protocolos peligrosos y escapa los
    caracteres especiales restantes. React ya escapa al renderizar, pero
    el dato también se guarda limpio en la base de datos para que
    cualquier otro consumidor de la API (Postman, un reporte, un correo)
    reciba contenido seguro.
    """
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return ""
    texto = _ETIQUETAS.sub("", texto)
    texto = _PROTOCOLOS_PELIGROSOS.sub("", texto)
    texto = html.escape(texto, quote=False)
    if max_len:
        texto = texto[:max_len]
    return texto


def slugify(texto: str) -> str:
    """Genera un slug ASCII a partir de un nombre (para categorías)."""
    normalizado = unicodedata.normalize("NFKD", str(texto))
    ascii_texto = normalizado.encode("ascii", "ignore").decode("ascii").lower()
    ascii_texto = re.sub(r"[^a-z0-9]+", "-", ascii_texto).strip("-")
    return ascii_texto or "categoria"


def _is_number(value):
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def _url_valida(value) -> bool:
    url = _s(value).strip()
    if not url:
        return True  # opcional
    return bool(REGEX["url_imagen"].match(url)) and len(url) <= 255


# ---------------------------------------------------------------
# Usuarios y autenticación
# ---------------------------------------------------------------
def validate_registro(body: dict):
    errors = {}

    nombre = _s(body.get("nombre"))
    apellido = _s(body.get("apellido"))
    tipo_documento = body.get("tipoDocumento")
    numero_documento = _s(body.get("numeroDocumento"))
    direccion = _s(body.get("direccion"))
    telefono = _s(body.get("telefono"))
    email = _s(body.get("email"))
    password = _s(body.get("password"))

    if not nombre or len(nombre.strip()) < 2 or len(nombre) > 40 or not REGEX["solo_letras"].match(nombre):
        errors["nombre"] = "El nombre debe tener entre 2 y 40 caracteres y contener solo letras."
    if not apellido or len(apellido.strip()) < 2 or len(apellido) > 40 or not REGEX["solo_letras"].match(apellido):
        errors["apellido"] = "El apellido debe tener entre 2 y 40 caracteres y contener solo letras."
    if not tipo_documento or tipo_documento not in TIPOS_DOCUMENTO_VALIDOS:
        errors["tipoDocumento"] = "Selecciona un tipo de documento válido."
    if (
        not numero_documento
        or not REGEX["solo_numeros"].match(numero_documento)
        or len(numero_documento) < 6
        or len(numero_documento) > 12
    ):
        errors["numeroDocumento"] = "El número de documento debe tener entre 6 y 12 dígitos numéricos."
    if (
        not direccion
        or len(direccion.strip()) < 10
        or len(direccion) > 150
        or not REGEX["caracteres_permitidos"].match(direccion)
    ):
        errors["direccion"] = "La dirección debe tener entre 10 y 150 caracteres."
    if not telefono or not REGEX["telefono"].match(telefono):
        errors["telefono"] = "El teléfono debe tener entre 7 y 15 dígitos numéricos."
    if not email or not REGEX["email"].match(email) or len(email) > 120:
        errors["email"] = "Correo electrónico inválido."
    if not password or len(password) < 8 or len(password) > 20 or not REGEX["password"].match(password):
        errors["password"] = "La contraseña debe tener 8-20 caracteres, mayúscula, minúscula y número."

    return len(errors) == 0, errors


def validate_login(body: dict):
    errors = {}
    email = _s(body.get("email"))
    password = body.get("password")

    if not email or not REGEX["email"].match(email):
        errors["email"] = "Correo electrónico inválido."
    if not password:
        errors["password"] = "La contraseña es obligatoria."

    return len(errors) == 0, errors


def validate_perfil(body: dict):
    """Datos que el propio usuario puede editar de su cuenta."""
    errors = {}
    nombre = _s(body.get("nombre"))
    apellido = _s(body.get("apellido"))
    direccion = _s(body.get("direccion"))
    telefono = _s(body.get("telefono"))

    if not nombre or len(nombre.strip()) < 2 or len(nombre) > 40 or not REGEX["solo_letras"].match(nombre):
        errors["nombre"] = "El nombre debe tener entre 2 y 40 caracteres y contener solo letras."
    if not apellido or len(apellido.strip()) < 2 or len(apellido) > 40 or not REGEX["solo_letras"].match(apellido):
        errors["apellido"] = "El apellido debe tener entre 2 y 40 caracteres y contener solo letras."
    if not direccion or len(direccion.strip()) < 10 or len(direccion) > 150:
        errors["direccion"] = "La dirección debe tener entre 10 y 150 caracteres."
    if not telefono or not REGEX["telefono"].match(telefono):
        errors["telefono"] = "El teléfono debe tener entre 7 y 15 dígitos numéricos."

    return len(errors) == 0, errors


def validate_password_nueva(password: str):
    errors = {}
    valor = _s(password)
    if not valor or len(valor) < 8 or len(valor) > 20 or not REGEX["password"].match(valor):
        errors["passwordNueva"] = (
            "La contraseña debe tener 8-20 caracteres, mayúscula, minúscula y número."
        )
    return len(errors) == 0, errors


# ---------------------------------------------------------------
# Catálogo
# ---------------------------------------------------------------
def validate_categoria(body: dict):
    errors = {}
    nombre = _s(body.get("nombre"))
    if not nombre or len(nombre.strip()) < 2 or len(nombre) > 60:
        errors["nombre"] = "El nombre de la categoría debe tener entre 2 y 60 caracteres."
    descripcion = _s(body.get("descripcion"))
    if descripcion and len(descripcion) > 255:
        errors["descripcion"] = "La descripción no puede superar los 255 caracteres."
    return len(errors) == 0, errors


def validate_producto(body: dict):
    errors = {}
    nombre = _s(body.get("nombre"))
    marca = _s(body.get("marca"))
    precio = body.get("precio")
    precio_anterior = body.get("precio_anterior")
    stock = body.get("stock")
    stock_minimo = body.get("stock_minimo")

    if not nombre or len(nombre.strip()) < 2 or len(nombre) > 80:
        errors["nombre"] = "El nombre del producto debe tener entre 2 y 80 caracteres."
    if not marca or len(marca.strip()) < 2 or len(marca) > 40:
        errors["marca"] = "La marca debe tener entre 2 y 40 caracteres."
    if precio is None or not _is_number(precio) or float(precio) < 0:
        errors["precio"] = "El precio debe ser un número mayor o igual a 0."
    elif float(precio) > 999999999:
        errors["precio"] = "El precio supera el máximo permitido."
    if precio_anterior not in (None, "") and (
        not _is_number(precio_anterior) or float(precio_anterior) < 0
    ):
        errors["precio_anterior"] = "El precio anterior debe ser un número válido."
    if stock is not None and (not _is_number(stock) or int(float(stock)) < 0):
        errors["stock"] = "El stock debe ser un número entero mayor o igual a 0."
    if stock_minimo is not None and (
        not _is_number(stock_minimo) or int(float(stock_minimo)) < 0
    ):
        errors["stock_minimo"] = "El stock mínimo debe ser un número entero mayor o igual a 0."
    if not _url_valida(body.get("imagen_url")):
        errors["imagen_url"] = "La URL de la imagen no es válida (debe empezar por http:// o https://)."

    return len(errors) == 0, errors


def validate_servicio(body: dict):
    errors = {}
    nombre = _s(body.get("nombre"))
    precio = body.get("precio")

    if not nombre or len(nombre.strip()) < 2 or len(nombre) > 80:
        errors["nombre"] = "El nombre del servicio debe tener entre 2 y 80 caracteres."
    if precio is None or not _is_number(precio) or float(precio) < 0:
        errors["precio"] = "El precio debe ser un número mayor o igual a 0."
    if not _url_valida(body.get("imagen_url")):
        errors["imagen_url"] = "La URL de la imagen no es válida."

    return len(errors) == 0, errors


# ---------------------------------------------------------------
# Ventas
# ---------------------------------------------------------------
def validate_venta(body: dict):
    """Valida los datos de envío del pedido.

    Los precios NO se validan aquí porque no llegan del cliente: se
    calculan en el backend leyendo la tabla productos.
    """
    errors = {}

    nombre = _s(body.get("cliente_nombre"))
    email = _s(body.get("cliente_email"))
    telefono = _s(body.get("cliente_telefono"))
    documento = _s(body.get("cliente_documento"))
    direccion = _s(body.get("direccion_envio"))
    ciudad = _s(body.get("ciudad"))
    metodo_pago = _s(body.get("metodo_pago")) or "contraentrega"

    if not nombre or len(nombre.strip()) < 3 or len(nombre) > 90:
        errors["cliente_nombre"] = "El nombre debe tener entre 3 y 90 caracteres."
    if not email or not REGEX["email"].match(email):
        errors["cliente_email"] = "Correo electrónico inválido."
    if not telefono or not REGEX["telefono"].match(telefono):
        errors["cliente_telefono"] = "El teléfono debe tener entre 7 y 15 dígitos numéricos."
    if documento and (
        not REGEX["solo_numeros"].match(documento)
        or len(documento) < 6
        or len(documento) > 12
    ):
        errors["cliente_documento"] = "El documento debe tener entre 6 y 12 dígitos numéricos."
    if not direccion or len(direccion.strip()) < 10 or len(direccion) > 150:
        errors["direccion_envio"] = "La dirección debe tener entre 10 y 150 caracteres."
    if not ciudad or len(ciudad.strip()) < 3 or len(ciudad) > 60:
        errors["ciudad"] = "Escribe una ciudad válida."
    if metodo_pago not in METODOS_PAGO_VALIDOS:
        errors["metodo_pago"] = "Selecciona un método de pago válido."

    items = body.get("items") or []
    if not items:
        errors["items"] = "El carrito no puede estar vacío."
    else:
        vistos = set()
        for item in items:
            id_producto = item.get("id_producto") if isinstance(item, dict) else None
            if id_producto in vistos:
                errors["items"] = "Hay productos repetidos en el pedido."
                break
            vistos.add(id_producto)

    return len(errors) == 0, errors


# ---------------------------------------------------------------
# Atención al cliente
# ---------------------------------------------------------------
def validate_solicitud(body: dict):
    errors = {}
    nombre = _s(body.get("cliente_nombre"))
    email = _s(body.get("cliente_email"))
    telefono = _s(body.get("cliente_telefono"))
    descripcion = _s(body.get("descripcion"))

    if not nombre or len(nombre.strip()) < 3 or len(nombre) > 90:
        errors["cliente_nombre"] = "El nombre debe tener entre 3 y 90 caracteres."
    if not email or not REGEX["email"].match(email):
        errors["cliente_email"] = "Correo electrónico inválido."
    if not telefono or not REGEX["telefono"].match(telefono):
        errors["cliente_telefono"] = "El teléfono debe tener entre 7 y 15 dígitos numéricos."
    if not descripcion or len(descripcion.strip()) < 10 or len(descripcion) > 500:
        errors["descripcion"] = "Describe el caso con al menos 10 caracteres."

    return len(errors) == 0, errors


def validate_mensaje(body: dict):
    errors = {}
    nombre = _s(body.get("nombre"))
    email = _s(body.get("email"))
    telefono = _s(body.get("telefono"))
    asunto = _s(body.get("asunto"))
    mensaje = _s(body.get("mensaje"))

    if not nombre or len(nombre.strip()) < 2 or len(nombre) > 80:
        errors["nombre"] = "El nombre debe tener entre 2 y 80 caracteres."
    if not email or not REGEX["email"].match(email):
        errors["email"] = "Correo electrónico inválido."
    if telefono and not REGEX["telefono"].match(telefono):
        errors["telefono"] = "El teléfono debe tener entre 7 y 15 dígitos numéricos."
    if not asunto or len(asunto.strip()) < 3 or len(asunto) > 120:
        errors["asunto"] = "El asunto debe tener entre 3 y 120 caracteres."
    if not mensaje or len(mensaje.strip()) < 10 or len(mensaje) > 1000:
        errors["mensaje"] = "El mensaje debe tener entre 10 y 1000 caracteres."

    return len(errors) == 0, errors


def validate_email_simple(email: str) -> bool:
    """Comprueba un correo suelto, fuera de un formulario completo.

    Los validadores de arriba devuelven un diccionario de errores por
    campo; esta versión es para cuando solo hace falta saber si una
    dirección tiene forma de correo.
    """
    email = _s(email)
    return bool(email) and len(email) <= 120 and bool(REGEX["email"].match(email))
