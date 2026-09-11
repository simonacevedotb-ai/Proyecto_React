import { api } from "./api";

async function listar({ auth = false } = {}) {
  const data = await api.get("/categorias", { auth });
  return data.categorias;
}

async function crear(payload) {
  const data = await api.post("/categorias", payload, { auth: true });
  return data.categoria;
}

async function actualizar(id, payload) {
  const data = await api.put(`/categorias/${id}`, payload, { auth: true });
  return data.categoria;
}

async function cambiarEstado(id, estado) {
  const data = await api.patch(`/categorias/${id}/estado`, { estado }, { auth: true });
  return data.categoria;
}

async function eliminar(id) {
  return api.delete(`/categorias/${id}`, { auth: true });
}

export const categoriaService = { listar, crear, actualizar, cambiarEstado, eliminar };
