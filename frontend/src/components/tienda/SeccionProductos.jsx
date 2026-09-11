import { Link } from "react-router-dom";

import { SkeletonProducto } from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";
import Icon from "../ui/Icon";
import ProductCard from "./ProductCard";

/**
 * Bloque reutilizable "título + rejilla de productos".
 *
 * Lo usan las secciones de destacados, ofertas y novedades de la
 * página de inicio. Mientras llegan los datos muestra esqueletos con la
 * misma forma que las tarjetas, para que el diseño no salte.
 */
function SeccionProductos({
  titulo,
  resaltado,
  descripcion,
  icono,
  productos = [],
  cargando = false,
  error = "",
  enlaceVerMas,
  textoVerMas = "Ver todo",
  columnas = 4,
  fondo = "",
  vacioTitulo = "Aún no hay productos en esta sección",
  vacioDescripcion = "Vuelve pronto: el catálogo se actualiza constantemente.",
}) {
  const clasesRejilla = {
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };

  if (!cargando && !error && productos.length === 0) {
    // Una sección vacía no aporta nada a la página de inicio.
    if (!vacioTitulo) return null;
  }

  return (
    <section className={`py-14 sm:py-16 ${fondo}`}>
      <div className="mx-auto w-[94%] max-w-7xl">
        <header className="reveal mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {icono && (
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                <Icon name={icono} className="h-5 w-5" />
              </span>
            )}
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {titulo} {resaltado && <span className="text-brand-500">{resaltado}</span>}
            </h2>
            {descripcion && (
              <p className="mt-1.5 max-w-2xl text-sm text-white/50 sm:text-base">
                {descripcion}
              </p>
            )}
          </div>

          {enlaceVerMas && (
            <Link
              to={enlaceVerMas}
              className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-brand-500 transition-colors hover:text-brand-500"
            >
              {textoVerMas}
              <Icon
                name="flechaDerecha"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          )}
        </header>

        {error ? (
          <EmptyState
            icono="error"
            titulo="No se pudieron cargar los productos"
            descripcion={error}
          />
        ) : cargando ? (
          <div className={`grid grid-cols-1 gap-5 ${clasesRejilla[columnas]}`}>
            {Array.from({ length: columnas }).map((_, i) => (
              <SkeletonProducto key={i} />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <EmptyState
            icono="caja"
            titulo={vacioTitulo}
            descripcion={vacioDescripcion}
            accion="Ver todo el catálogo"
            accionTo="/productos"
          />
        ) : (
          <div className={`grid grid-cols-1 gap-5 ${clasesRejilla[columnas]}`}>
            {productos.map((producto, i) => (
              <ProductCard
                key={producto.id_producto}
                producto={producto}
                className={`reveal reveal-d${Math.min(i + 1, 5)}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default SeccionProductos;
