import Icon from "./Icon";

/** Devuelve [1, "...", 4, 5, 6, "...", 20] según la página actual. */
function construirPaginas(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const paginas = [1];
  const inicio = Math.max(2, actual - 1);
  const fin = Math.min(total - 1, actual + 1);

  if (inicio > 2) paginas.push("...");
  for (let i = inicio; i <= fin; i += 1) paginas.push(i);
  if (fin < total - 1) paginas.push("...");
  paginas.push(total);

  return paginas;
}

function Pagination({ pagina, totalPaginas, total, onCambiar, etiqueta = "registros" }) {
  if (!totalPaginas || totalPaginas <= 1) {
    return total ? (
      <p className="py-3 text-center text-xs text-white/40">
        {total} {etiqueta} en total
      </p>
    ) : null;
  }

  const paginas = construirPaginas(pagina, totalPaginas);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-2 py-4 sm:flex-row"
    >
      <p className="text-xs text-white/50">
        Página <strong className="text-white/80">{pagina}</strong> de {totalPaginas}
        {total ? ` · ${total} ${etiqueta}` : ""}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina <= 1}
          aria-label="Página anterior"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-all hover:border-brand-400 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white/50"
        >
          <Icon name="chevronIzquierda" className="h-4 w-4" />
        </button>

        {paginas.map((p, i) =>
          p === "..." ? (
            <span key={`sep-${i}`} className="px-1.5 text-sm text-white/40">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onCambiar(p)}
              aria-current={p === pagina ? "page" : undefined}
              className={`h-9 min-w-9 rounded-lg px-2.5 text-sm font-semibold transition-all ${
                p === pagina
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-600/30"
                  : "border border-white/10 text-white/60 hover:border-brand-400 hover:text-brand-500"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          aria-label="Página siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition-all hover:border-brand-400 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-white/50"
        >
          <Icon name="chevronDerecha" className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
