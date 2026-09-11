import Icon from "./Icon";

const tipos = {
  exito: {
    contenedor: "border-emerald-500/25 bg-emerald-500/12 text-emerald-400",
    icono: "checkCirculo",
    color: "text-emerald-400",
  },
  error: {
    contenedor: "border-rose-500/25 bg-rose-500/12 text-rose-400",
    icono: "error",
    color: "text-rose-400",
  },
  alerta: {
    contenedor: "border-amber-500/25 bg-amber-500/12 text-amber-400",
    icono: "alerta",
    color: "text-amber-400",
  },
  info: {
    contenedor: "border-brand-500/30 bg-brand-500/10 text-white/85",
    icono: "info",
    color: "text-brand-500",
  },
};

/** Mensaje fijo dentro de una pantalla (no desaparece solo). */
function Alert({ tipo = "info", titulo, children, className = "" }) {
  const estilo = tipos[tipo] || tipos.info;

  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-[fadeIn_.25s_ease-out] ${estilo.contenedor} ${className}`}
    >
      <Icon name={estilo.icono} className={`mt-0.5 h-5 w-5 shrink-0 ${estilo.color}`} />
      <div className="min-w-0 flex-1">
        {titulo && <p className="mb-0.5 font-bold">{titulo}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default Alert;
