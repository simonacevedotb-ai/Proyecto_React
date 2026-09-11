import { api, construirQuery } from "./api";

async function listar({ auth = false, buscar } = {}) {
  const data = await api.get(`/servicios${construirQuery({ buscar })}`, { auth });
  return data.servicios;
}

async function obtener(id) {
  const data = await api.get(`/servicios/${id}`);
  return data.servicio;
}

async function crear(payload) {
  const data = await api.post("/servicios", payload, { auth: true });
  return data.servicio;
}

async function actualizar(id, payload) {
  const data = await api.put(`/servicios/${id}`, payload, { auth: true });
  return data.servicio;
}

async function cambiarEstado(id, estado) {
  const data = await api.patch(`/servicios/${id}/estado`, { estado }, { auth: true });
  return data.servicio;
}

async function eliminar(id) {
  return api.delete(`/servicios/${id}`, { auth: true });
}

export const servicioService = { listar, obtener, crear, actualizar, cambiarEstado, eliminar };
