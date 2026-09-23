import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "phonestore")


def _url_de_conexion() -> str:
    """Arma la cadena de conexión con MySQL.

    En el equipo de desarrollo se construye con las cinco variables de
    siempre. Los servicios en la nube (Railway, Render y compañía) en
    cambio entregan la conexión ya armada en una sola variable, así que
    si existe se usa esa: evita tener que desarmarla a mano y volver a
    juntarla mal.

    La cadena puede llegar con el prefijo `mysql://`, que SQLAlchemy no
    reconoce sin driver; se le añade el que usa el proyecto.
    """
    url = (os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL") or "").strip()

    if url:
        if url.startswith("mysql://"):
            url = url.replace("mysql://", "mysql+pymysql://", 1)
        return url if "charset=" in url else url + (
            "&charset=utf8mb4" if "?" in url else "?charset=utf8mb4"
        )

    return (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        "?charset=utf8mb4"
    )


DATABASE_URL = _url_de_conexion()

# pool_pre_ping evita errores por conexiones caídas (equivalente al pool de mysql2)
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependencia de FastAPI: entrega una sesión por request y la cierra al final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection():
    """Verifica la conexión al iniciar el servidor (no detiene la app si falla)."""
    try:
        with engine.connect():
            print("✅ Conexión a MySQL establecida correctamente.")
    except Exception as error:  # noqa: BLE001
        print(f"❌ No se pudo conectar a MySQL: {error}")
        print(
            "   Verifica las variables DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en backend-fastapi/.env"
        )
