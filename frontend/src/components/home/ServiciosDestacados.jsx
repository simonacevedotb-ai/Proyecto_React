import { Link } from "react-router-dom";

import { formatoPrecio } from "../../utils/formato";
import Icon from "../ui/Icon";
import { ICONOS_SERVICIO } from "../../utils/iconos";
import { Skeleton } from "../ui/Skeleton";

/** Vitrina de servicios técnicos con enlace directo al agendamiento. */
function ServiciosDestacados({ servicios = [], cargando = false }) {
  if (!cargando && servicios.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-dark-900 py-14 text-white sm:py-16">
      <div className="malla-hero pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto w-[94%] max-w-7xl">
        <header className="reveal mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
              Servicio técnico
            </span>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tu equipo en <span className="text-brand-400">buenas manos</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/30 sm:text-base">
              Agenda en línea, deja tu equipo y sigue el estado de la reparación desde
              tu cuenta. Repuestos certificados y garantía por escrito.
            </p>
          </div>

          <Link
            to="/servicios"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-brand-400 transition-colors hover:text-brand-300"
          >
            Ver todos los servicios
            <Icon
              name="flechaDerecha"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cargando
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl opacity-20" />
              ))
            : servicios.slice(0, 6).map((servicio, i) => (
                <Link
                  key={servicio.id_servicio}
                  to={`/servicios?servicio=${servicio.id_servicio}`}
                  className={`reveal reveal-d${Math.min(i + 1, 5)} group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-400/50 hover:bg-white/10`}
                >
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white">
                    <Icon name={ICONOS_SERVICIO[servicio.icono] || "herramienta"} className="h-6 w-6" />
                  </span>

                  <h3 className="mb-2 text-base font-bold">{servicio.nombre}</h3>
                  <p className="lineas-3 mb-4 flex-1 text-sm leading-relaxed text-white/30">
                    {servicio.descripcion}
                  </p>

                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-lg font-bold text-brand-400">
                      {formatoPrecio(servicio.precio)}
                    </span>
                    {servicio.duracion && (
                      <span className="flex items-center gap-1.5 text-xs text-white/40">
                        <Icon name="reloj" className="h-3.5 w-3.5" />
                        {servicio.duracion}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

export default ServiciosDestacados;
