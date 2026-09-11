import { api } from "./api";

// Mapea los valores del formulario (RegisterModal) al formato del backend
function mapRegistroPayload(values) {
  return {
    nombre: values.nombre,
    apellido: values.apellido,
    tipoDocumento: values.tipoDocumento,
    numeroDocumento: values.numeroDocumento,
    direccion: values.direccion,
    telefono: values.telefono,
    email: values.email,
    password: values.password,
  };
}

async function register(values) {
  return api.post("/auth/register", mapRegistroPayload(values)); // { ok, token, usuario }
}

async function login({ email, password }) {
  return api.post("/auth/login", { email, password }); // { ok, token, usuario }
}

async function me() {
  const data = await api.get("/auth/me", { auth: true });
  return data.usuario;
}

async function actualizarPerfil(payload) {
  const data = await api.put("/auth/perfil", payload, { auth: true });
  return data.usuario;
}

async function cambiarPassword({ passwordActual, passwordNueva }) {
  return api.put("/auth/password", { passwordActual, passwordNueva }, { auth: true });
}

async function recuperarPassword(email) {
  return api.post("/auth/recuperar-password", { email });
}

async function restablecerPassword({ token, password }) {
  return api.post("/auth/restablecer-password", { token, password });
}

// --- Verificación del correo -----------------------------------
async function restablecerConCodigo({ email, codigo, password }) {
  return api.post("/auth/restablecer-con-codigo", { email, codigo, password });
}

async function verificarCorreo(token) {
  return api.post("/auth/verificar-correo", { token }); // { ok, usuario }
}

async function reenviarVerificacion(email) {
  return api.post("/auth/reenviar-verificacion", { email });
}

// --- Verificación en dos pasos ---------------------------------
async function verificarDobleFactor({ desafio, codigo }) {
  return api.post("/auth/verificar-doble-factor", { desafio, codigo }); // { ok, token, usuario }
}

async function cambiarDobleFactor(activo) {
  return api.put("/auth/doble-factor", { activo }, { auth: true }); // { ok, usuario }
}

export const authService = {
  register,
  login,
  me,
  actualizarPerfil,
  cambiarPassword,
  recuperarPassword,
  restablecerPassword,
  restablecerConCodigo,
  verificarCorreo,
  reenviarVerificacion,
  verificarDobleFactor,
  cambiarDobleFactor,
};
