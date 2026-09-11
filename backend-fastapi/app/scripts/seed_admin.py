# Crea (o actualiza) el usuario administrador inicial usando los datos
# definidos en backend-fastapi/.env. La contraseña se guarda siempre con
# hash, nunca en texto plano.
#
# Ejecutar desde backend-fastapi/ (con el entorno virtual activado):
#   python -m app.scripts.seed_admin

import os

from dotenv import load_dotenv

from app.auth import hash_password
from app.database import SessionLocal
from app.models import Usuario

load_dotenv()


def seed_admin():
    admin_nombre = os.getenv("ADMIN_NOMBRE", "Admin")
    admin_apellido = os.getenv("ADMIN_APELLIDO", "PhoneStore")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@phonestore.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin1234")
    admin_documento = os.getenv("ADMIN_DOCUMENTO", "1000000000")
    admin_telefono = os.getenv("ADMIN_TELEFONO", "3000000000")
    admin_direccion = os.getenv("ADMIN_DIRECCION", "Oficina principal")

    password_hash = hash_password(admin_password)

    db = SessionLocal()
    try:
        existente = db.query(Usuario).filter(Usuario.email == admin_email).first()

        if existente:
            existente.password_hash = password_hash
            existente.id_rol = 1
            existente.estado = "activo"
            db.commit()
            print(f"✅ Administrador actualizado: {admin_email}")
        else:
            nuevo = Usuario(
                nombre=admin_nombre,
                apellido=admin_apellido,
                tipo_documento="CC",
                numero_documento=admin_documento,
                direccion=admin_direccion,
                telefono=admin_telefono,
                email=admin_email,
                password_hash=password_hash,
                id_rol=1,
                estado="activo",
            )
            db.add(nuevo)
            db.commit()
            print(f"✅ Administrador creado: {admin_email}")

        print(f"   Contraseña: {admin_password} (cámbiala después de ingresar)")
    except Exception as error:  # noqa: BLE001
        db.rollback()
        print(f"❌ Error creando el administrador: {error}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
