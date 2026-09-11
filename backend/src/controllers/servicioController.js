const servicioModel = require("../models/servicioModel");
const { validateServicio } = require("../utils/validations");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/servicios
const listar = asyncHandler(async (req, res) => {
  const esGestor = req.usuario && ["administrador", "empleado"].includes(req.usuario.rol);
  const servicios = await servicioModel.findAll({ soloActivos: !esGestor });
  res.json({ ok: true, servicios });
});

// GET /api/servicios/:id
const obtener = asyncHandler(async (req, res) => {
  const servicio = await servicioModel.findById(req.params.id);
  if (!servicio) {
    return res.status(404).json({ ok: false, message: "Servicio no encontrado." });
  }
  res.json({ ok: true, servicio });
});

// POST /api/servicios
const crear = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateServicio(req.body);
  if (!isValid) {
    return res.status(400).json({ ok: false, message: "Datos inválidos.", errors });
  }
  const servicio = await servicioModel.create(req.body);
  res.status(201).json({ ok: true, message: "Servicio creado.", servicio });
});

// PUT /api/servicios/:id
const actualizar = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateServicio(req.body);
  if (!isValid) {
    return res.status(400).json({ ok: false, message: "Datos inválidos.", errors });
  }
  const existente = await servicioModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Servicio no encontrado." });
  }
  const servicio = await servicioModel.update(req.params.id, req.body);
  res.json({ ok: true, message: "Servicio actualizado.", servicio });
});

// PATCH /api/servicios/:id/estado
const cambiarEstado = asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!["activo", "inactivo"].includes(estado)) {
    return res.status(400).json({ ok: false, message: "Estado inválido." });
  }
  const existente = await servicioModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Servicio no encontrado." });
  }
  const servicio = await servicioModel.updateEstado(req.params.id, estado);
  res.json({ ok: true, message: `Servicio marcado como ${estado}.`, servicio });
});

// DELETE /api/servicios/:id
const eliminar = asyncHandler(async (req, res) => {
  const existente = await servicioModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Servicio no encontrado." });
  }
  await servicioModel.remove(req.params.id);
  res.json({ ok: true, message: "Servicio eliminado." });
});

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar };
