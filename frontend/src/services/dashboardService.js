import { api, construirQuery } from "./api";

async function resumen() {
  return api.get("/dashboard/resumen", { auth: true });
}

async function reporte({ desde, hasta } = {}) {
  return api.get(`/dashboard/reporte${construirQuery({ desde, hasta })}`, { auth: true });
}

export const dashboardService = { resumen, reporte };
