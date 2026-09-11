const { pool } = require("../config/db");

// Columnas seguras para exponer al frontend (nunca password_hash)
const SELECT_SAFE = `
  u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.numero_documento,
  u.direccion, u.telefono, u.email, u.estado, u.id_rol,
  r.nombre AS rol, u.creado_en, u.actualizado_en
`;

async function findAll() {
  const [rows] = await pool.query(
    `SELECT ${SELECT_SAFE} FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     ORDER BY u.id_usuario DESC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${SELECT_SAFE} FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?`,
    [id]
  );
  return rows[0] || null;
}

// Incluye password_hash: solo para uso interno de autenticación
async function findByEmailWithPassword(email) {
  const [rows] = await pool.query(
    `SELECT u.*, r.nombre AS rol FROM usuarios u
     JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.email = ?`,
    [email]
  );
  return rows[0] || null;
}

async function findByDocumento(numero_documento) {
  const [rows] = await pool.query(
    "SELECT id_usuario FROM usuarios WHERE numero_documento = ?",
    [numero_documento]
  );
  return rows[0] || null;
}

async function create({
  nombre,
  apellido,
  tipo_documento,
  numero_documento,
  direccion,
  telefono,
  email,
  password_hash,
  id_rol = 3,
}) {
  const [result] = await pool.query(
    `INSERT INTO usuarios
      (nombre, apellido, tipo_documento, numero_documento, direccion, telefono, email, password_hash, id_rol)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      apellido,
      tipo_documento,
      numero_documento,
      direccion,
      telefono,
      email,
      password_hash,
      id_rol,
    ]
  );
  return findById(result.insertId);
}

async function update(id, { nombre, apellido, direccion, telefono, email }) {
  await pool.query(
    `UPDATE usuarios
       SET nombre = ?, apellido = ?, direccion = ?, telefono = ?, email = ?
     WHERE id_usuario = ?`,
    [nombre, apellido, direccion, telefono, email, id]
  );
  return findById(id);
}

async function updateEstado(id, estado) {
  await pool.query("UPDATE usuarios SET estado = ? WHERE id_usuario = ?", [
    estado,
    id,
  ]);
  return findById(id);
}

async function updateRol(id, id_rol) {
  await pool.query("UPDATE usuarios SET id_rol = ? WHERE id_usuario = ?", [
    id_rol,
    id,
  ]);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query(
    "DELETE FROM usuarios WHERE id_usuario = ?",
    [id]
  );
  return result.affectedRows > 0;
}

async function findByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id_usuario FROM usuarios WHERE email = ?",
    [email]
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  findByEmail,
  findByEmailWithPassword,
  findByDocumento,
  create,
  update,
  updateEstado,
  updateRol,
  remove,
};
