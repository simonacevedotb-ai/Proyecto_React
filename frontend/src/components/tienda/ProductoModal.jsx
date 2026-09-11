import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useCart } from "../../context/CartContext";
import { formatoPrecio, porcentajeDescuento } from "../../utils/formato";
import Icon from "../ui/Icon";

const GARANTIAS = [
  { icono: "escudo", texto: "Garantía 12 meses" },
  { icono: "camion", texto: "Envío a todo el país" },
  { icono: "refrescar", texto: "Cambio en 5 días" },
  { icono: "candado", texto: "Compra protegida" },
];

/**
 * Vista rápida del producto en una ventana modal.
 *
 * Se abre desde la tarjeta del catálogo: el usuario ve la ficha, elige la
 * cantidad y compra sin salir del listado. La ficha completa sigue
 * existiendo en `/productos/:id` para compartir el enlace.
 *
 * Accesibilidad: rol de diálogo, cierre con ESC o clic fuera, bloqueo del
 * scroll del fondo y devolución del foco al elemento que lo abrió.
 *
 * Props:
 *   - producto: objeto del catálogo (null mientras no hay nada abierto)
 *   - abierto: si la ventana se muestra
 *   - onCerrar: se llama al cerrar
 */
function ProductoModal({ producto, abierto, onCerrar }) {
  const { agregarProducto, cantidadEnCarrito, abrirCarrito } = useCart();

  const [cantidad, setCantidad] = useState(1);
  const contenedorRef = useRef(null);
  const focoPrevioRef = useRef(null);

  // Igual que en ui/Modal: si `onCerrar` estuviera entre las dependencias del
  // efecto, cada cambio de cantidad lo volvería a ejecutar y el foco saltaría.
  const alCerrarRef = useRef(onCerrar);
  useEffect(() => {
    alCerrarRef.current = onCerrar;
  }, [onCerrar]);

  const stock = Number(producto?.stock ?? 0);
  const agotado = stock <= 0;
  const enCarrito = producto ? cantidadEnCarrito(producto.id_producto) : 0;
  const disponibleParaSumar = Math.max(0, stock - enCarrito);
  const sinMasStock = !agotado && disponibleParaSumar === 0;
  const pocasUnidades = !agotado && stock <= (producto?.stock_minimo || 5);
  const descuento = producto
    ? porcentajeDescuento(producto.precio, producto.precio_anterior)
    : 0;

  // La cantidad vuelve a 1 cada vez que se abre otro producto. Se ajusta
  // durante el render, que es lo que React recomienda para reaccionar a un
  // cambio de valor, en lugar de usar un efecto con un render extra.
  const [productoAnterior, setProductoAnterior] = useState(producto?.id_producto);
  if (productoAnterior !== producto?.id_producto) {
    setProductoAnterior(producto?.id_producto);
    setCantidad(1);
  }

  // Si el stock disponible baja por debajo de la cantidad elegida, se recorta
  if (cantidad > disponibleParaSumar && disponibleParaSumar > 0) {
    setCantidad(disponibleParaSumar);
  }

  useEffect(() => {
    if (!abierto) return undefined;

    focoPrevioRef.current = document.activeElement;

    const alPulsar = (e) => {
      if (e.key === "Escape") alCerrarRef.current?.();
    };
    document.addEventListener("keydown", alPulsar);

    // Compensa el ancho de la barra de scroll para que la página no salte
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    const overflowPrevio = document.body.style.overflow;
    const paddingPrevio = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`;

    const temporizador = setTimeout(() => {
      contenedorRef.current?.querySelector("button, a")?.focus();
    }, 60);

    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflowPrevio;
      document.body.style.paddingRight = paddingPrevio;
      clearTimeout(temporizador);
      if (focoPrevioRef.current instanceof HTMLElement) {
        focoPrevioRef.current.focus();
      }
    };
  }, [abierto]);

  if (!abierto || !producto) return null;

  const cambiarCantidad = (delta) => {
    setCantidad((previa) => {
      const siguiente = previa + delta;
      if (siguiente < 1) return 1;
      if (siguiente > disponibleParaSumar) return previa;
      return siguiente;
    });
  };

  const handleAgregar = () => agregarProducto(producto, cantidad);

  const handleComprarAhora = () => {
    if (agregarProducto(producto, cantidad)) {
      onCerrar?.();
      abrirCarrito();
    }
  };

  return (
    <div
      onClick={onCerrar}
      role="presentation"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/85 backdrop-blur-sm animate-[fadeIn_.2s_ease-out] sm:items-center sm:p-4"
    >
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-label={producto.nombre}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[94vh] w-full max-w-5xl overflow-y-auto border border-white/10 bg-dark-900 shadow-2xl animate-[fadeInUp_.3s_cubic-bezier(0.22,1,0.36,1)]"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-0 top-0 z-20 flex h-11 w-11 items-center justify-center bg-black/50 text-white/70 transition-all hover:rotate-90 hover:text-brand-500"
        >
          <Icon name="cerrar" className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* ---------- Imagen ---------- */}
          <div className="relative aspect-square overflow-hidden bg-dark-800">
            <div className="malla-tecnica absolute inset-0 opacity-70" aria-hidden="true" />
            <div
              className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-[80px]"
              aria-hidden="true"
            />

            {producto.imagen_url ? (
              <img
                src={producto.imagen_url}
                alt={producto.nombre}
                className={`relative h-full w-full object-contain p-5 ${
                  agotado ? "opacity-50 grayscale" : ""
                }`}
              />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center text-white/15">
                <Icon name="telefono" className="h-24 w-24" strokeWidth={1} />
              </div>
            )}

            <div className="absolute left-4 top-4 flex flex-col items-start gap-1.5">
              {descuento > 0 && !agotado && (
                <span className="bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white">
                  -{descuento}%
                </span>
              )}
              {producto.destacado && !agotado && (
                <span className="border border-brand-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                  Destacado
                </span>
              )}
              {agotado && (
                <span className="bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-black">
                  Agotado
                </span>
              )}
            </div>
          </div>

          {/* ---------- Detalle ---------- */}
          <div className="flex flex-col p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em]">
              <span className="text-brand-500">{producto.marca}</span>
              {producto.categoria && (
                <>
                  <span className="h-3 w-px bg-white/20" aria-hidden="true" />
                  <span className="truncate text-white/40">{producto.categoria}</span>
                </>
              )}
            </div>

            <h2 className="mb-4 text-2xl font-normal leading-tight text-white sm:text-3xl">
              {producto.nombre}
            </h2>

            <div className="mb-1 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-white">
                {formatoPrecio(producto.precio)}
              </span>
              {descuento > 0 && (
                <span className="text-base text-white/35 line-through">
                  {formatoPrecio(producto.precio_anterior)}
                </span>
              )}
            </div>

            <p className="mb-5 text-xs">
              {agotado ? (
                <span className="font-semibold text-brand-500">
                  Sin unidades disponibles
                </span>
              ) : pocasUnidades ? (
                <span className="font-semibold text-accent-400">
                  ¡Últimas {stock} unidades!
                </span>
              ) : (
                <span className="text-white/40">{stock} unidades disponibles</span>
              )}
            </p>

            <p className="mb-6 border-t border-white/10 pt-5 text-sm leading-relaxed text-white/60">
              {producto.descripcion ||
                "Producto original con garantía PhoneStore de 12 meses."}
            </p>

            {/* Cantidad y acciones */}
            {!agotado && (
              <div className="mb-4 flex items-center gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Cantidad
                </span>
                <div className="flex items-center border border-white/15">
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(-1)}
                    disabled={cantidad <= 1}
                    aria-label="Quitar una unidad"
                    className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-brand-500 disabled:cursor-not-allowed disabled:text-white/20"
                  >
                    <Icon name="menos" className="h-4 w-4" />
                  </button>
                  <span
                    aria-live="polite"
                    className="w-10 text-center text-sm font-bold text-white"
                  >
                    {cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(1)}
                    disabled={cantidad >= disponibleParaSumar}
                    aria-label="Agregar una unidad"
                    className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-brand-500 disabled:cursor-not-allowed disabled:text-white/20"
                  >
                    <Icon name="mas" className="h-4 w-4" />
                  </button>
                </div>

                {enCarrito > 0 && (
                  <span className="text-[11px] text-white/40">
                    {enCarrito} ya en tu carrito
                  </span>
                )}
              </div>
            )}

            <div className="mb-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleAgregar}
                disabled={agotado || sinMasStock}
                className={`flex flex-1 items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold uppercase tracking-wide transition-all duration-200 active:scale-[0.98] ${
                  agotado || sinMasStock
                    ? "cursor-not-allowed bg-white/5 text-white/30"
                    : "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-glow"
                }`}
              >
                <Icon name={sinMasStock ? "check" : "carrito"} className="h-4 w-4" />
                {agotado
                  ? "Sin stock"
                  : sinMasStock
                    ? "Sin más unidades"
                    : "Agregar al carrito"}
              </button>

              <button
                type="button"
                onClick={handleComprarAhora}
                disabled={agotado || sinMasStock}
                className="flex flex-1 items-center justify-center gap-2 border border-white/25 px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:border-brand-500 hover:text-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
              >
                <Icon name="rayo" className="h-4 w-4" />
                Comprar ahora
              </button>
            </div>

            {/* Garantías */}
            <ul className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/10 pt-5">
              {GARANTIAS.map((item) => (
                <li
                  key={item.texto}
                  className="flex items-center gap-2 text-[11px] text-white/50"
                >
                  <Icon name={item.icono} className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                  {item.texto}
                </li>
              ))}
            </ul>

            <Link
              to={`/productos/${producto.id_producto}`}
              onClick={onCerrar}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/50 transition-colors hover:text-brand-500"
            >
              Ver ficha completa
              <Icon name="flechaDerecha" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductoModal;
