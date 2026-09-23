import { api, construirQuery } from "./api";

/**
 * Peticiones, quejas, reclamos y sugerencias.
 *
 * Radicar no exige sesión: un visitante puede dejar su caso y recibe un
 * número de radicado con el que después consulta el estado sin entrar a
 * la cuenta. Con sesión iniciada, además queda enlazada a su usuario.
 */
async function radicar(datos) {
  return api.post("/pqr", datos, { auth: true });
}

/** Consulta pública por radicado, sin iniciar sesión. */
async function consultar(radicado) {
  const data = await api.get(`/pqr/consultar/${encodeURIComponent(radicado)}`);
  return data.pqr;
}

async function misPQR() {
  const data = await api.get("/pqr/mis-pqr", { auth: true });
  return data.pqr;
}

async function listar(filtros = {}) {
  return api.get(`/pqr${construirQuery(filtros)}`, { auth: true });
}

async function obtener(idPqr) {
  const data = await api.get(`/pqr/${idPqr}`, { auth: true });
  return data.pqr;
}

async function cambiarEstado(idPqr, estado) {
  return api.patch(`/pqr/${idPqr}/estado`, { estado }, { auth: true });
}

async function responder(idPqr, { respuesta, estado }) {
  return api.post(`/pqr/${idPqr}/responder`, { respuesta, estado }, { auth: true });
}

export const pqrService = {
  radicar,
  consultar,
  misPQR,
  listar,
  obtener,
  cambiarEstado,
  responder,
};
