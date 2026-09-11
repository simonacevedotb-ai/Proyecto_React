// Validaciones del backend. Reflejan las reglas ya usadas en el frontend
// (frontend/src/utils/validations.js) para que ningún dato inválido llegue
// a la base de datos, incluso si el frontend fue evadido.

const REGEX = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  soloLetras: /^[a-zA-ZÀ-ÿ\s]+$/,
  soloNumeros: /^[0-9]+$/,
  telefono: /^[0-9]{7,10}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  caracteresPermitidos: /^[a-zA-Z0-9À-ÿ\s.,#-]*$/,
};

const TIPOS_DOCUMENTO_VALIDOS = ["CC", "TI", "CE", "PA"];

function validateRegistro(body) {
  const errors = {};
  const {
    nombre,
    apellido,
    tipoDocumento,
    numeroDocumento,
    direccion,
    telefono,
    email,
    password,
  } = body;

  if (!nombre || nombre.trim().length < 2 || nombre.length > 40 || !REGEX.soloLetras.test(nombre)) {
    errors.nombre = "Nombre inválido.";
  }
  if (!apellido || apellido.trim().length < 2 || apellido.length > 40 || !REGEX.soloLetras.test(apellido)) {
    errors.apellido = "Apellido inválido.";
  }
  if (!tipoDocumento || !TIPOS_DOCUMENTO_VALIDOS.includes(tipoDocumento)) {
    errors.tipoDocumento = "Tipo de documento inválido.";
  }
  if (
    !numeroDocumento ||
    !REGEX.soloNumeros.test(numeroDocumento) ||
    numeroDocumento.length < 6 ||
    numeroDocumento.length > 12
  ) {
    errors.numeroDocumento = "Número de documento inválido.";
  }
  if (
    !direccion ||
    direccion.length < 5 ||
    direccion.length > 80 ||
    !REGEX.caracteresPermitidos.test(direccion)
  ) {
    errors.direccion = "Dirección inválida.";
  }
  if (!telefono || !REGEX.telefono.test(telefono)) {
    errors.telefono = "Teléfono inválido.";
  }
  if (!email || !REGEX.email.test(email)) {
    errors.email = "Correo electrónico inválido.";
  }
  if (!password || password.length < 8 || password.length > 20 || !REGEX.password.test(password)) {
    errors.password = "La contraseña debe tener 8-20 caracteres, mayúscula, minúscula y número.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

function validateLogin(body) {
  const errors = {};
  if (!body.email || !REGEX.email.test(body.email)) {
    errors.email = "Correo electrónico inválido.";
  }
  if (!body.password) {
    errors.password = "La contraseña es obligatoria.";
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

function validateProducto(body) {
  const errors = {};
  const { nombre, marca, precio, stock } = body;

  if (!nombre || nombre.trim().length < 2 || nombre.length > 80) {
    errors.nombre = "Nombre de producto inválido.";
  }
  if (!marca || marca.trim().length < 2 || marca.length > 40) {
    errors.marca = "Marca inválida.";
  }
  if (precio === undefined || precio === null || isNaN(precio) || Number(precio) < 0) {
    errors.precio = "Precio inválido.";
  }
  if (stock !== undefined && (isNaN(stock) || Number(stock) < 0)) {
    errors.stock = "Stock inválido.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

function validateServicio(body) {
  const errors = {};
  const { nombre, precio } = body;

  if (!nombre || nombre.trim().length < 2 || nombre.length > 80) {
    errors.nombre = "Nombre de servicio inválido.";
  }
  if (precio === undefined || precio === null || isNaN(precio) || Number(precio) < 0) {
    errors.precio = "Precio inválido.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

module.exports = {
  REGEX,
  TIPOS_DOCUMENTO_VALIDOS,
  validateRegistro,
  validateLogin,
  validateProducto,
  validateServicio,
};
