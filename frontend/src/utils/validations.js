// src/utils/validations.js
// Validadores reutilizables. Cada función recibe un valor y devuelve
// un string vacío "" si es válido, o un mensaje de error si no lo es.

export const REGEX = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  soloLetras: /^[a-zA-ZÀ-ÿ\s]+$/,
  soloNumeros: /^[0-9]+$/,
  telefono: /^[0-9]{7,15}$/,
  // Al menos 1 mayúscula, 1 minúscula, 1 número, min 8 caracteres
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  caracteresPermitidos: /^[a-zA-Z0-9À-ÿ\s.,#-]*$/,
};

export function required(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "Este campo es obligatorio.";
  }
  return "";
}

export function minLength(min) {
  return (value) =>
    value && value.length < min ? `Debe tener al menos ${min} caracteres.` : "";
}

export function maxLength(max) {
  return (value) =>
    value && value.length > max ? `No puede superar los ${max} caracteres.` : "";
}

export function validateEmail(value) {
  if (!value) return "El correo es obligatorio.";
  if (!REGEX.email.test(value)) return "Ingresa un correo electrónico válido.";
  return "";
}

export function validateNombre(value) {
  if (!value) return "Este campo es obligatorio.";
  if (value.trim().length < 2) return "Debe tener al menos 2 caracteres.";
  if (value.length > 40) return "No puede superar los 40 caracteres.";
  if (!REGEX.soloLetras.test(value)) return "Solo se permiten letras y espacios.";
  return "";
}

export function validateDocumento(value) {
  if (!value) return "El número de documento es obligatorio.";
  if (!REGEX.soloNumeros.test(value)) return "El documento solo debe contener números.";
  if (value.length < 6 || value.length > 12) return "Debe tener entre 6 y 12 dígitos.";
  return "";
}

export function validateTelefono(value) {
  if (!value) return "El teléfono es obligatorio.";
  if (!REGEX.telefono.test(value)) return "Ingresa un teléfono válido (7 a 15 dígitos).";
  return "";
}

export function validateDireccion(value) {
  if (!value) return "La dirección es obligatoria.";
  if (value.trim().length < 10) return "La dirección debe tener al menos 10 caracteres.";
  if (value.length > 150) return "La dirección es muy larga (máx. 150 caracteres).";
  if (!REGEX.caracteresPermitidos.test(value)) return "Contiene caracteres no permitidos.";
  return "";
}

export function validatePassword(value) {
  if (!value) return "La contraseña es obligatoria.";
  if (value.length < 8) return "Debe tener al menos 8 caracteres.";
  if (value.length > 20) return "No puede superar los 20 caracteres.";
  if (!REGEX.password.test(value)) {
    return "Debe incluir mayúscula, minúscula y un número.";
  }
  return "";
}

export function validateConfirmPassword(password) {
  return (value) => {
    if (!value) return "Confirma tu contraseña.";
    if (value !== password) return "Las contraseñas no coinciden.";
    return "";
  };
}
