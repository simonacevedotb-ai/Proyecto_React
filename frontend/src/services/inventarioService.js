import { api, construirQuery } from "./api";

/** Devuelve { movimientos, paginacion } */
async function listarMovimientos(filtros = {}) {
  return api.get(`/inventario/movimientos${construirQuery(filtros)}`, { auth: true });
}

/** Devuelve { agotados, stock_bajo, totales } */
async function alertas() {
  return api.get("/inventario/alertas", { auth: true });
}

async function registrarMovimiento(payload) {
  return api.post("/inventario/movimientos", payload, { auth: true });
}

export const inventarioService = { listarMovimientos, alertas, registrarMovimiento };
