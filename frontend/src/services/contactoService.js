import { api, construirQuery } from "./api";

async function enviar(payload) {
  return api.post("/contacto", payload);
}

/** Devuelve { mensajes, nuevos, paginacion } */
async function listar(filtros = {}) {
  return api.get(`/contacto${construirQuery(filtros)}`, { auth: true });
}

async function cambiarEstado(id, estado) {
  const data = await api.patch(`/contacto/${id}/estado`, { estado }, { auth: true });
  return data.mensaje;
}

async function eliminar(id) {
  return api.delete(`/contacto/${id}`, { auth: true });
}

export const contactoService = { enviar, listar, cambiarEstado, eliminar };
