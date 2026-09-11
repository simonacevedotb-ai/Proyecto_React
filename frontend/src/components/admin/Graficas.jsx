import { useState } from "react";

import { formatoNumero, formatoPrecio } from "../../utils/formato";

/**
 * Gráficas del panel administrativo, dibujadas en SVG puro.
 *
 * No se usa ninguna librería de gráficos: el SVG se genera con los datos
 * que devuelve /api/dashboard/resumen. Eso mantiene el bundle pequeño y
 * la página rápida.
 *
 * Criterios de color (validados contra fondo blanco):
 *   - Serie única  -> una sola tonalidad de la marca (cian), de claro a
 *     oscuro. Nunca un arcoíris de colores sin significado.
 *   - Estados del pedido -> rampa ordinal de un solo tono, porque los
 *     estados tienen un orden natural (pendiente -> pagada -> enviada ->
 *     entregada). "Cancelada" usa el rojo de estado, y siempre va
 *     acompañado de su etiqueta: el color nunca es el único indicador.
 *   - Rejilla y ejes en gris fino, para que no compitan con los datos.
 */

// Rampa ordinal para los estados: un solo tono, de claro a oscuro, con
// contraste suficiente sobre la tarjeta oscura. Se mantiene en cian y no
// en el rojo de la marca para que el rojo siga significando "cancelada".
const RAMPA_ESTADOS = ["#67e8f9", "#22d3ee", "#06b6d4", "#0e7490"];
const COLOR_CANCELADA = "#ff3d69"; // rojo de estado (crítico)

const TRAZO = "#22d3ee";
const RELLENO = "#06b6d4";
const BARRA = "#22d3ee";
const REJILLA = "rgba(255,255,255,0.07)";
const EJE = "rgba(255,255,255,0.18)";
const TEXTO_TENUE = "#8b8b93";
const FONDO_TARJETA = "#151517"; // separa los puntos de la línea del área

function escalaTicks(maximo, cantidad = 4) {
  if (maximo <= 0) return [0, 1];
  const paso = maximo / cantidad;
  const magnitud = 10 ** Math.floor(Math.log10(paso));
  const pasoRedondo = Math.ceil(paso / magnitud) * magnitud;
  const ticks = [];
  for (let v = 0; v <= pasoRedondo * cantidad; v += pasoRedondo) ticks.push(v);
  return ticks;
}

