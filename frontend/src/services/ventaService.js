import { api, construirQuery } from "./api";

/** Registra la compra. Solo envía id_producto y cantidad: el backend
 *  calcula los precios para que no se puedan manipular desde aquí. */
async function crear({ items, datosEnvio }) {
  const payload = {
    items: items.map((it) => ({
      id_producto: it.id_producto,
      cantidad: it.cantidad,
    })),
    ...datosEnvio,
  };
  const data = await api.post("/ventas", payload, { auth: true });
  return data; // { ok, message, venta }
}

async function misPedidos() {
  const data = await api.get("/ventas/mis-pedidos", { auth: true });
  return data.ventas;
}

/** Devuelve { ventas, paginacion, resumen } */
async function listar(filtros = {}) {
  return api.get(`/ventas${construirQuery(filtros)}`, { auth: true });
}

async function obtener(id) {
  const data = await api.get(`/ventas/${id}`, { auth: true });
  return data.venta;
}

async function cambiarEstado(id, estado) {
  const data = await api.patch(`/ventas/${id}/estado`, { estado }, { auth: true });
  return data.venta;
}

export const ventaService = { crear, misPedidos, listar, obtener, cambiarEstado };
