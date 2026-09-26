import Icon from "../ui/Icon";
import { Skeleton } from "../ui/Skeleton";

/**
 * Piezas compartidas por todas las pantallas del panel administrativo,
 * para que todas se vean y se comporten igual.
 */

/** Encabezado de sección con título, descripción y acciones. */
export function PanelHeader({ titulo, descripcion, icono, children }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icono && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <Icon name={icono} className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {titulo}
          </h1>
          {descripcion && <p className="mt-0.5 text-sm text-white/50">{descripcion}</p>}
        </div>
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </header>
  );
}

/** Contenedor blanco estándar de las secciones del panel. */
export function Tarjeta({ titulo, descripcion, acciones, children, className = "", sinPadding }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-white/10 bg-dark-900 ${className}`}
    >
      {(titulo || acciones) && (
        <header className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {titulo && <h2 className="text-base font-bold text-white">{titulo}</h2>}
            {descripcion && <p className="text-xs text-white/50">{descripcion}</p>}
          </div>
          {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
        </header>
      )}
      <div className={sinPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

const TONOS = {
  marca: "bg-brand-500/10 text-brand-500",
  exito: "bg-emerald-500/12 text-emerald-400",
  alerta: "bg-amber-500/12 text-amber-400",
  error: "bg-rose-500/12 text-rose-400",
  neutro: "bg-dark-800 text-white/60",
};

/**
 * Tarjeta de indicador.
 *
 * La variación se muestra con flecha + signo además del color, para que
 * no dependa únicamente del verde/rojo.
 */
export function StatCard({
  etiqueta,
  valor,
  detalle,
  icono,
  tono = "marca",
  variacion,
  cargando = false,
  alerta = false,
}) {
  const subeEsBueno = variacion !== undefined && variacion !== null;
  const positiva = Number(variacion) >= 0;

  return (
    <article
      className={`rounded-2xl border bg-dark-900 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        alerta ? "border-rose-500/25 bg-rose-50/40" : "border-white/10"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            TONOS[tono] || TONOS.marca
          }`}
        >
          <Icon name={icono} className="h-5 w-5" />
        </span>

        {subeEsBueno && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${
              positiva ? "bg-emerald-500/12 text-emerald-400" : "bg-rose-500/12 text-rose-400"
            }`}
          >
            <Icon
              name={positiva ? "chevronArriba" : "chevronAbajo"}
              className="h-3 w-3"
              strokeWidth={2.5}
            />
            {positiva ? "+" : ""}
            {Number(variacion).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
        {etiqueta}
      </p>

      {cargando ? (
        <Skeleton className="mt-1.5 h-7 w-28" />
      ) : (
        <p
          className="mt-0.5 truncate text-2xl font-bold text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {valor}
        </p>
      )}

      {detalle && <p className="mt-1 text-xs text-white/40">{detalle}</p>}
    </article>
  );
}

/**
 * Barra de filtros de las tablas administrativas.
 * Buscador + selectores, en una sola fila sobre la tabla.
 */
export function BarraFiltros({ busqueda, onBuscar, placeholder = "Buscar...", children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Icon
          name="buscar"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
        />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 w-full rounded-xl border border-white/10 bg-dark-900 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/25"
        />
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Selector compacto para los filtros de las tablas. */
export function SelectorFiltro({ value, onChange, options, ariaLabel }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        style={{ colorScheme: "dark" }}
        className="h-11 appearance-none rounded-xl border border-white/10 bg-dark-900 pl-4 pr-9 text-sm font-medium text-white/80 outline-none transition-colors focus:border-brand-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevronAbajo"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
      />
    </div>
  );
}

/**
 * Envoltorio de tabla administrativa.
 *
 * En pantallas pequeñas la tabla se desplaza en horizontal dentro de su
 * propio contenedor, sin romper el ancho de la página.
 */
export function TablaAdmin({ columnas, children, className = "" }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead className="bg-dark-900 text-left text-xs font-bold uppercase tracking-wide text-white/50">
          <tr>
            {columnas.map((col) => (
              <th
                key={col.clave || col.label}
                scope="col"
                className={`whitespace-nowrap px-4 py-3 ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">{children}</tbody>
      </table>
    </div>
  );
}

/** Botón de acción dentro de una fila de tabla. */
export function AccionFila({ icono, etiqueta, onClick, tono = "neutro", disabled }) {
  const tonos = {
    neutro: "text-white/50 hover:bg-white/10 hover:text-white/80",
    marca: "text-brand-500 hover:bg-brand-500/10",
    error: "text-rose-400 hover:bg-rose-500/12",
    exito: "text-emerald-400 hover:bg-emerald-500/12",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={etiqueta}
      aria-label={etiqueta}
      className={`rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        tonos[tono] || tonos.neutro
      }`}
    >
      <Icon name={icono} className="h-4 w-4" />
    </button>
  );
}
