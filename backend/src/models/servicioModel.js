const { pool } = require("../config/db");

async function findAll({ soloActivos = false } = {}) {
  const where = soloActivos ? "WHERE estado = 'activo'" : "";
  const [rows] = await pool.query(
    `SELECT * FROM servicios ${where} ORDER BY id_servicio DESC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM servicios WHERE id_servicio = ?",
    [id]
  );
  return rows[0] || null;
}

async function create({ nombre, descripcion, precio }) {
  const [result] = await pool.query(
    "INSERT INTO servicios (nombre, descripcion, precio) VALUES (?, ?, ?)",
    [nombre, descripcion || null, precio]
  );
  return findById(result.insertId);
}

async function update(id, { nombre, descripcion, precio }) {
  await pool.query(
    "UPDATE servicios SET nombre = ?, descripcion = ?, precio = ? WHERE id_servicio = ?",
    [nombre, descripcion || null, precio, id]
  );
  return findById(id);
}

async function updateEstado(id, estado) {
  await pool.query("UPDATE servicios SET estado = ? WHERE id_servicio = ?", [
    estado,
    id,
  ]);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query(
    "DELETE FROM servicios WHERE id_servicio = ?",
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, updateEstado, remove };
