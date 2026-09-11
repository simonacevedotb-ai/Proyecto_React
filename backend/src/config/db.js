const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "phonestore",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// Verifica la conexión al iniciar el servidor (no detiene la app si falla,
// solo informa en consola para facilitar el diagnóstico).
async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conexión a MySQL establecida correctamente.");
    connection.release();
  } catch (error) {
    console.error("❌ No se pudo conectar a MySQL:", error.message);
    console.error(
      "   Verifica las variables DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en backend/.env"
    );
  }
}

module.exports = { pool, checkConnection };
