import { useEffect, useState } from "react";

import logo from "../assets/images/logo.png";

/**
 * Pantalla de carga de la tienda.
 *
 * Funciona como un telón: cubre la pantalla desde el primer píxel, monta
 * la marca delante de un trazado de líneas y, cuando la aplicación ya
 * puede mostrarse, sube y descubre la tienda.
 *
 * La secuencia se reproduce entera antes de dejar ver la página: aunque
 * los datos lleguen enseguida, el telón espera a terminar la entrada para
 * que no se vea un destello a medias.
 *
 * Props:
 *   - listo: true cuando la aplicación ya puede mostrarse.
 */
const DURACION_INTRO = 1900; // ms que dura la animación de entrada
const DURACION_SALIDA = 900; // ms que tarda el telón en subir

function PantallaCarga({ listo }) {
  const [montada, setMontada] = useState(true);
  const [introTerminada, setIntroTerminada] = useState(false);

  // El telón solo sube cuando se cumplen las dos condiciones, así que no
  // hace falta un estado propio: se deduce de las otras dos.
  const subiendo = listo && introTerminada;

  // Duración mínima: la secuencia de entrada se ve completa
  useEffect(() => {
    const temporizador = setTimeout(() => setIntroTerminada(true), DURACION_INTRO);
    return () => clearTimeout(temporizador);
  }, []);

  // Terminado el ascenso, el telón se desmonta
  useEffect(() => {
    if (!subiendo) return undefined;
    const temporizador = setTimeout(() => setMontada(false), DURACION_SALIDA);
    return () => clearTimeout(temporizador);
  }, [subiendo]);

  // Impide el scroll del fondo mientras se muestra
  useEffect(() => {
    if (!montada) return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [montada]);

  if (!montada) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando PhoneStore"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black"
      style={
        subiendo
          ? {
              animation: `telon-sube ${DURACION_SALIDA}ms cubic-bezier(0.76, 0, 0.24, 1) forwards`,
            }
          : undefined
      }
    >
      {/* Trazado de líneas: entra acercándose detrás de la marca */}
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 animate-[lineas-entran_1.4s_cubic-bezier(0.22,1,0.36,1)_.1s_forwards]"
      >
        <defs>
          <linearGradient id="carga-trazo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff003d" stopOpacity="0" />
            <stop offset="50%" stopColor="#ff003d" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ff003d" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="carga-trazo-tenue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Diagonales largas, simétricas respecto al centro */}
        <g fill="none" strokeWidth="1">
          <path d="M-200 250 L1400 130" stroke="url(#carga-trazo-tenue)" />
          <path d="M-200 330 L1400 210" stroke="url(#carga-trazo-tenue)" />
          <path d="M-200 550 L1400 670" stroke="url(#carga-trazo-tenue)" />
          <path d="M-200 630 L1400 750" stroke="url(#carga-trazo-tenue)" />
          <path d="M-200 190 L1400 70" stroke="url(#carga-trazo)" strokeWidth="1.5" />
          <path d="M-200 690 L1400 810" stroke="url(#carga-trazo)" strokeWidth="1.5" />
        </g>

        {/* Rombo central, el mismo eje donde se apoya la marca */}
        <g fill="none" stroke="url(#carga-trazo-tenue)" strokeWidth="1">
          <path d="M600 250 L860 400 L600 550 L340 400 Z" />
          <path d="M600 180 L960 400 L600 620 L240 400 Z" opacity="0.6" />
        </g>
      </svg>

      {/* Halo rojo muy contenido detrás de la marca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-[120px]"
      />

      {/* ---------- Composición de la marca ---------- */}
      <div className="relative flex flex-col items-center px-6">
        <div className="flex items-center gap-5 sm:gap-7">
          {/* Regla izquierda: crece desde el centro hacia afuera */}
          <span
            aria-hidden="true"
            className="h-px w-10 origin-right bg-gradient-to-l from-brand-500 to-transparent opacity-0 animate-[regla-crece_.7s_cubic-bezier(0.22,1,0.36,1)_.75s_forwards] sm:w-20"
          />

          <img
            src={logo}
            alt="PhoneStore"
            className="w-48 opacity-0 animate-[marca-entra_.9s_cubic-bezier(0.22,1,0.36,1)_.28s_forwards] sm:w-64"
          />

          {/* Regla derecha */}
          <span
            aria-hidden="true"
            className="h-px w-10 origin-left bg-gradient-to-r from-brand-500 to-transparent opacity-0 animate-[regla-crece_.7s_cubic-bezier(0.22,1,0.36,1)_.75s_forwards] sm:w-20"
          />
        </div>

        <p className="mt-7 text-[10px] font-medium uppercase tracking-[0.55em] text-white/40 opacity-0 animate-[letra-entra_.7s_ease-out_1s_forwards] sm:text-[11px]">
          Tecnología móvil
        </p>

        {/* Barra de progreso: se llena durante toda la entrada */}
        <div className="relative mt-8 h-px w-44 overflow-hidden bg-white/10 sm:w-64">
          <span
            aria-hidden="true"
            className="absolute inset-0 origin-left bg-brand-500 animate-[barra-llena_1.7s_cubic-bezier(0.45,0,0.15,1)_.15s_forwards]"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>
    </div>
  );
}

export default PantallaCarga;
