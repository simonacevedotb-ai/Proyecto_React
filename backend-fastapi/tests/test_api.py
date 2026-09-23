"""Pruebas automáticas de la API con Pytest y TestClient.

Cubren las dos partes que sostienen todo lo demás:

  * **Autenticación**: registro, inicio de sesión, sesión actual, y que
    las rutas protegidas respondan 401 sin token y 403 con el rol
    equivocado.
  * **CRUD**: el ciclo completo de categorías y productos (crear, listar,
    consultar, actualizar y eliminar) contra una base de datos real
    (SQLite), no contra datos inventados en memoria.

Se ejecutan sin levantar el servidor ni encender MySQL:

    cd backend-fastapi
    .\\venv\\Scripts\\activate
    pytest

La base de pruebas y los datos de arranque se preparan en conftest.py.
"""

import uuid


def correo_nuevo() -> str:
    """Cada prueba que registra una cuenta necesita un correo distinto."""
    return f"pytest.{uuid.uuid4().hex[:10]}@phonestore.com"


def documento_nuevo() -> str:
    return str(uuid.uuid4().int)[:10]


def cuenta_valida(**cambios) -> dict:
    datos = {
        "nombre": "Ana", "apellido": "Ramirez", "tipoDocumento": "CC",
        "numeroDocumento": documento_nuevo(), "direccion": "Calle 45 # 12-34",
        "telefono": "3140001122", "email": correo_nuevo(), "password": "Clave1234",
    }
    datos.update(cambios)
    return datos


# ===============================================================
# Sistema
# ===============================================================
def test_la_api_responde(cliente_http):
    respuesta = cliente_http.get("/api/health")

    assert respuesta.status_code == 200
    assert respuesta.json()["ok"] is True


# ===============================================================
# Autenticación
# ===============================================================
def test_registro_crea_la_cuenta_y_entrega_sesion(cliente_http):
    respuesta = cliente_http.post("/api/auth/register", json=cuenta_valida())

    assert respuesta.status_code == 201
    datos = respuesta.json()
    assert datos["token"]
    assert datos["usuario"]["rol"] == "cliente"


def test_el_registro_nunca_devuelve_la_contrasena(cliente_http):
    respuesta = cliente_http.post("/api/auth/register", json=cuenta_valida())

    cuerpo = respuesta.text.lower()
    assert "password" not in cuerpo
    assert "hash" not in cuerpo


def test_el_registro_publico_ignora_el_rol_que_manden(cliente_http):
    """Aunque el JSON pida ser administrador, la cuenta nace como cliente."""
    respuesta = cliente_http.post(
        "/api/auth/register", json=cuenta_valida(id_rol=1)
    )

    assert respuesta.status_code == 201
    assert respuesta.json()["usuario"]["rol"] == "cliente"


def test_registro_con_datos_invalidos_devuelve_422_por_campo(cliente_http):
    respuesta = cliente_http.post("/api/auth/register", json=cuenta_valida(
        nombre="A", tipoDocumento="XX", email="no-es-correo", password="123",
    ))

    assert respuesta.status_code == 422
    errores = respuesta.json()["errors"]
    assert "nombre" in errores
    assert "email" in errores
    assert "tipoDocumento" in errores


def test_registro_rechaza_contrasena_sin_numeros(cliente_http):
    respuesta = cliente_http.post(
        "/api/auth/register", json=cuenta_valida(password="solamenteletras")
    )

    assert respuesta.status_code == 422
    assert "números" in respuesta.json()["errors"]["password"]


def test_no_se_puede_registrar_dos_veces_el_mismo_correo(cliente_http):
    datos = cuenta_valida()
    cliente_http.post("/api/auth/register", json=datos)

    repetido = cliente_http.post(
        "/api/auth/register",
        json=cuenta_valida(email=datos["email"]),
    )

    assert repetido.status_code == 409
    assert "correo" in repetido.json()["message"].lower()


def test_login_con_credenciales_correctas(cliente_http):
    datos = cuenta_valida()
    cliente_http.post("/api/auth/register", json=datos)

    respuesta = cliente_http.post("/api/auth/login", json={
        "email": datos["email"], "password": datos["password"],
    })

    assert respuesta.status_code == 200
    assert respuesta.json()["token"]


def test_login_con_contrasena_equivocada(cliente_http):
    datos = cuenta_valida()
    cliente_http.post("/api/auth/register", json=datos)

    respuesta = cliente_http.post("/api/auth/login", json={
        "email": datos["email"], "password": "OtraClave999",
    })

    assert respuesta.status_code == 401
    assert "token" not in respuesta.json()


def test_el_correo_no_distingue_mayusculas_al_entrar(cliente_http):
    datos = cuenta_valida()
    cliente_http.post("/api/auth/register", json=datos)

    respuesta = cliente_http.post("/api/auth/login", json={
        "email": datos["email"].upper(), "password": datos["password"],
    })

    assert respuesta.status_code == 200


def test_la_sesion_actual_exige_token(cliente_http):
    respuesta = cliente_http.get("/api/auth/me")

    assert respuesta.status_code == 401


def test_la_sesion_actual_devuelve_el_usuario(cliente_http, cabecera_cliente):
    respuesta = cliente_http.get("/api/auth/me", headers=cabecera_cliente)

    assert respuesta.status_code == 200
    assert respuesta.json()["usuario"]["email"] == "cliente.pytest@phonestore.com"
    assert "password_hash" not in respuesta.json()["usuario"]


def test_un_token_falso_no_abre_la_sesion(cliente_http):
    respuesta = cliente_http.get(
        "/api/auth/me", headers={"Authorization": "Bearer token.inventado.aqui"}
    )

    assert respuesta.status_code == 401


# ===============================================================
# CRUD de categorías (ciclo completo)
# ===============================================================
def test_ciclo_completo_de_una_categoria(cliente_http, cabecera_admin):
    nombre = f"Accesorios {uuid.uuid4().hex[:6]}"

    creada = cliente_http.post("/api/categorias", headers=cabecera_admin, json={
        "nombre": nombre, "descripcion": "Creada por las pruebas",
    })
    assert creada.status_code == 201
    id_categoria = creada.json()["categoria"]["id_categoria"]

    listado = cliente_http.get("/api/categorias")
    assert listado.status_code == 200
    assert any(c["id_categoria"] == id_categoria for c in listado.json()["categorias"])

    actualizada = cliente_http.put(
        f"/api/categorias/{id_categoria}", headers=cabecera_admin,
        json={"nombre": nombre + " editada", "descripcion": "Nombre cambiado"},
    )
    assert actualizada.status_code == 200
    assert actualizada.json()["categoria"]["nombre"] == nombre + " editada"

    desactivada = cliente_http.patch(
        f"/api/categorias/{id_categoria}/estado",
        headers=cabecera_admin, json={"estado": "inactivo"},
    )
    assert desactivada.status_code == 200
    assert desactivada.json()["categoria"]["estado"] == "inactivo"

    borrada = cliente_http.delete(
        f"/api/categorias/{id_categoria}", headers=cabecera_admin
    )
    assert borrada.status_code == 200

    listado = cliente_http.get("/api/categorias")
    assert all(c["id_categoria"] != id_categoria for c in listado.json()["categorias"])


def test_un_cliente_no_puede_crear_categorias(cliente_http, cabecera_cliente):
    respuesta = cliente_http.post("/api/categorias", headers=cabecera_cliente, json={
        "nombre": "Categoria prohibida",
    })

    assert respuesta.status_code == 403


# ===============================================================
# CRUD de productos (ciclo completo)
# ===============================================================
def test_ciclo_completo_de_un_producto(cliente_http, cabecera_admin):
    nombre = f"Producto Pytest {uuid.uuid4().hex[:6]}"

    creado = cliente_http.post("/api/productos", headers=cabecera_admin, json={
        "nombre": nombre, "marca": "MarcaPytest", "precio": 750000,
        "descripcion": "Creado por las pruebas automáticas",
        "stock": 10, "stock_minimo": 2,
    })
    assert creado.status_code == 201
    producto = creado.json()["producto"]
    id_producto = producto["id_producto"]
    assert producto["estado_stock"] == "disponible"

    consultado = cliente_http.get(f"/api/productos/{id_producto}")
    assert consultado.status_code == 200
    assert consultado.json()["producto"]["nombre"] == nombre

    listado = cliente_http.get(f"/api/productos?buscar={nombre}")
    assert listado.status_code == 200
    assert listado.json()["paginacion"]["total"] == 1

    actualizado = cliente_http.put(
        f"/api/productos/{id_producto}", headers=cabecera_admin, json={
            "nombre": nombre, "marca": "MarcaPytest", "precio": 700000,
            "descripcion": "Precio corregido", "stock": 10, "stock_minimo": 2,
        },
    )
    assert actualizado.status_code == 200
    assert actualizado.json()["producto"]["precio"] == 700000

    borrado = cliente_http.delete(
        f"/api/productos/{id_producto}", headers=cabecera_admin
    )
    assert borrado.status_code == 200
    assert cliente_http.get(f"/api/productos/{id_producto}").status_code == 404


def test_un_producto_que_no_existe_devuelve_404(cliente_http):
    respuesta = cliente_http.get("/api/productos/999999")

    assert respuesta.status_code == 404
    assert respuesta.json()["ok"] is False


def test_el_catalogo_publico_no_necesita_sesion(cliente_http):
    respuesta = cliente_http.get("/api/productos?limite=5")

    assert respuesta.status_code == 200
    assert respuesta.json()["paginacion"]["limite"] == 5


def test_un_cliente_no_puede_crear_productos(cliente_http, cabecera_cliente):
    respuesta = cliente_http.post("/api/productos", headers=cabecera_cliente, json={
        "nombre": "Producto prohibido", "marca": "Marca", "precio": 100000,
    })

    assert respuesta.status_code == 403


def test_sin_token_no_se_crean_productos(cliente_http):
    respuesta = cliente_http.post("/api/productos", json={
        "nombre": "Producto sin sesion", "marca": "Marca", "precio": 100000,
    })

    assert respuesta.status_code == 401


def test_el_precio_anterior_debe_superar_al_precio(cliente_http, cabecera_admin):
    """Regla del model_validator de ProductoCrear."""
    respuesta = cliente_http.post("/api/productos", headers=cabecera_admin, json={
        "nombre": "Oferta imposible", "marca": "Marca",
        "precio": 900000, "precio_anterior": 500000,
    })

    assert respuesta.status_code == 422
    assert "precio anterior" in str(respuesta.json()["errors"]).lower()


# ===============================================================
# Compra y asistente
# ===============================================================
def test_no_se_puede_comprar_sin_iniciar_sesion(cliente_http):
    respuesta = cliente_http.post("/api/ventas", json={
        "items": [{"id_producto": 1, "cantidad": 1}],
        "cliente_nombre": "Ana Ramirez", "cliente_email": "ana@correo.com",
        "cliente_telefono": "3140001122", "direccion_envio": "Calle 45 # 12-34",
        "ciudad": "Medellin",
    })

    assert respuesta.status_code == 401


def test_el_carrito_rechaza_el_mismo_producto_dos_veces(cliente_http, cabecera_cliente):
    respuesta = cliente_http.post("/api/ventas", headers=cabecera_cliente, json={
        "items": [
            {"id_producto": 1, "cantidad": 1},
            {"id_producto": 1, "cantidad": 2},
        ],
        "cliente_nombre": "Cliente Pytest", "cliente_email": "cliente.pytest@phonestore.com",
        "cliente_telefono": "3140000002", "direccion_envio": "Carrera 70 # 30-20",
        "ciudad": "Medellin",
    })

    assert respuesta.status_code == 422
    assert "repetido" in str(respuesta.json()["errors"]).lower()


def test_una_compra_descuenta_el_stock(cliente_http, cabecera_cliente):
    antes = cliente_http.get("/api/productos/1").json()["producto"]["stock"]

    compra = cliente_http.post("/api/ventas", headers=cabecera_cliente, json={
        "items": [{"id_producto": 1, "cantidad": 2}],
        "cliente_nombre": "Cliente Pytest",
        "cliente_email": "cliente.pytest@phonestore.com",
        "cliente_telefono": "3140000002", "direccion_envio": "Carrera 70 # 30-20",
        "ciudad": "Medellin", "metodo_pago": "contraentrega",
    })

    assert compra.status_code == 201
    despues = cliente_http.get("/api/productos/1").json()["producto"]["stock"]
    assert despues == antes - 2


def test_el_asistente_responde_a_un_visitante(cliente_http):
    """Endpoint asíncrono: sin clave de IA contesta con el catálogo."""
    respuesta = cliente_http.post(
        "/api/chatbot/mensaje", json={"mensaje": "Hola, ¿qué celulares tienen?"}
    )

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["clave"]
    assert len(datos["respuesta"]["contenido"]) > 20
