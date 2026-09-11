import { api, construirQuery } from "./api";

/** Devuelve { productos, paginacion } */
async function listar(filtros = {}, { auth = false, signal } = {}) {
  return api.get(`/productos${construirQuery(filtros)}`, { auth, signal });
}

async function obtener(id) {
  return api.get(`/productos/${id}`); // { producto, relacionados }
}

async function listarMarcas() {
  const data = await api.get("/productos/marcas");
  return data.marcas;
}

async function crear(payload) {
  const data = await api.post("/productos", payload, { auth: true });
  return data.producto;
}

async function actualizar(id, payload) {
  const data = await api.put(`/productos/${id}`, payload, { auth: true });
  return data.producto;
}

async function cambiarEstado(id, estado) {
  const data = await api.patch(`/productos/${id}/estado`, { estado }, { auth: true });
  return data.producto;
}

async function eliminar(id) {
  return api.delete(`/productos/${id}`, { auth: true });
}

export const productoService = {
  listar,
  obtener,
  listarMarcas,
  crear,
  actualizar,
  cambiarEstado,
  eliminar,
};
