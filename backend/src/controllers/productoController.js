const productoModel = require("../models/productoModel");
const { validateProducto } = require("../utils/validations");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/productos  (público: solo activos; con token admin/empleado: todos)
const listar = asyncHandler(async (req, res) => {
  const esGestor = req.usuario && ["administrador", "empleado"].includes(req.usuario.rol);
  const productos = await productoModel.findAll({ soloActivos: !esGestor });
  res.json({ ok: true, productos });
});

// GET /api/productos/:id
const obtener = asyncHandler(async (req, res) => {
  const producto = await productoModel.findById(req.params.id);
  if (!producto) {
    return res.status(404).json({ ok: false, message: "Producto no encontrado." });
  }
  res.json({ ok: true, producto });
});

// POST /api/productos
const crear = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateProducto(req.body);
  if (!isValid) {
    return res.status(400).json({ ok: false, message: "Datos inválidos.", errors });
  }
  const producto = await productoModel.create(req.body);
  res.status(201).json({ ok: true, message: "Producto creado.", producto });
});

// PUT /api/productos/:id
const actualizar = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateProducto(req.body);
  if (!isValid) {
    return res.status(400).json({ ok: false, message: "Datos inválidos.", errors });
  }

  const existente = await productoModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Producto no encontrado." });
  }

  const producto = await productoModel.update(req.params.id, req.body);
  res.json({ ok: true, message: "Producto actualizado.", producto });
});

// PATCH /api/productos/:id/estado
const cambiarEstado = asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!["activo", "inactivo"].includes(estado)) {
    return res.status(400).json({ ok: false, message: "Estado inválido." });
  }
  const existente = await productoModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Producto no encontrado." });
  }
  const producto = await productoModel.updateEstado(req.params.id, estado);
  res.json({ ok: true, message: `Producto marcado como ${estado}.`, producto });
});

// DELETE /api/productos/:id
const eliminar = asyncHandler(async (req, res) => {
  const existente = await productoModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Producto no encontrado." });
  }
  await productoModel.remove(req.params.id);
  res.json({ ok: true, message: "Producto eliminado." });
});

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar };
