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

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    "?charset=utf8mb4"
)

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
