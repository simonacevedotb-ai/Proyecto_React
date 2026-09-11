import { api, construirQuery } from "./api";

async function crear(payload) {
  return api.post("/solicitudes", payload, { auth: true }); // { ok, message, solicitud }
}

async function misSolicitudes() {
  const data = await api.get("/solicitudes/mis-solicitudes", { auth: true });
  return data.solicitudes;
}

/** Devuelve { solicitudes, paginacion } */
async function listar(filtros = {}) {
  return api.get(`/solicitudes${construirQuery(filtros)}`, { auth: true });
}

async function actualizar(id, payload) {
  const data = await api.patch(`/solicitudes/${id}`, payload, { auth: true });
  return data.solicitud;
}

export const solicitudService = { crear, misSolicitudes, listar, actualizar };
