import { api, construirQuery } from "./api";

/** Devuelve { usuarios, paginacion } */
async function listar(filtros = {}) {
  return api.get(`/usuarios${construirQuery(filtros)}`, { auth: true });
}

async function obtener(id) {
  const data = await api.get(`/usuarios/${id}`, { auth: true });
  return data.usuario;
}

async function crear(payload) {
  const data = await api.post("/usuarios", payload, { auth: true });
  return data.usuario;
}

async function actualizar(id, payload) {
  const data = await api.put(`/usuarios/${id}`, payload, { auth: true });
  return data.usuario;
}

async function cambiarEstado(id, estado) {
  const data = await api.patch(`/usuarios/${id}/estado`, { estado }, { auth: true });
  return data.usuario;
}

async function cambiarRol(id, id_rol) {
  const data = await api.patch(`/usuarios/${id}/rol`, { id_rol }, { auth: true });
  return data.usuario;
}

async function eliminar(id) {
  return api.delete(`/usuarios/${id}`, { auth: true });
}

export const usuarioService = {
  listar,
  obtener,
  crear,
  actualizar,
  cambiarEstado,
  cambiarRol,
  eliminar,
};
