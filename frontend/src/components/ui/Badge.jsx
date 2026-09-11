/** Etiqueta de estado (pedidos, stock, solicitudes, mensajes). */
function Badge({ children, clase = "", tono = "slate", className = "" }) {
  const tonos = {
    slate: "bg-dark-800 text-white/60 border-white/10",
    marca: "bg-brand-500/10 text-brand-500 border-brand-500/30",
    exito: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
    alerta: "bg-amber-500/12 text-amber-400 border-amber-500/25",
    error: "bg-rose-500/12 text-rose-400 border-rose-500/25",
    oscuro: "bg-dark-900 text-white border-dark-900",
    acento: "bg-accent-500 text-dark-900 border-accent-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        clase || tonos[tono] || tonos.slate
      } ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