function formatoCorto(valor) {
  const n = Number(valor) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function Tooltip({ tooltip }) {
  if (!tooltip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-dark-900 px-3 py-2 text-xs text-white shadow-xl"
      style={{ left: `${tooltip.x}%`, top: `${tooltip.y}%` }}
    >
      <p className="font-bold">{tooltip.titulo}</p>
      {tooltip.lineas.map((linea, i) => (
        <p key={i} className="text-white/30">
          {linea}
        </p>
      ))}
    </div>
  );
}

// ===============================================================
// Gráfica de líneas: ingresos por día
// ===============================================================
export function GraficaLineas({ datos = [], titulo, alto = 240 }) {
  const [tooltip, setTooltip] = useState(null);

  if (datos.length === 0) {
    return <SinDatos titulo={titulo} />;
  }

  const ANCHO = 720;
  const ALTO = alto;
  const M = { arriba: 16, derecha: 12, abajo: 30, izquierda: 52 };
  const anchoPlot = ANCHO - M.izquierda - M.derecha;
  const altoPlot = ALTO - M.arriba - M.abajo;

  const maximo = Math.max(...datos.map((d) => d.total), 1);
  const ticks = escalaTicks(maximo);
  const tope = ticks[ticks.length - 1] || 1;

  const x = (i) =>
    M.izquierda + (datos.length === 1 ? anchoPlot / 2 : (i / (datos.length - 1)) * anchoPlot);
  const y = (valor) => M.arriba + altoPlot - (valor / tope) * altoPlot;

  const linea = datos.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.total)}`).join(" ");
  const area = `${linea} L${x(datos.length - 1)},${M.arriba + altoPlot} L${x(0)},${
    M.arriba + altoPlot
  } Z`;

  const hayVentas = datos.some((d) => d.total > 0);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={titulo}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Rejilla horizontal */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.izquierda}
              x2={ANCHO - M.derecha}
              y1={y(t)}
              y2={y(t)}
              stroke={REJILLA}
              strokeWidth="1"
            />
            <text
              x={M.izquierda - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              fill={TEXTO_TENUE}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatoCorto(t)}
            </text>
          </g>
        ))}

        {/* Eje inferior */}
        <line
          x1={M.izquierda}
          x2={ANCHO - M.derecha}
          y1={M.arriba + altoPlot}
          y2={M.arriba + altoPlot}
          stroke={EJE}
          strokeWidth="1"
        />

        {hayVentas && (
          <>
            <path d={area} fill={RELLENO} fillOpacity="0.1" />
            <path
              d={linea}
              fill="none"
              stroke={TRAZO}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Puntos y zonas sensibles al puntero */}
        {datos.map((d, i) => (
          <g key={d.fecha}>
            {d.total > 0 && (
              <circle
                cx={x(i)}
                cy={y(d.total)}
                r="4"
                fill={TRAZO}
                stroke={FONDO_TARJETA}
                strokeWidth="2"
              />
            )}
            <rect
              x={x(i) - anchoPlot / datos.length / 2}
              y={M.arriba}
              width={anchoPlot / datos.length}
              height={altoPlot}
              fill="transparent"
              onMouseEnter={() =>
                setTooltip({
                  x: (x(i) / ANCHO) * 100,
                  y: (y(d.total) / ALTO) * 100 - 4,
                  titulo: d.etiqueta,
                  lineas: [
                    formatoPrecio(d.total),
                    `${d.pedidos} ${d.pedidos === 1 ? "pedido" : "pedidos"}`,
                  ],
                })
              }
            />
            {/* Una etiqueta cada 3 días para que no se amontonen */}
            {i % 3 === 0 && (
              <text
                x={x(i)}
                y={ALTO - 10}
                textAnchor="middle"
                fontSize="11"
                fill={TEXTO_TENUE}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {d.etiqueta}
              </text>
            )}
          </g>
        ))}
      </svg>

      <Tooltip tooltip={tooltip} />

      {!hayVentas && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
          Todavía no hay ventas registradas en este periodo.
        </p>
      )}
    </div>
  );
}

// ===============================================================
// Gráfica de barras verticales: ingresos por mes
// ===============================================================
export function GraficaBarras({ datos = [], titulo, alto = 240 }) {
  const [tooltip, setTooltip] = useState(null);

  if (datos.length === 0) return <SinDatos titulo={titulo} />;

  const ANCHO = 720;
  const ALTO = alto;
  const M = { arriba: 16, derecha: 12, abajo: 34, izquierda: 52 };
  const anchoPlot = ANCHO - M.izquierda - M.derecha;
  const altoPlot = ALTO - M.arriba - M.abajo;

  const maximo = Math.max(...datos.map((d) => d.total), 1);
  const ticks = escalaTicks(maximo);
  const tope = ticks[ticks.length - 1] || 1;

  const anchoBanda = anchoPlot / datos.length;
  const anchoBarra = Math.min(48, anchoBanda - 14); // deja aire entre barras
  const base = M.arriba + altoPlot;

  const hayVentas = datos.some((d) => d.total > 0);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={titulo}
        onMouseLeave={() => setTooltip(null)}
      >
        {ticks.map((t) => {
          const yy = base - (t / tope) * altoPlot;
          return (
            <g key={t}>
              <line
                x1={M.izquierda}
                x2={ANCHO - M.derecha}
                y1={yy}
                y2={yy}
                stroke={REJILLA}
                strokeWidth="1"
              />
              <text
                x={M.izquierda - 8}
                y={yy + 4}
                textAnchor="end"
                fontSize="11"
                fill={TEXTO_TENUE}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatoCorto(t)}
              </text>
            </g>
          );
        })}

        <line
          x1={M.izquierda}
          x2={ANCHO - M.derecha}
          y1={base}
          y2={base}
          stroke={EJE}
          strokeWidth="1"
        />

        {datos.map((d, i) => {
          const alturaBarra = d.total > 0 ? Math.max(3, (d.total / tope) * altoPlot) : 0;
          const cx = M.izquierda + anchoBanda * i + anchoBanda / 2;
          const bx = cx - anchoBarra / 2;
          const by = base - alturaBarra;
          const radio = Math.min(4, alturaBarra / 2);

          return (
            <g key={d.etiqueta}>
              {alturaBarra > 0 && (
                <path
                  d={`M${bx},${base} L${bx},${by + radio} Q${bx},${by} ${bx + radio},${by}
                      L${bx + anchoBarra - radio},${by} Q${bx + anchoBarra},${by} ${
                        bx + anchoBarra
                      },${by + radio} L${bx + anchoBarra},${base} Z`}
                  fill={BARRA}
                />
              )}
              <rect
                x={cx - anchoBanda / 2}
                y={M.arriba}
                width={anchoBanda}
                height={altoPlot}
                fill="transparent"
                onMouseEnter={() =>
                  setTooltip({
                    x: (cx / ANCHO) * 100,
                    y: ((by || base) / ALTO) * 100 - 3,
                    titulo: d.etiqueta,
                    lineas: [
                      formatoPrecio(d.total),
                      `${d.pedidos} ${d.pedidos === 1 ? "pedido" : "pedidos"}`,
                    ],
                  })
                }
              />
              <text
                x={cx}
                y={ALTO - 12}
                textAnchor="middle"
                fontSize="11"
                fill={TEXTO_TENUE}
              >
                {d.etiqueta}
              </text>
            </g>
          );
        })}
      </svg>

      <Tooltip tooltip={tooltip} />

      {!hayVentas && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
          Sin ventas registradas en los últimos meses.
        </p>
      )}
    </div>
  );
}

// ===============================================================
// Barra apilada horizontal: distribución de pedidos por estado
// ===============================================================
const ORDEN_ESTADOS = [
  { clave: "pendiente", etiqueta: "Pendiente", color: RAMPA_ESTADOS[0] },
  { clave: "pagada", etiqueta: "Pagada", color: RAMPA_ESTADOS[1] },
  { clave: "enviada", etiqueta: "Enviada", color: RAMPA_ESTADOS[2] },
  { clave: "entregada", etiqueta: "Entregada", color: RAMPA_ESTADOS[3] },
  { clave: "cancelada", etiqueta: "Cancelada", color: COLOR_CANCELADA },
];

export function BarraEstados({ porEstado = {} }) {
  const total = Object.values(porEstado).reduce((acc, n) => acc + Number(n || 0), 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Todavía no hay pedidos registrados.
      </p>
    );
  }

  const segmentos = ORDEN_ESTADOS.map((estado) => ({
    ...estado,
    cantidad: Number(porEstado[estado.clave] || 0),
    porcentaje: (Number(porEstado[estado.clave] || 0) / total) * 100,
  })).filter((s) => s.cantidad > 0);

  return (
    <div>
      {/* Barra apilada: 2px de separación en el color de la superficie */}
      <div className="mb-4 flex h-4 w-full gap-0.5 overflow-hidden rounded-full">
        {segmentos.map((s) => (
          <div
            key={s.clave}
            style={{ width: `${s.porcentaje}%`, backgroundColor: s.color }}
            title={`${s.etiqueta}: ${s.cantidad}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>

      {/* Leyenda con etiqueta y cifra: la identidad nunca depende solo del color */}
      <ul className="space-y-2">
        {ORDEN_ESTADOS.map((estado) => {
          const cantidad = Number(porEstado[estado.clave] || 0);
          const porcentaje = total > 0 ? (cantidad / total) * 100 : 0;
          return (
            <li key={estado.clave} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: estado.color }}
                aria-hidden="true"
              />
              <span className="flex-1 text-white/60">{estado.etiqueta}</span>
              <span
                className="font-bold text-white"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatoNumero(cantidad)}
              </span>
              <span
                className="w-12 text-right text-xs text-white/40"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {porcentaje.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ===============================================================
// Barras horizontales: productos más vendidos
// ===============================================================
export function BarrasHorizontales({ datos = [], campo = "unidades", sufijo = "u." }) {
  if (datos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/40">
        Aún no hay ventas para calcular el ranking.
      </p>
    );
  }

  const maximo = Math.max(...datos.map((d) => Number(d[campo]) || 0), 1);

  return (
    <ul className="space-y-3.5">
      {datos.map((d, i) => {
        const valor = Number(d[campo]) || 0;
        const porcentaje = (valor / maximo) * 100;
        return (
          <li key={`${d.nombre}-${i}`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold text-white/80">
                <span className="mr-1.5 text-xs text-white/40">{i + 1}.</span>
                {d.nombre}
              </span>
              <span
                className="shrink-0 text-sm font-bold text-white"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatoNumero(valor)} {sufijo}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-dark-800">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${porcentaje}%`, backgroundColor: BARRA }}
              />
            </div>
            {d.ingresos !== undefined && (
              <p className="mt-1 text-xs text-white/40">
                {formatoPrecio(d.ingresos)} en ingresos
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SinDatos({ titulo }) {
  return (
    <p className="py-10 text-center text-sm text-white/40">
      No hay datos para {titulo?.toLowerCase() || "esta gráfica"}.
    </p>
  );
}
