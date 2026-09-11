import { useState } from "react";

import { useCart } from "../../context/CartContext";
import { formatoPrecio, porcentajeDescuento } from "../../utils/formato";
import Icon from "../ui/Icon";
import ProductoModal from "./ProductoModal";

/**
 * Tarjeta de producto del catálogo.
 *
 * Al pulsarla se abre la vista rápida en una ventana modal, sin salir del
 * listado; desde ahí se puede ir a la ficha completa. El botón de agregar
 * al carrito funciona directamente desde la tarjeta.
 *
 * Estados que comunica de un vistazo:
 *   - Agotado / Últimas unidades / disponible
 *   - Porcentaje de descuento cuando hay precio anterior
 *   - Cuántas unidades ya lleva el usuario en el carrito
 */
function ProductCard({ producto, className = "" }) {
  const { agregarProducto, cantidadEnCarrito } = useCart();
  const [modalAbierto, setModalAbierto] = useState(false);

  const stock = Number(producto.stock ?? 0);
  const agotado = stock <= 0;
  const pocasUnidades = !agotado && stock <= (producto.stock_minimo || 5);
  const descuento = porcentajeDescuento(producto.precio, producto.precio_anterior);
  const enCarrito = cantidadEnCarrito(producto.id_producto);
  const sinMasStock = enCarrito >= stock;

  const handleAgregar = (e) => {
    e.preventDefault();
    e.stopPropagation();
    agregarProducto(producto);
  };

  const abrir = () => setModalAbierto(true);

  return (
    <>
      <article
        className={`tarjeta tarjeta-hover group flex flex-col overflow-hidden ${className}`}
      >
        <div className="relative aspect-square overflow-hidden bg-dark-800">
          {/* Área pulsable de la imagen: abre la vista rápida */}
          <button
            type="button"
            onClick={abrir}
            aria-label={`Ver detalles de ${producto.nombre}`}
            className="absolute inset-0 block h-full w-full cursor-pointer"
          >
            <span
              className="malla-tecnica absolute inset-0 opacity-60"
              aria-hidden="true"
            />
            {producto.imagen_url ? (
              <img
                src={producto.imagen_url}
                alt={producto.nombre}
                loading="lazy"
                className={`relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  agotado ? "opacity-50 grayscale" : ""
                }`}
              />
            ) : (
              <span className="relative flex h-full w-full items-center justify-center text-white/15">
                <Icon name="telefono" className="h-16 w-16" strokeWidth={1} />
              </span>
            )}

            {/* Invitación a abrir la vista rápida (escritorio) */}
            {!agotado && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-full items-center justify-center gap-1.5 bg-brand-500 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition-transform duration-300 group-hover:translate-y-0 sm:flex">
                <Icon name="ojo" className="h-3.5 w-3.5" />
                Vista rápida
              </span>
            )}
          </button>

          {/* Distintivos */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {descuento > 0 && !agotado && (
              <span className="bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">
                -{descuento}%
              </span>
            )}
            {producto.destacado && !agotado && (
              <span className="border border-brand-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                Destacado
              </span>
            )}
          </div>

          {agotado && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black">
                Agotado
              </span>
            </div>
          )}

          {/* Acción rápida al pasar el mouse (escritorio) */}
          {!agotado && (
            <button
              type="button"
              onClick={handleAgregar}
              disabled={sinMasStock}
              aria-label={`Agregar ${producto.nombre} al carrito`}
              className="absolute right-3 top-3 hidden h-10 w-10 -translate-y-2 items-center justify-center bg-brand-500 text-white opacity-0 transition-all duration-300 hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-white/15 group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
            >
              <Icon name={sinMasStock ? "check" : "carrito"} className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-500">
              {producto.marca}
            </span>
            {producto.categoria && (
              <span className="truncate text-[11px] text-white/35">
                {producto.categoria}
              </span>
            )}
          </div>

          <h3 className="mb-1.5">
            <button
              type="button"
              onClick={abrir}
              className="lineas-2 text-left text-[15px] font-medium leading-snug text-white transition-colors hover:text-brand-500"
            >
              {producto.nombre}
            </button>
          </h3>

          <p className="lineas-2 mb-3 flex-1 text-xs leading-relaxed text-white/45">
            {producto.descripcion || "Producto original con garantía PhoneStore."}
          </p>

          <div className="mb-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-bold text-white">
                {formatoPrecio(producto.precio)}
              </span>
              {descuento > 0 && (
                <span className="text-xs text-white/30 line-through">
                  {formatoPrecio(producto.precio_anterior)}
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px]">
              {agotado ? (
                <span className="font-semibold text-brand-500">
                  Sin unidades disponibles
                </span>
              ) : pocasUnidades ? (
                <span className="font-semibold text-accent-400">
                  ¡Últimas {stock} unidades!
                </span>
              ) : (
                <span className="text-white/35">{stock} disponibles</span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAgregar}
            disabled={agotado || sinMasStock}
            className={`inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 active:scale-[0.98] ${
              agotado
                ? "cursor-not-allowed bg-white/5 text-white/30"
                : sinMasStock
                  ? "cursor-not-allowed border border-white/15 text-white/40"
                  : "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-glow"
            }`}
          >
            {agotado ? (
              "Sin stock"
            ) : sinMasStock ? (
              <>
                <Icon name="check" className="h-4 w-4" />
                Ya está en tu carrito ({enCarrito})
              </>
            ) : (
              <>
                <Icon name="carrito" className="h-4 w-4" />
                Agregar al carrito
                {enCarrito > 0 && (
                  <span className="bg-white/25 px-1.5 text-[11px]">{enCarrito}</span>
                )}
              </>
            )}
          </button>
        </div>
      </article>

      <ProductoModal
        producto={producto}
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
      />
    </>
  );
}

export default ProductCard;
