const { pool } = require("../config/db");

async function findAll({ soloActivos = false } = {}) {
  const where = soloActivos ? "WHERE estado = 'activo'" : "";
  const [rows] = await pool.query(
    `SELECT * FROM productos ${where} ORDER BY id_producto DESC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM productos WHERE id_producto = ?",
    [id]
  );
  return rows[0] || null;
}

async function create({ nombre, marca, descripcion, precio, stock, imagen_url }) {
  const [result] = await pool.query(
    `INSERT INTO productos (nombre, marca, descripcion, precio, stock, imagen_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nombre, marca, descripcion || null, precio, stock || 0, imagen_url || null]
  );
  return findById(result.insertId);
}

async function update(id, { nombre, marca, descripcion, precio, stock, imagen_url }) {
  await pool.query(
    `UPDATE productos
       SET nombre = ?, marca = ?, descripcion = ?, precio = ?, stock = ?, imagen_url = ?
     WHERE id_producto = ?`,
    [nombre, marca, descripcion || null, precio, stock || 0, imagen_url || null, id]
  );
  return findById(id);
}

async function updateEstado(id, estado) {
  await pool.query("UPDATE productos SET estado = ? WHERE id_producto = ?", [
    estado,
    id,
  ]);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query(
    "DELETE FROM productos WHERE id_producto = ?",
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, updateEstado, remove };
