"""Pruebas automatizadas de la API de PhoneStore.

Recorre todos los endpoints con los métodos GET, POST, PUT, PATCH y
DELETE, comprobando además la autenticación JWT, el control de roles,
las validaciones del backend, el descuento de stock y las reglas de
integridad de las ventas.

No requiere librerías externas: usa urllib de la biblioteca estándar.

Uso (con el backend corriendo en http://127.0.0.1:3000):

    cd backend-fastapi
    venv\\Scripts\\activate
    python -m tests.pruebas_api

Al terminar genera:
    tests/evidencia_pruebas_api.md    resumen legible de cada prueba
    tests/evidencia_pruebas_api.json  respuestas completas
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

BASE_URL = os.getenv("API_URL", "http://127.0.0.1:3000/api")
CARPETA = Path(__file__).resolve().parent

resultados = []
_contador = {"ok": 0, "fallo": 0}


# ---------------------------------------------------------------
# Utilidades HTTP
# ---------------------------------------------------------------
def peticion(metodo, ruta, body=None, token=None):
    url = f"{BASE_URL}{ruta}"
    datos = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=datos, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            cuerpo = resp.read().decode("utf-8")
            return resp.status, (json.loads(cuerpo) if cuerpo else {})
    except urllib.error.HTTPError as error:
        cuerpo = error.read().decode("utf-8")
        try:
            return error.code, json.loads(cuerpo) if cuerpo else {}
        except json.JSONDecodeError:
            return error.code, {"raw": cuerpo}
    except urllib.error.URLError as error:
        print(f"\n❌ No se pudo conectar con {url}: {error.reason}")
        print("   Asegúrate de que el backend esté corriendo antes de lanzar las pruebas.")
        sys.exit(1)


def verificar(nombre, metodo, ruta, esperado, status, data, comentario=""):
    esperados = esperado if isinstance(esperado, (list, tuple)) else [esperado]
    paso = status in esperados
    _contador["ok" if paso else "fallo"] += 1
    resultados.append(
        {
            "prueba": nombre,
            "metodo": metodo,
            "endpoint": ruta,
            "status_esperado": " o ".join(str(e) for e in esperados),
            "status_obtenido": status,
            "resultado": "OK" if paso else "FALLO",
            "comentario": comentario,
            "respuesta": data,
        }
    )
    icono = "✅" if paso else "❌"
    print(f"{icono} [{metodo:6}] {ruta:42} -> {status:3}  {nombre}")
    if not paso:
        print(f"      esperado {esperados}, respuesta: {str(data)[:300]}")
    return paso


def titulo(texto):
    print(f"\n{'=' * 78}\n  {texto}\n{'=' * 78}")


# ---------------------------------------------------------------
# Pruebas
# ---------------------------------------------------------------
def main():
    sufijo = str(int(time.time()))[-8:]
    email_cliente = f"cliente.test{sufijo}@phonestore.com"
    documento_cliente = sufijo.rjust(9, "1")[:9]
    password_cliente = "Cliente1234"

    admin_email = os.getenv("ADMIN_EMAIL_TEST") or _leer_env("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD_TEST") or _leer_env("ADMIN_PASSWORD")

    titulo("1. SISTEMA")
    status, data = peticion("GET", "/health")
    verificar("La API responde", "GET", "/api/health", 200, status, data)

    # -----------------------------------------------------------
    titulo("2. REGISTRO Y VALIDACIONES DEL BACKEND")

    status, data = peticion(
        "POST",
        "/auth/register",
        {
            "nombre": "A",
            "apellido": "1234",
            "tipoDocumento": "XX",
            "numeroDocumento": "abc",
            "direccion": "corta",
            "telefono": "123",
            "email": "no-es-correo",
            "password": "123",
        },
    )
    verificar(
        "Rechaza un registro con todos los campos inválidos",
        "POST", "/api/auth/register", 422, status, data,
        "El esquema Pydantic rechaza los campos mal formados",
    )

    status, data = peticion(
        "POST",
        "/auth/register",
        {
            "nombre": "Cliente",
            "apellido": "Pruebas",
            "tipoDocumento": "CC",
            "numeroDocumento": documento_cliente,
            "direccion": "Calle 45 # 12-34 Medellin",
            "telefono": "3001234567",
            "email": email_cliente,
            "password": password_cliente,
        },
    )
    verificar("Registra un cliente nuevo", "POST", "/api/auth/register", 201, status, data)
    token_cliente = data.get("token")
    usuario_cliente = data.get("usuario", {})
    id_cliente = usuario_cliente.get("id_usuario")

    if usuario_cliente.get("rol") != "cliente":
        verificar("El registro público asigna rol cliente", "POST", "/api/auth/register",
                  201, 0, data, "El rol devuelto no es 'cliente'")
    else:
        verificar("El registro público siempre asigna rol cliente", "POST",
                  "/api/auth/register", 201, 201, {"rol": "cliente"},
                  "No se puede autoasignar rol administrador")

    if "password" in json.dumps(usuario_cliente).lower():
        verificar("La respuesta no expone la contraseña", "POST", "/api/auth/register",
                  201, 0, usuario_cliente, "Se filtró información sensible")
    else:
        verificar("La respuesta nunca incluye la contraseña ni su hash", "POST",
                  "/api/auth/register", 201, 201, {"campos": list(usuario_cliente.keys())})

    status, data = peticion(
        "POST",
        "/auth/register",
        {
            "nombre": "Cliente",
            "apellido": "Repetido",
            "tipoDocumento": "CC",
            "numeroDocumento": documento_cliente,
            "direccion": "Calle 45 # 12-34 Medellin",
            "telefono": "3001234567",
            "email": email_cliente,
            "password": password_cliente,
        },
    )
    verificar("Impide correo y documento duplicados", "POST", "/api/auth/register",
              409, status, data)

    # -----------------------------------------------------------
    titulo("3. INICIO DE SESIÓN Y JWT")

    status, data = peticion("POST", "/auth/login",
                            {"email": email_cliente, "password": "ClaveMala123"})
    verificar("Rechaza contraseña incorrecta", "POST", "/api/auth/login", 401, status, data)

    status, data = peticion("POST", "/auth/login",
                            {"email": email_cliente, "password": password_cliente})
    verificar("Login correcto devuelve JWT", "POST", "/api/auth/login", 200, status, data)
    token_cliente = data.get("token", token_cliente)

    status, data = peticion("GET", "/auth/me", token=token_cliente)
    verificar("Consulta la sesión actual con el token", "GET", "/api/auth/me", 200, status, data)

    status, data = peticion("GET", "/auth/me")
    verificar("Sin token responde 401", "GET", "/api/auth/me", 401, status, data)

    status, data = peticion("GET", "/auth/me", token="token.falso.inventado")
    verificar("Con token inválido responde 401", "GET", "/api/auth/me", 401, status, data)

    status, data = peticion("POST", "/auth/login",
                            {"email": admin_email, "password": admin_password})
    ok_admin = verificar("Login del administrador", "POST", "/api/auth/login", 200, status, data)
    token_admin = data.get("token")
    if not ok_admin:
        print("\n⚠️  Sin sesión de administrador no se pueden probar las rutas protegidas.")
        print("   Revisa ADMIN_EMAIL / ADMIN_PASSWORD en backend-fastapi/.env y ejecuta seed_admin.")
        guardar_evidencia()
        sys.exit(1)

    # -----------------------------------------------------------
    titulo("4. CONTROL DE ROLES Y PROTECCIÓN DE ENDPOINTS")

    status, data = peticion("GET", "/usuarios", token=token_cliente)
    verificar("Un cliente NO puede listar usuarios", "GET", "/api/usuarios", 403, status, data,
              "Aunque escriba la URL a mano, el backend responde 403")

    status, data = peticion("GET", "/dashboard/resumen", token=token_cliente)
    verificar("Un cliente NO puede ver el dashboard", "GET", "/api/dashboard/resumen",
              403, status, data)

    status, data = peticion("POST", "/productos", {
        "nombre": "Producto pirata", "marca": "Falsa", "precio": 1000, "stock": 5,
    }, token=token_cliente)
    verificar("Un cliente NO puede crear productos", "POST", "/api/productos",
              403, status, data)

    status, data = peticion("GET", "/usuarios", token=token_admin)
    verificar("El administrador sí puede listar usuarios", "GET", "/api/usuarios",
              200, status, data)

    # -----------------------------------------------------------
    titulo("5. CATEGORÍAS (CRUD)")

    status, data = peticion("GET", "/categorias")
    verificar("Lista pública de categorías", "GET", "/api/categorias", 200, status, data)

    status, data = peticion("POST", "/categorias", {
        "nombre": f"Categoria Test {sufijo}",
        "descripcion": "Categoría creada por las pruebas automatizadas",
        "icono": "phone",
    }, token=token_admin)
    verificar("Crea una categoría", "POST", "/api/categorias", 201, status, data)
    id_categoria = data.get("categoria", {}).get("id_categoria")

    status, data = peticion("PUT", f"/categorias/{id_categoria}", {
        "nombre": f"Categoria Test {sufijo} editada",
        "descripcion": "Descripción actualizada",
        "icono": "phone",
    }, token=token_admin)
    verificar("Edita la categoría", "PUT", f"/api/categorias/{id_categoria}", 200, status, data)

    status, data = peticion("PATCH", f"/categorias/{id_categoria}/estado",
                            {"estado": "inactivo"}, token=token_admin)
    verificar("Cambia el estado de la categoría", "PATCH",
              f"/api/categorias/{id_categoria}/estado", 200, status, data)

    # -----------------------------------------------------------
    titulo("6. PRODUCTOS (CRUD + FILTROS)")

    status, data = peticion("GET", "/productos?pagina=1&limite=5")
    verificar("Catálogo público paginado", "GET", "/api/productos", 200, status, data)

    status, data = peticion("GET", "/productos?buscar=iphone&orden=precio_asc")
    verificar("Búsqueda y ordenamiento del catálogo", "GET",
              "/api/productos?buscar=...", 200, status, data)

    status, data = peticion("POST", "/productos", {
        "nombre": "P", "marca": "M", "precio": -100, "stock": -5,
    }, token=token_admin)
    verificar("Rechaza un producto con datos inválidos", "POST", "/api/productos",
              422, status, data, "Precio negativo y nombre muy corto")

    status, data = peticion("POST", "/productos", {
        "nombre": f"Producto Test {sufijo}",
        "marca": "MarcaTest",
        "id_categoria": id_categoria,
        "descripcion": "Producto creado por las pruebas automatizadas",
        "precio": 500000,
        "stock": 10,
        "stock_minimo": 3,
        "destacado": False,
        "imagen_url": "/img/iphone-17.webp",
    }, token=token_admin)
    verificar("Crea un producto", "POST", "/api/productos", 201, status, data)
    producto = data.get("producto", {})
    id_producto = producto.get("id_producto")

    status, data = peticion("GET", f"/productos/{id_producto}")
    verificar("Consulta un producto por id", "GET", f"/api/productos/{id_producto}",
              200, status, data)

    status, data = peticion("PUT", f"/productos/{id_producto}", {
        "nombre": f"Producto Test {sufijo} editado",
        "marca": "MarcaTest",
        "id_categoria": id_categoria,
        "descripcion": "Descripción actualizada por las pruebas",
        "precio": 450000,
        "stock": 10,
        "stock_minimo": 3,
        "destacado": True,
        "imagen_url": "/img/iphone-17.webp",
    }, token=token_admin)
    verificar("Edita el producto", "PUT", f"/api/productos/{id_producto}", 200, status, data)

    status, data = peticion("PATCH", f"/productos/{id_producto}/estado",
                            {"estado": "inactivo"}, token=token_admin)
    verificar("Desactiva el producto", "PATCH", f"/api/productos/{id_producto}/estado",
              200, status, data)

    status, data = peticion("PATCH", f"/productos/{id_producto}/estado",
                            {"estado": "activo"}, token=token_admin)
    verificar("Reactiva el producto", "PATCH", f"/api/productos/{id_producto}/estado",
              200, status, data)

    status, data = peticion("GET", "/productos/marcas")
    verificar("Lista las marcas del catálogo", "GET", "/api/productos/marcas",
              200, status, data)

    # -----------------------------------------------------------
    titulo("7. INVENTARIO (KARDEX)")

    status, data = peticion("POST", "/inventario/movimientos", {
        "id_producto": id_producto, "tipo": "entrada", "cantidad": 5,
        "motivo": "Ingreso de mercancía (prueba)",
    }, token=token_admin)
    verificar("Registra una entrada de inventario", "POST", "/api/inventario/movimientos",
              201, status, data, "Stock 10 -> 15")
    stock_actual = data.get("producto", {}).get("stock")

    status, data = peticion("POST", "/inventario/movimientos", {
        "id_producto": id_producto, "tipo": "salida", "cantidad": 9999,
        "motivo": "Salida imposible",
    }, token=token_admin)
    verificar("Impide retirar más stock del disponible", "POST",
              "/api/inventario/movimientos", 409, status, data)

    status, data = peticion("GET", f"/inventario/movimientos?id_producto={id_producto}",
                            token=token_admin)
    verificar("Consulta el historial de movimientos", "GET",
              "/api/inventario/movimientos", 200, status, data)

    status, data = peticion("GET", "/inventario/alertas", token=token_admin)
    verificar("Consulta alertas de stock bajo y agotados", "GET",
              "/api/inventario/alertas", 200, status, data)

    # -----------------------------------------------------------
    titulo("8. VENTAS: REGISTRO, STOCK Y SEGURIDAD DE PRECIOS")

    datos_envio = {
        "cliente_nombre": "Cliente Pruebas",
        "cliente_email": email_cliente,
        "cliente_telefono": "3001234567",
        "cliente_documento": documento_cliente,
        "direccion_envio": "Calle 45 # 12-34 Medellin",
        "ciudad": "Medellin",
        "notas": "Pedido generado por las pruebas automatizadas",
        "metodo_pago": "contraentrega",
    }

    status, data = peticion("POST", "/ventas", {
        "items": [{"id_producto": id_producto, "cantidad": 2}], **datos_envio,
    })
    verificar("No se puede comprar sin iniciar sesión", "POST", "/api/ventas",
              401, status, data)

    status, data = peticion("POST", "/ventas", {
        "items": [{"id_producto": id_producto, "cantidad": 99999}], **datos_envio,
    }, token=token_cliente)
    verificar("Rechaza cantidades fuera de rango en el carrito", "POST", "/api/ventas",
              422, status, data, "El esquema limita la cantidad por línea")

    status, data = peticion("POST", "/ventas", {
        "items": [{"id_producto": id_producto, "cantidad": stock_actual + 1}], **datos_envio,
    }, token=token_cliente)
    verificar("Impide comprar más unidades de las disponibles", "POST", "/api/ventas",
              409, status, data,
              f"Hay {stock_actual} unidades y se intentan comprar {stock_actual + 1}")

    # Intento de manipulación: se envían precio y total falsos en el body.
    status, data = peticion("POST", "/ventas", {
        "items": [{"id_producto": id_producto, "cantidad": 2, "precio": 1, "subtotal": 2}],
        "subtotal": 2, "total": 2, **datos_envio,
    }, token=token_cliente)
    ok_venta = verificar("Registra la venta ignorando los precios enviados por el cliente",
                         "POST", "/api/ventas", 201, status, data,
                         "El backend recalcula todo con el precio real de la base de datos")
    venta = data.get("venta", {})
    id_venta = venta.get("id_venta")
    total_real = venta.get("total")

    if ok_venta:
        precio_unitario = (venta.get("detalles") or [{}])[0].get("precio_unitario")
        correcto = precio_unitario == 450000 and total_real not in (2, "2")
        verificar(
            "El precio guardado es el real (450.000), no el manipulado (1)",
            "POST", "/api/ventas", 201, 201 if correcto else 0,
            {"precio_unitario": precio_unitario, "total": total_real},
        )

    status, data = peticion("GET", f"/productos/{id_producto}")
    nuevo_stock = data.get("producto", {}).get("stock")
    verificar(
        "El stock se descontó automáticamente tras la venta",
        "GET", f"/api/productos/{id_producto}",
        200, 200 if nuevo_stock == (stock_actual - 2) else 0,
        {"stock_antes": stock_actual, "stock_despues": nuevo_stock},
    )

    status, data = peticion("GET", "/ventas/mis-pedidos", token=token_cliente)
    verificar("El cliente consulta sus propios pedidos", "GET", "/api/ventas/mis-pedidos",
              200, status, data)

    status, data = peticion("GET", "/ventas", token=token_cliente)
    verificar("Un cliente NO puede listar todas las ventas", "GET", "/api/ventas",
              403, status, data)

    status, data = peticion("GET", "/ventas?pagina=1&limite=5", token=token_admin)
    verificar("El administrador lista las ventas con paginación", "GET", "/api/ventas",
              200, status, data)

    status, data = peticion("GET", f"/ventas/{id_venta}", token=token_admin)
    verificar("Consulta el detalle de una venta", "GET", f"/api/ventas/{id_venta}",
              200, status, data, "Incluye productos, cantidades y precios de la compra")

    status, data = peticion("PATCH", f"/ventas/{id_venta}/estado",
                            {"estado": "entregada"}, token=token_admin)
    verificar("Impide saltos de estado inválidos (pendiente -> entregada)", "PATCH",
              f"/api/ventas/{id_venta}/estado", 409, status, data)

    status, data = peticion("PATCH", f"/ventas/{id_venta}/estado",
                            {"estado": "pagada"}, token=token_admin)
    verificar("Marca el pedido como pagado", "PATCH", f"/api/ventas/{id_venta}/estado",
              200, status, data)

    status, data = peticion("PATCH", f"/ventas/{id_venta}/estado",
                            {"estado": "cancelada"}, token=token_admin)
    verificar("Cancela el pedido", "PATCH", f"/api/ventas/{id_venta}/estado",
              200, status, data)

    status, data = peticion("GET", f"/productos/{id_producto}")
    stock_restaurado = data.get("producto", {}).get("stock")
    verificar(
        "Al cancelar, las unidades vuelven al inventario",
        "GET", f"/api/productos/{id_producto}",
        200, 200 if stock_restaurado == stock_actual else 0,
        {"stock_tras_cancelar": stock_restaurado, "esperado": stock_actual},
    )

    # -----------------------------------------------------------
    titulo("9. SERVICIOS Y SOLICITUDES")

    status, data = peticion("GET", "/servicios")
    verificar("Lista pública de servicios", "GET", "/api/servicios", 200, status, data)
    servicios = data.get("servicios", [])
    id_servicio = servicios[0]["id_servicio"] if servicios else None

    status, data = peticion("POST", "/servicios", {
        "nombre": f"Servicio Test {sufijo}",
        "descripcion": "Servicio creado por las pruebas automatizadas",
        "precio": 90000,
        "duracion": "1 hora",
        "icono": "search",
    }, token=token_admin)
    verificar("Crea un servicio", "POST", "/api/servicios", 201, status, data)
    id_servicio_test = data.get("servicio", {}).get("id_servicio")

    status, data = peticion("PUT", f"/servicios/{id_servicio_test}", {
        "nombre": f"Servicio Test {sufijo} editado",
        "descripcion": "Descripción actualizada",
        "precio": 95000,
        "duracion": "2 horas",
        "icono": "search",
    }, token=token_admin)
    verificar("Edita el servicio", "PUT", f"/api/servicios/{id_servicio_test}",
              200, status, data)

    status, data = peticion("POST", "/solicitudes", {
        "id_servicio": id_servicio,
        "cliente_nombre": "Cliente Pruebas",
        "cliente_email": email_cliente,
        "cliente_telefono": "3001234567",
        "equipo": "iPhone 13 Pro",
        "descripcion": "La pantalla no responde al tacto en la zona inferior.",
    }, token=token_cliente)
    verificar("El cliente agenda un servicio técnico", "POST", "/api/solicitudes",
              201, status, data)
    id_solicitud = data.get("solicitud", {}).get("id_solicitud")

    status, data = peticion("POST", "/solicitudes", {
        "id_servicio": id_servicio,
        "cliente_nombre": "X",
        "cliente_email": "correo-malo",
        "cliente_telefono": "1",
        "descripcion": "corto",
    }, token=token_cliente)
    verificar("Valida los datos de la solicitud", "POST", "/api/solicitudes",
              422, status, data)

    status, data = peticion("GET", "/solicitudes/mis-solicitudes", token=token_cliente)
    verificar("El cliente ve sus solicitudes", "GET", "/api/solicitudes/mis-solicitudes",
              200, status, data)

    status, data = peticion("GET", "/solicitudes", token=token_admin)
    verificar("El administrador lista las solicitudes", "GET", "/api/solicitudes",
              200, status, data)

    status, data = peticion("PATCH", f"/solicitudes/{id_solicitud}", {
        "estado": "en_proceso",
        "respuesta": "Recibimos tu equipo, el diagnóstico estará listo mañana.",
    }, token=token_admin)
    verificar("Atiende la solicitud desde el panel", "PATCH",
              f"/api/solicitudes/{id_solicitud}", 200, status, data)

    # -----------------------------------------------------------
    titulo("10. FORMULARIO DE CONTACTO")

    status, data = peticion("POST", "/contacto", {
        "nombre": "Visitante de prueba",
        "email": "visitante@example.com",
        "telefono": "3009998877",
        "asunto": "Consulta sobre garantías",
        "mensaje": "Quisiera saber si los equipos tienen garantía extendida disponible.",
    })
    verificar("Envía un mensaje de contacto", "POST", "/api/contacto", 201, status, data)

    status, data = peticion("POST", "/contacto", {
        "nombre": "<script>alert(1)</script>",
        "email": "xss@example.com",
        "asunto": "<img src=x onerror=alert(1)>",
        "mensaje": "<script>document.cookie</script> intento de inyección de código.",
    })
    verificar("Acepta el envío pero limpia el HTML (anti-XSS)", "POST", "/api/contacto",
              201, status, data, "Las etiquetas se eliminan antes de guardar")

    status, data = peticion("GET", "/contacto", token=token_admin)
    verificar("El administrador ve la bandeja de mensajes", "GET", "/api/contacto",
              200, status, data)
    mensajes = data.get("mensajes", [])
    id_mensaje = mensajes[0]["id_mensaje"] if mensajes else None
    if mensajes:
        guardado = json.dumps(mensajes[0], ensure_ascii=False)
        limpio = "<script>" not in guardado and "onerror=" not in guardado
        verificar("Ningún mensaje guardado contiene etiquetas HTML ejecutables",
                  "GET", "/api/contacto", 200, 200 if limpio else 0,
                  {"nombre_guardado": mensajes[0].get("nombre")})

    if id_mensaje:
        status, data = peticion("PATCH", f"/contacto/{id_mensaje}/estado",
                                {"estado": "leido"}, token=token_admin)
        verificar("Marca un mensaje como leído", "PATCH",
                  f"/api/contacto/{id_mensaje}/estado", 200, status, data)

    status, data = peticion("GET", "/contacto", token=token_cliente)
    verificar("Un cliente NO puede leer la bandeja de contacto", "GET", "/api/contacto",
              403, status, data)

    # -----------------------------------------------------------
    titulo("11. DASHBOARD Y REPORTES")

    status, data = peticion("GET", "/dashboard/resumen", token=token_admin)
    verificar("Resumen del dashboard", "GET", "/api/dashboard/resumen", 200, status, data)

    status, data = peticion("GET", "/dashboard/reporte", token=token_admin)
    verificar("Reporte de ventas del mes", "GET", "/api/dashboard/reporte",
              200, status, data)

    status, data = peticion("GET", "/dashboard/reporte?desde=2020-01-01&hasta=2019-01-01",
                            token=token_admin)
    verificar("Valida el rango de fechas del reporte", "GET", "/api/dashboard/reporte",
              400, status, data)

    # -----------------------------------------------------------
    titulo("12. GESTIÓN DE USUARIOS")

    status, data = peticion("GET", f"/usuarios?buscar={email_cliente}", token=token_admin)
    verificar("Busca usuarios por correo", "GET", "/api/usuarios?buscar=...",
              200, status, data)

    status, data = peticion("GET", f"/usuarios/{id_cliente}", token=token_admin)
    verificar("Consulta un usuario por id", "GET", f"/api/usuarios/{id_cliente}",
              200, status, data)

    status, data = peticion("PUT", f"/usuarios/{id_cliente}", {
        "nombre": "Cliente", "apellido": "Editado",
        "direccion": "Carrera 70 # 30-20 Medellin",
        "telefono": "3011234567", "email": email_cliente,
    }, token=token_admin)
    verificar("Edita un usuario", "PUT", f"/api/usuarios/{id_cliente}", 200, status, data)

    status, data = peticion("PATCH", f"/usuarios/{id_cliente}/rol",
                            {"id_rol": 2}, token=token_admin)
    verificar("Cambia el rol a empleado", "PATCH", f"/api/usuarios/{id_cliente}/rol",
              200, status, data)

    status, data = peticion("PATCH", f"/usuarios/{id_cliente}/rol",
                            {"id_rol": 9}, token=token_admin)
    verificar("Rechaza un rol inexistente", "PATCH", f"/api/usuarios/{id_cliente}/rol",
              400, status, data)

    status, data = peticion("PATCH", f"/usuarios/{id_cliente}/estado",
                            {"estado": "inactivo"}, token=token_admin)
    verificar("Desactiva un usuario", "PATCH", f"/api/usuarios/{id_cliente}/estado",
              200, status, data)

    status, data = peticion("POST", "/auth/login",
                            {"email": email_cliente, "password": password_cliente})
    verificar("Un usuario inactivo no puede iniciar sesión", "POST", "/api/auth/login",
              403, status, data)

    status, data = peticion("PATCH", f"/usuarios/{id_cliente}/estado",
                            {"estado": "activo"}, token=token_admin)
    verificar("Reactiva el usuario", "PATCH", f"/api/usuarios/{id_cliente}/estado",
              200, status, data)

    id_admin = None
    status, data = peticion("GET", "/auth/me", token=token_admin)
    if status == 200:
        id_admin = data.get("usuario", {}).get("id_usuario")
    if id_admin:
        status, data = peticion("PATCH", f"/usuarios/{id_admin}/estado",
                                {"estado": "inactivo"}, token=token_admin)
        verificar("El administrador no puede desactivarse a sí mismo", "PATCH",
                  f"/api/usuarios/{id_admin}/estado", 400, status, data)

    # -----------------------------------------------------------
    titulo("13. PERFIL Y CONTRASEÑAS")

    status, data = peticion("POST", "/auth/login",
                            {"email": email_cliente, "password": password_cliente})
    token_cliente = data.get("token", token_cliente)

    status, data = peticion("PUT", "/auth/perfil", {
        "nombre": "Cliente", "apellido": "Perfil",
        "direccion": "Calle 10 # 20-30 Medellin", "telefono": "3021234567",
    }, token=token_cliente)
    verificar("El usuario actualiza su propio perfil", "PUT", "/api/auth/perfil",
              200, status, data)

    status, data = peticion("PUT", "/auth/password", {
        "passwordActual": "ClaveIncorrecta1", "passwordNueva": "NuevaClave123",
    }, token=token_cliente)
    verificar("Rechaza el cambio si la contraseña actual es incorrecta", "PUT",
              "/api/auth/password", 400, status, data)

    status, data = peticion("PUT", "/auth/password", {
        "passwordActual": password_cliente, "passwordNueva": "NuevaClave123",
    }, token=token_cliente)
    verificar("Cambia la contraseña correctamente", "PUT", "/api/auth/password",
              200, status, data)

    status, data = peticion("POST", "/auth/login",
                            {"email": email_cliente, "password": "NuevaClave123"})
    verificar("Inicia sesión con la contraseña nueva", "POST", "/api/auth/login",
              200, status, data)

    status, data = peticion("POST", "/auth/recuperar-password", {"email": email_cliente})
    verificar("Solicita recuperación de contraseña", "POST",
              "/api/auth/recuperar-password", 200, status, data)
    sin_token = "token" not in json.dumps(data).lower()
    verificar("La respuesta NO expone el token de recuperación", "POST",
              "/api/auth/recuperar-password", 200, 200 if sin_token else 0, data,
              "El enlace se envía por correo, nunca en el JSON")

    status, data = peticion("POST", "/auth/recuperar-password",
                            {"email": "noexiste@phonestore.com"})
    verificar("No revela si un correo existe o no", "POST",
              "/api/auth/recuperar-password", 200, status, data)

    status, data = peticion("POST", "/auth/restablecer-password",
                            {"token": "token-inventado-que-no-existe", "password": "OtraClave123"})
    verificar("Rechaza un token de recuperación inválido", "POST",
              "/api/auth/restablecer-password", 400, status, data)

    # -----------------------------------------------------------
    titulo("14. LIMPIEZA (DELETE)")

    status, data = peticion("DELETE", f"/servicios/{id_servicio_test}", token=token_cliente)
    verificar("Un cliente NO puede eliminar servicios", "DELETE",
              f"/api/servicios/{id_servicio_test}", 403, status, data)

    status, data = peticion("DELETE", f"/servicios/{id_servicio_test}", token=token_admin)
    verificar("El administrador elimina el servicio de prueba", "DELETE",
              f"/api/servicios/{id_servicio_test}", 200, status, data)

    status, data = peticion("DELETE", f"/productos/{id_producto}", token=token_admin)
    verificar("El producto con ventas se desactiva en vez de borrarse", "DELETE",
              f"/api/productos/{id_producto}", 200, status, data,
              "Protege el histórico de ventas")

    status, data = peticion("DELETE", f"/categorias/{id_categoria}", token=token_admin)
    verificar("No se puede borrar una categoría con productos", "DELETE",
              f"/api/categorias/{id_categoria}", 409, status, data)

    status, data = peticion("DELETE", f"/usuarios/{id_cliente}", token=token_admin)
    verificar("El usuario con pedidos se desactiva en vez de borrarse", "DELETE",
              f"/api/usuarios/{id_cliente}", 200, status, data)

    status, data = peticion("GET", "/productos/999999")
    verificar("Un id inexistente devuelve 404", "GET", "/api/productos/999999",
              404, status, data)

    guardar_evidencia()


def _leer_env(clave, defecto=""):
    ruta = Path(__file__).resolve().parent.parent / ".env"
    if not ruta.exists():
        return defecto
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        if linea.strip().startswith(f"{clave}="):
            return linea.split("=", 1)[1].strip()
    return defecto


def guardar_evidencia():
    total = _contador["ok"] + _contador["fallo"]
    print(f"\n{'=' * 78}")
    print(f"  RESULTADO: {_contador['ok']}/{total} pruebas superadas "
          f"({_contador['fallo']} fallo(s))")
    print(f"{'=' * 78}\n")

    (CARPETA / "evidencia_pruebas_api.json").write_text(
        json.dumps(resultados, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    lineas = [
        "# Evidencia de pruebas de la API - PhoneStore",
        "",
        f"**Fecha de ejecución:** {datetime.now():%Y-%m-%d %H:%M:%S}  ",
        f"**URL base:** `{BASE_URL}`  ",
        f"**Resultado:** {_contador['ok']} de {total} pruebas superadas",
        "",
        "Estas pruebas se ejecutan con `python -m tests.pruebas_api` y recorren "
        "todos los endpoints de la API usando los métodos GET, POST, PUT, PATCH y "
        "DELETE, comprobando autenticación JWT, control de roles, validaciones del "
        "backend, control de stock e integridad de las ventas.",
        "",
        "| # | Método | Endpoint | Prueba | Esperado | Obtenido | Resultado |",
        "|---|--------|----------|--------|----------|----------|-----------|",
    ]
    for i, r in enumerate(resultados, 1):
        prueba = r["prueba"].replace("|", "\\|")
        lineas.append(
            f"| {i} | {r['metodo']} | `{r['endpoint']}` | {prueba} | "
            f"{r['status_esperado']} | {r['status_obtenido']} | {r['resultado']} |"
        )

    lineas += ["", "## Detalle de las respuestas", ""]
    for i, r in enumerate(resultados, 1):
        lineas.append(f"### {i}. {r['prueba']}")
        lineas.append("")
        lineas.append(f"`{r['metodo']} {r['endpoint']}` → **{r['status_obtenido']}** "
                      f"({r['resultado']})")
        if r["comentario"]:
            lineas.append("")
            lineas.append(f"> {r['comentario']}")
        lineas.append("")
        cuerpo = json.dumps(r["respuesta"], indent=2, ensure_ascii=False)
        if len(cuerpo) > 1200:
            cuerpo = cuerpo[:1200] + "\n  ... (recortado)"
        lineas += ["```json", cuerpo, "```", ""]

    (CARPETA / "evidencia_pruebas_api.md").write_text(
        "\n".join(lineas), encoding="utf-8"
    )
    print(f"📄 Evidencia guardada en:\n   {CARPETA / 'evidencia_pruebas_api.md'}"
          f"\n   {CARPETA / 'evidencia_pruebas_api.json'}\n")

    if _contador["fallo"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
