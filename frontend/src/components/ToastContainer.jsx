import { useToast } from "../context/ToastContext";
import Icon from "./ui/Icon";

const ESTILOS = {
  exito: {
    barra: "bg-emerald-500",
    icono: "checkCirculo",
    color: "text-emerald-500",
    titulo: "Listo",
  },
  error: {
    barra: "bg-rose-500",
    icono: "error",
    color: "text-rose-500",
    titulo: "Ocurrió un problema",
  },
  alerta: {
    barra: "bg-amber-500",
    icono: "alerta",
    color: "text-amber-500",
    titulo: "Atención",
  },
  info: {
    barra: "bg-brand-500",
    icono: "info",
    color: "text-brand-500",
    titulo: "Información",
  },
};

/**
 * Avisos flotantes de la aplicación.
 *
 * Se apilan arriba a la derecha en escritorio y arriba centrados en
 * móvil, para que no tapen el contenido ni los botones de acción.
 */
function ToastContainer() {
  const { toasts, cerrar } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[calc(var(--altura-header)+12px)] z-[90] flex w-[92%] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-5 sm:translate-x-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const estilo = ESTILOS[toast.tipo] || ESTILOS.info;
        return (
          <div
            key={toast.id}
            role={toast.tipo === "error" ? "alert" : "status"}
            className="pointer-events-auto flex overflow-hidden rounded-xl bg-dark-900 shadow-xl ring-1 ring-slate-900/5 animate-[slideInRight_.3s_cubic-bezier(0.22,1,0.36,1)]"
          >
            <span className={`w-1.5 shrink-0 ${estilo.barra}`} aria-hidden="true" />

            <div className="flex flex-1 items-start gap-3 px-4 py-3">
              <Icon
                name={estilo.icono}
                className={`mt-0.5 h-5 w-5 shrink-0 ${estilo.color}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">
                  {toast.titulo || estilo.titulo}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-white/60">
                  {toast.mensaje}
                </p>
              </div>
              <button
                onClick={() => cerrar(toast.id)}
                aria-label="Cerrar aviso"
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
              >
                <Icon name="cerrar" className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
