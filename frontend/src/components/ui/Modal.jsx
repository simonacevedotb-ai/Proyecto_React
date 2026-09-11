import { useEffect, useRef } from "react";

import Icon from "./Icon";

const anchos = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Ventana modal accesible.
 *
 * - Se cierra con ESC o haciendo clic fuera.
 * - Bloquea el scroll del fondo sin que la página "salte", compensando
 *   el ancho de la barra de desplazamiento.
 * - Al abrirse lleva el foco dentro y lo devuelve al cerrarse.
 */
function Modal({
  isOpen,
  onClose,
  title,
  descripcion,
  children,
  size = "md",
  cerrarAlHacerClicFuera = true,
}) {
  const contenedorRef = useRef(null);
  const focoPrevioRef = useRef(null);

  // `onClose` suele llegar como función nueva en cada render del padre. Si
  // estuviera entre las dependencias del efecto, el efecto se repetiría con
  // cada tecla que se escribe dentro del modal y el foco volvería al primer
  // campo. Guardándolo en una referencia, el efecto solo depende de que el
  // modal esté abierto y el foco se queda donde el usuario lo puso.
  const alCerrarRef = useRef(onClose);
  useEffect(() => {
    alCerrarRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    focoPrevioRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") alCerrarRef.current?.();
    };
    document.addEventListener("keydown", handleKeyDown);

    // Evita el salto horizontal al ocultar la barra de scroll
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    const overflowPrevio = document.body.style.overflow;
    const paddingPrevio = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`;

    const temporizador = setTimeout(() => {
      const primero = contenedorRef.current?.querySelector(
        "input, select, textarea, button"
      );
      primero?.focus();
    }, 60);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflowPrevio;
      document.body.style.paddingRight = paddingPrevio;
      clearTimeout(temporizador);
      if (focoPrevioRef.current instanceof HTMLElement) {
        focoPrevioRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm animate-[fadeIn_.2s_ease-out] sm:items-center sm:p-4"
      onClick={cerrarAlHacerClicFuera ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`
          max-h-[92vh] w-full overflow-y-auto border border-white/10 bg-dark-900 shadow-2xl
          animate-[fadeInUp_.28s_cubic-bezier(0.22,1,0.36,1)]
          ${anchos[size] || anchos.md}
        `}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-dark-900/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {descripcion && (
              <p className="mt-0.5 text-sm text-white/50">{descripcion}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1 shrink-0 p-2 text-white/45 transition-all hover:rotate-90 hover:text-brand-500"
          >
            <Icon name="cerrar" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
