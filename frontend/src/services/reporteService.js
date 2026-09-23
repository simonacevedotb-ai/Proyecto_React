import { api, construirQuery } from "./api";

/**
 * Reporte de ventas y sus descargas.
 *
 * Los tres endpoints comparten la misma consulta en el backend, así que
 * lo que se ve en pantalla es exactamente lo que se descarga.
 */
async function ventas(filtros = {}) {
  return api.get(`/reportes/ventas${construirQuery(filtros)}`, { auth: true });
}

async function descargarPDF(filtros = {}) {
  return api.descargar(
    `/reportes/ventas/pdf${construirQuery(filtros)}`,
    "reporte-ventas.pdf"
  );
}

async function descargarExcel(filtros = {}) {
  return api.descargar(
    `/reportes/ventas/excel${construirQuery(filtros)}`,
    "reporte-ventas.xlsx"
  );
}

export const reporteService = { ventas, descargarPDF, descargarExcel };
