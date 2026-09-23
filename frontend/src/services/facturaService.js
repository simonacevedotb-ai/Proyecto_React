import { api, construirQuery } from "./api";

/**
 * Facturación de ventas.
 *
 * La factura se emite a partir de una venta ya registrada: el backend
 * copia los importes y los datos del cliente en ese momento, de modo que
 * el documento no cambia aunque después cambien los precios.
 */
async function listar(filtros = {}) {
  return api.get(`/facturas${construirQuery(filtros)}`, { auth: true });
}

async function misFacturas() {
  const data = await api.get("/facturas/mis-facturas", { auth: true });
  return data.facturas;
}

async function obtener(idFactura) {
  const data = await api.get(`/facturas/${idFactura}`, { auth: true });
  return data.factura;
}

async function emitir({ idVenta, observaciones }) {
  return api.post("/facturas", { id_venta: idVenta, observaciones }, { auth: true });
}

async function cambiarEstado(idFactura, estado) {
  return api.patch(`/facturas/${idFactura}/estado`, { estado }, { auth: true });
}

/** Descarga el PDF de la factura con el nombre que propone el servidor. */
async function descargarPDF(idFactura, numero = "factura") {
  return api.descargar(`/facturas/${idFactura}/pdf`, `${numero}.pdf`);
}

export const facturaService = {
  listar,
  misFacturas,
  obtener,
  emitir,
  cambiarEstado,
  descargarPDF,
};
