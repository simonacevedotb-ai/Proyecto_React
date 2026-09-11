const bcrypt = require("bcryptjs");
const usuarioModel = require("../models/usuarioModel");
const { validateRegistro, validateLogin } = require("../utils/validations");
const { generarToken } = require("../utils/jwt");
const { asyncHandler } = require("../middleware/errorHandler");

const SALT_ROUNDS = 10;

function usuarioPublico(usuario) {
  // Nunca devolver password_hash al frontend
  const { password_hash, ...resto } = usuario;
  return resto;
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateRegistro(req.body);
  if (!isValid) {
    return res.status(400).json({ ok: false, message: "Datos inválidos.", errors });
  }

  const {
    nombre,
    apellido,
    tipoDocumento,
    numeroDocumento,
    direccion,
    telefono,
    email,
    password,
  } = req.body;

  const existeEmail = await usuarioModel.findByEmail(email);
  if (existeEmail) {
    return res.status(409).json({
      ok: false,
      message: "Ya existe una cuenta registrada con ese correo electrónico.",
      errors: { email: "Correo ya registrado." },
    });
  }

  const existeDocumento = await usuarioModel.findByDocumento(numeroDocumento);
  if (existeDocumento) {
    return res.status(409).json({
      ok: false,
      message: "Ya existe una cuenta registrada con ese número de documento.",
      errors: { numeroDocumento: "Documento ya registrado." },
    });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const nuevoUsuario = await usuarioModel.create({
    nombre,
    apellido,
    tipo_documento: tipoDocumento,
    numero_documento: numeroDocumento,
    direccion,
    telefono,
    email,
    password_hash,
    id_rol: 3, // Cliente por defecto
  });

  const token = generarToken(nuevoUsuario);

  res.status(201).json({
    ok: true,
    message: "Registro exitoso.",
    token,
    usuario: usuarioPublico(nuevoUsuario),
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateLogin(req.body);
  if (!isValid) {
    return res.status(400).json({ ok: false, message: "Datos inválidos.", errors });
  }

  const { email, password } = req.body;

  const usuario = await usuarioModel.findByEmailWithPassword(email);
  if (!usuario) {
    return res.status(401).json({
      ok: false,
      message: "Correo o contraseña incorrectos.",
    });
  }

  if (usuario.estado === "inactivo") {
    return res.status(403).json({
      ok: false,
      message: "Tu cuenta se encuentra inactiva. Contacta al administrador.",
    });
  }

  const passwordValida = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordValida) {
    return res.status(401).json({
      ok: false,
      message: "Correo o contraseña incorrectos.",
    });
  }

  const token = generarToken(usuario);

  res.json({
    ok: true,
    message: "Inicio de sesión exitoso.",
    token,
    usuario: usuarioPublico(usuario),
  });
});

// GET /api/auth/me  (requiere token)
const me = asyncHandler(async (req, res) => {
  const usuario = await usuarioModel.findById(req.usuario.id_usuario);
  if (!usuario) {
    return res.status(404).json({ ok: false, message: "Usuario no encontrado." });
  }
  res.json({ ok: true, usuario });
});

module.exports = { register, login, me };
