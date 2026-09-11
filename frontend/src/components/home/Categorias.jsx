import { Link } from "react-router-dom";

import Icon from "../ui/Icon";
import { ICONOS_CATEGORIA } from "../../utils/iconos";
import { Skeleton } from "../ui/Skeleton";

/** Rejilla de categorías del catálogo, con el número real de productos. */
function Categorias({ categorias = [], cargando = false }) {
  if (!cargando && categorias.length === 0) return null;

  return (
    <section className="bg-dark-900 py-14 sm:py-16">
      <div className="mx-auto w-[94%] max-w-7xl">
        <header className="reveal mb-8 text-center">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-500">
            Explora por categoría
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Encuentra justo lo que <span className="text-brand-500">necesitas</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/50 sm:text-base">
            Organizamos el catálogo para que llegues a tu producto en dos clics.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cargando
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-2xl" />
              ))
            : categorias.map((categoria, i) => (
                <Link
                  key={categoria.id_categoria}
                  to={`/productos?categoria=${categoria.id_categoria}`}
                  className={`reveal reveal-d${Math.min(i + 1, 5)} group flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-dark-800 p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/10`}
                >
                  <span className="flex h-14 w-14 items-center justify-center border border-brand-500/25 bg-brand-500/10 text-brand-500 transition-all duration-300 group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white">
                    <Icon
                      name={ICONOS_CATEGORIA[categoria.icono] || "caja"}
                      className="h-6 w-6"
                    />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white transition-colors group-hover:text-brand-500">
                      {categoria.nombre}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/40">
                      {categoria.total_productos ?? 0}{" "}
                      {categoria.total_productos === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

export default Categorias;
