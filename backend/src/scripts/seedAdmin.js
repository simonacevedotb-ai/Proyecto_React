// Crea (o actualiza) el usuario administrador inicial usando los datos
// definidos en backend/.env. La contraseña se guarda siempre con hash,
// nunca en texto plano.
//
// Ejecutar con:  npm run seed:admin   (desde la carpeta backend/)

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

async function seedAdmin() {
  const {
    ADMIN_NOMBRE = "Admin",
    ADMIN_APELLIDO = "PhoneStore",
    ADMIN_EMAIL = "admin@phonestore.com",
    ADMIN_PASSWORD = "Admin1234",
    ADMIN_DOCUMENTO = "1000000000",
    ADMIN_TELEFONO = "3000000000",
    ADMIN_DIRECCION = "Oficina principal",
  } = process.env;

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const [existente] = await pool.query(
    "SELECT id_usuario FROM usuarios WHERE email = ?",
    [ADMIN_EMAIL]
  );

  if (existente.length > 0) {
    await pool.query(
      `UPDATE usuarios
         SET password_hash = ?, id_rol = 1, estado = 'activo'
       WHERE email = ?`,
      [password_hash, ADMIN_EMAIL]
    );
    console.log(`✅ Administrador actualizado: ${ADMIN_EMAIL}`);
  } else {
    await pool.query(
      `INSERT INTO usuarios
        (nombre, apellido, tipo_documento, numero_documento, direccion, telefono, email, password_hash, id_rol, estado)
       VALUES (?, ?, 'CC', ?, ?, ?, ?, ?, 1, 'activo')`,
      [
        ADMIN_NOMBRE,
        ADMIN_APELLIDO,
        ADMIN_DOCUMENTO,
        ADMIN_DIRECCION,
        ADMIN_TELEFONO,
        ADMIN_EMAIL,
        password_hash,
      ]
    );
    console.log(`✅ Administrador creado: ${ADMIN_EMAIL}`);
  }

  console.log(`   Contraseña: ${ADMIN_PASSWORD} (cámbiala después de ingresar)`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Error creando el administrador:", err.message);
  process.exit(1);
});
