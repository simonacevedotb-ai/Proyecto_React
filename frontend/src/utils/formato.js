// Formateadores compartidos por toda la aplicación, para que los
// precios, fechas y estados se vean igual en la tienda y en el panel.

const formateadorMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formateadorNumero = new Intl.NumberFormat("es-CO");

export function formatoPrecio(valor) {
  const numero = Number(valor);
  return formateadorMoneda.format(Number.isFinite(numero) ? numero : 0);
}

export function formatoNumero(valor) {
  const numero = Number(valor);
  return formateadorNumero.format(Number.isFinite(numero) ? numero : 0);
}

/** "2026-09-08 14:32:10" -> "8 sep 2026, 2:32 p. m." */
export function formatoFecha(valor, { conHora = true } = {}) {
  if (!valor) return "—";
  const fecha = new Date(String(valor).replace(" ", "T"));
  if (Number.isNaN(fecha.getTime())) return String(valor);

  const opciones = { day: "numeric", month: "short", year: "numeric" };
  if (conHora) {
    opciones.hour = "numeric";
    opciones.minute = "2-digit";
  }
  return fecha.toLocaleString("es-CO", opciones);
}

/** "2026-09-08" para inputs de tipo date */
export function fechaISO(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return d.toISOString().slice(0, 10);
}

export function porcentajeDescuento(precio, precioAnterior) {
  const actual = Number(precio);
  const anterior = Number(precioAnterior);
  if (!anterior || anterior <= actual) return 0;
  return Math.round(((anterior - actual) / anterior) * 100);
}

// --- Etiquetas y colores de estado -------------------------------

export const ESTADOS_VENTA = {
  pendiente: { texto: "Pendiente", clase: "bg-amber-500/18 text-amber-400 border-amber-500/25" },
  pagada: { texto: "Pagada", clase: "bg-sky-500/18 text-sky-400 border-sky-500/25" },
  enviada: { texto: "Enviada", clase: "bg-indigo-500/18 text-indigo-400 border-indigo-500/25" },
  entregada: { texto: "Entregada", clase: "bg-emerald-500/18 text-emerald-400 border-emerald-500/25" },
  cancelada: { texto: "Cancelada", clase: "bg-rose-500/18 text-rose-400 border-rose-500/25" },
};

export const ESTADOS_SOLICITUD = {
  pendiente: { texto: "Pendiente", clase: "bg-amber-500/18 text-amber-400 border-amber-500/25" },
  en_proceso: { texto: "En proceso", clase: "bg-sky-500/18 text-sky-400 border-sky-500/25" },
  completada: { texto: "Completada", clase: "bg-emerald-500/18 text-emerald-400 border-emerald-500/25" },
  cancelada: { texto: "Cancelada", clase: "bg-rose-500/18 text-rose-400 border-rose-500/25" },
};

export const ESTADOS_MENSAJE = {
  nuevo: { texto: "Nuevo", clase: "bg-brand-500/15 text-brand-500 border-brand-500/30" },
  leido: { texto: "Leído", clase: "bg-dark-800 text-white/60 border-white/10" },
  respondido: { texto: "Respondido", clase: "bg-emerald-500/18 text-emerald-400 border-emerald-500/25" },
};

export const METODOS_PAGO = {
  contraentrega: "Pago contra entrega",
  transferencia: "Transferencia bancaria",
  efectivo: "Efectivo en tienda",
};

/** Siguientes estados válidos para un pedido (igual que en el backend). */
export const TRANSICIONES_VENTA = {
  pendiente: ["pagada", "cancelada"],
  pagada: ["enviada", "cancelada"],
  enviada: ["entregada", "cancelada"],
  entregada: [],
  cancelada: [],
};
