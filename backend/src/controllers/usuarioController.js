const bcrypt = require("bcryptjs");
const usuarioModel = require("../models/usuarioModel");
const { asyncHandler } = require("../middleware/errorHandler");
const { REGEX } = require("../utils/validations");

// GET /api/usuarios
const listar = asyncHandler(async (req, res) => {
  const usuarios = await usuarioModel.findAll();
  res.json({ ok: true, usuarios });
});

// GET /api/usuarios/:id
const obtener = asyncHandler(async (req, res) => {
  const usuario = await usuarioModel.findById(req.params.id);
  if (!usuario) {
    return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
  }
  res.json({ ok: true, usuario });
});

// PUT /api/usuarios/:id
const actualizar = asyncHandler(async (req, res) => {
  const { nombre, apellido, direccion, telefono, email } = req.body;

  if (!nombre || !apellido || !direccion || !telefono || !email) {
    return res.status(400).json({ ok: false, message: "Todos los campos son obligatorios." });
  }
  if (!REGEX.email.test(email)) {
    return res.status(400).json({ ok: false, message: "Correo electrónico inválido." });
  }
  if (!REGEX.telefono.test(telefono)) {
    return res.status(400).json({ ok: false, message: "Teléfono inválido." });
  }

  const existente = await usuarioModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
  }

  const usuario = await usuarioModel.update(req.params.id, {
    nombre,
    apellido,
    direccion,
    telefono,
    email,
  });

  res.json({ ok: true, message: "Usuario actualizado.", usuario });
});

// PATCH /api/usuarios/:id/estado
const cambiarEstado = asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!["activo", "inactivo"].includes(estado)) {
    return res.status(400).json({ ok: false, message: "Estado inválido." });
  }

  const existente = await usuarioModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
  }

  const usuario = await usuarioModel.updateEstado(req.params.id, estado);
  res.json({ ok: true, message: `Usuario marcado como ${estado}.`, usuario });
});

// PATCH /api/usuarios/:id/rol  (solo administrador)
const cambiarRol = asyncHandler(async (req, res) => {
  const { id_rol } = req.body;
  if (![1, 2, 3].includes(Number(id_rol))) {
    return res.status(400).json({ ok: false, message: "Rol inválido." });
  }

  const existente = await usuarioModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
  }

  const usuario = await usuarioModel.updateRol(req.params.id, id_rol);
  res.json({ ok: true, message: "Rol actualizado.", usuario });
});

// POST /api/usuarios  (creación manual desde el panel de administrador)
const crear = asyncHandler(async (req, res) => {
  const {
    nombre,
    apellido,
    tipoDocumento,
    numeroDocumento,
    direccion,
    telefono,
    email,
    password,
    id_rol,
  } = req.body;

  if (
    !nombre ||
    !apellido ||
    !tipoDocumento ||
    !numeroDocumento ||
    !direccion ||
    !telefono ||
    !email ||
    !password
  ) {
    return res.status(400).json({ ok: false, message: "Todos los campos son obligatorios." });
  }

  const existeEmail = await usuarioModel.findByEmail(email);
  if (existeEmail) {
    return res.status(409).json({ ok: false, message: "El correo ya está registrado." });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const usuario = await usuarioModel.create({
    nombre,
    apellido,
    tipo_documento: tipoDocumento,
    numero_documento: numeroDocumento,
    direccion,
    telefono,
    email,
    password_hash,
    id_rol: id_rol || 3,
  });

  res.status(201).json({ ok: true, message: "Usuario creado.", usuario });
});

// DELETE /api/usuarios/:id
const eliminar = asyncHandler(async (req, res) => {
  const existente = await usuarioModel.findById(req.params.id);
  if (!existente) {
    return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
  }

  await usuarioModel.remove(req.params.id);
  res.json({ ok: true, message: "Usuario eliminado." });
});

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, cambiarRol, eliminar };
