"""Preparación común de las pruebas con Pytest.

Las pruebas NO tocan MySQL ni el servidor en marcha: levantan una base
SQLite en un archivo temporal, crean allí las mismas tablas que define
app/models.py y le dicen a FastAPI que use esa sesión en lugar de la
real (`dependency_overrides`). Así se pueden ejecutar en cualquier
momento, no dependen de que XAMPP esté encendido y no dejan basura en
los datos de la tienda.

`TestClient` habla con la aplicación en memoria, sin abrir un puerto:
las peticiones de las pruebas recorren el mismo código que recorrería
una petición del navegador (middlewares, dependencias, validaciones y
manejadores de error incluidos).
"""

import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth import hash_password
from app.database import Base, get_db
from app.main import app
from app.models import Categoria, Producto, Rol, Servicio, Usuario

ADMIN = {"email": "admin.pytest@phonestore.com", "password": "Admin1234"}
CLIENTE = {"email": "cliente.pytest@phonestore.com", "password": "Cliente1234"}


@pytest.fixture(scope="session")
def motor():
    """Una base SQLite de usar y tirar para toda la sesión de pruebas."""
    archivo = os.path.join(tempfile.mkdtemp(prefix="phonestore-pytest-"), "prueba.db")
    motor = create_engine(
        f"sqlite:///{archivo}",
        # SQLite prohíbe usar una conexión desde otro hilo; TestClient
        # ejecuta la aplicación en uno distinto, así que hay que permitirlo.
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(motor)
    yield motor
    motor.dispose()


@pytest.fixture(scope="session")
def Sesion(motor):
    return sessionmaker(autocommit=False, autoflush=False, bind=motor)


@pytest.fixture(scope="session", autouse=True)
def datos_iniciales(Sesion):
    """Roles, un administrador, un cliente y algo de catálogo."""
    db = Sesion()
    db.add_all([
        Rol(id_rol=1, nombre="administrador", descripcion="Acceso total"),
        Rol(id_rol=2, nombre="empleado", descripcion="Gestión del catálogo"),
        Rol(id_rol=3, nombre="cliente", descripcion="Compra en la tienda"),
    ])
    db.flush()

    db.add_all([
        Usuario(
            nombre="Admin", apellido="Pytest", tipo_documento="CC",
            numero_documento="900000001", direccion="Calle 45 # 12-34",
            telefono="3140000001", email=ADMIN["email"],
            password_hash=hash_password(ADMIN["password"]),
            id_rol=1, estado="activo", email_verificado=True,
        ),
        Usuario(
            nombre="Cliente", apellido="Pytest", tipo_documento="CC",
            numero_documento="900000002", direccion="Carrera 70 # 30-20",
            telefono="3140000002", email=CLIENTE["email"],
            password_hash=hash_password(CLIENTE["password"]),
            id_rol=3, estado="activo", email_verificado=True,
        ),
    ])

    categoria = Categoria(nombre="Celulares", slug="celulares", estado="activo")
    db.add(categoria)
    db.flush()
    db.add(Producto(
        nombre="Teléfono de catálogo", marca="PhoneStore",
        id_categoria=categoria.id_categoria, descripcion="Producto de arranque",
        precio=1500000, stock=10, stock_minimo=2, estado="activo",
    ))
    db.add(Servicio(
        nombre="Cambio de pantalla", descripcion="Reemplazo del módulo",
        precio=250000, estado="activo",
    ))
    db.commit()
    db.close()


@pytest.fixture(scope="session")
def cliente_http(Sesion):
    """Cliente HTTP contra la aplicación, con la base de pruebas puesta.

    Se construye sin `with` a propósito: así no se dispara el arranque de
    la aplicación, que intentaría conectarse al MySQL real.
    """

    def get_db_de_prueba():
        db = Sesion()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = get_db_de_prueba
    yield TestClient(app)
    app.dependency_overrides.clear()


def _token(cliente_http, credenciales) -> str:
    respuesta = cliente_http.post("/api/auth/login", json=credenciales)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()["token"]


@pytest.fixture(scope="session")
def token_admin(cliente_http) -> str:
    return _token(cliente_http, ADMIN)


@pytest.fixture(scope="session")
def token_cliente(cliente_http) -> str:
    return _token(cliente_http, CLIENTE)


@pytest.fixture
def cabecera_admin(token_admin) -> dict:
    return {"Authorization": f"Bearer {token_admin}"}


@pytest.fixture
def cabecera_cliente(token_cliente) -> dict:
    return {"Authorization": f"Bearer {token_cliente}"}
