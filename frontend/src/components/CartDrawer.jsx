import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatoPrecio } from "../utils/formato";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import Icon from "./ui/Icon";

/**
 * Panel lateral del carrito.
 *
 * Muestra las líneas con su imagen, permite cambiar cantidades dentro
 * del stock disponible, resume subtotal/envío/total e indica cuánto
 * falta para el envío gratis. El botón principal lleva al checkout
 * real, que registra la venta en la base de datos.
 */
function CartDrawer() {
  const {
    items,
    isOpen,
    cerrarCarrito,
    incrementar,
    decrementar,
    eliminarProducto,
    vaciarCarrito,
    subtotal,
    costoEnvio,
    total,
    totalUnidades,
    faltaParaEnvioGratis,
    umbralEnvioGratis,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Bloquea el scroll del fondo mientras el carrito está abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const alPulsar = (e) => {
      if (e.key === "Escape" && isOpen) cerrarCarrito();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [isOpen, cerrarCarrito]);

  const irAlCheckout = () => {
    cerrarCarrito();
    navigate(isAuthenticated ? "/checkout" : "/login", {
      state: isAuthenticated ? undefined : { from: "/checkout" },
    });
  };

  const progresoEnvio = Math.min(100, (subtotal / umbralEnvioGratis) * 100);

  return (
    <>
      <div
        onClick={cerrarCarrito}
        aria-hidden="true"
        className={`fixed inset-0 z-[75] bg-dark-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-label="Carrito de compras"
        className={`fixed right-0 top-0 z-[76] flex h-full w-full max-w-md flex-col bg-dark-900 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-dark-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Icon name="carrito" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Tu carrito</h2>
              <p className="text-xs text-white/50">
                {totalUnidades > 0
                  ? `${totalUnidades} ${totalUnidades === 1 ? "artículo" : "artículos"}`
                  : "Sin artículos"}
              </p>
            </div>
          </div>
          <button
            onClick={cerrarCarrito}
            aria-label="Cerrar carrito"
            className="rounded-full p-2 text-white/40 transition-all hover:rotate-90 hover:bg-white/10 hover:text-white/80"
          >
            <Icon name="cerrar" className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de progreso hacia el envío gratis */}
        {items.length > 0 && (
          <div className="border-b border-white/10 bg-dark-900 px-5 py-3">
            {faltaParaEnvioGratis > 0 ? (
              <p className="mb-2 text-xs text-white/60">
                Te faltan{" "}
                <strong className="text-brand-500">
                  {formatoPrecio(faltaParaEnvioGratis)}
                </strong>{" "}
                para el envío gratis
              </p>
            ) : (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Icon name="checkCirculo" className="h-4 w-4" />
                ¡Tienes envío gratis en este pedido!
              </p>
            )}
            <div className="h-1.5 overflow-hidden rounded-full bg-dark-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                style={{ width: `${progresoEnvio}%` }}
              />
            </div>
          </div>
        )}

        {/* Listado */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <EmptyState
              icono="carrito"
              titulo="Tu carrito está vacío"
              descripcion="Explora el catálogo y agrega los productos que más te gusten."
              accion="Ver productos"
              onAccion={() => {
                cerrarCarrito();
                navigate("/productos");
              }}
              className="mt-6 border-white/10 bg-dark-900"
            />
          ) : (
            <ul className="space-y-3">
              {items.map((it) => {
                const sinMasStock = it.stock ? it.cantidad >= it.stock : false;
                return (
                  <li
                    key={it.id_producto}
                    className="flex gap-3 rounded-xl border border-white/10 bg-dark-900 p-3 shadow-sm transition-shadow duration-200 hover:shadow-md animate-[fadeIn_.25s_ease-out]"
                  >
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-dark-800">
                      {it.imagen_url ? (
                        <img
                          src={it.imagen_url}
                          alt={it.nombre}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Icon name="telefono" className="h-7 w-7 text-white/30" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {it.marca && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-500">
                              {it.marca}
                            </span>
                          )}
                          <h3 className="lineas-2 text-sm font-bold leading-tight text-white">
                            {it.nombre}
                          </h3>
                          <p className="mt-0.5 text-xs text-white/50">
                            {formatoPrecio(it.precio)} c/u
                          </p>
                        </div>
                        <button
                          onClick={() => eliminarProducto(it.id_producto, it.nombre)}
                          aria-label={`Quitar ${it.nombre} del carrito`}
                          className="shrink-0 rounded-lg p-1.5 text-white/30 transition-colors hover:bg-rose-500/12 hover:text-rose-500"
                        >
                          <Icon name="eliminar" className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div className="flex items-center rounded-lg border border-white/10 bg-dark-900">
                          <button
                            onClick={() => decrementar(it.id_producto)}
                            disabled={it.cantidad <= 1}
                            aria-label="Disminuir cantidad"
                            className="flex h-8 w-8 items-center justify-center rounded-l-lg text-white/60 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:bg-transparent"
                          >
                            <Icon name="menos" className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-bold tabular-nums text-white">
                            {it.cantidad}
                          </span>
                          <button
                            onClick={() => incrementar(it.id_producto)}
                            disabled={sinMasStock}
                            aria-label="Aumentar cantidad"
                            className="flex h-8 w-8 items-center justify-center rounded-r-lg text-white/60 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:bg-transparent"
                          >
                            <Icon name="mas" className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-white">
                          {formatoPrecio(it.precio * it.cantidad)}
                        </span>
                      </div>

                      {sinMasStock && (
                        <p className="mt-1.5 text-[11px] font-medium text-amber-400">
                          Máximo disponible: {it.stock} unidad(es)
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Resumen y acciones */}
        {items.length > 0 && (
          <div className="border-t border-white/10 bg-dark-900 px-5 py-4">
            <dl className="mb-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-white/60">
                <dt>Subtotal</dt>
                <dd className="font-semibold">{formatoPrecio(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between text-white/60">
                <dt>Envío</dt>
                <dd className={costoEnvio === 0 ? "font-semibold text-emerald-400" : "font-semibold"}>
                  {costoEnvio === 0 ? "Gratis" : formatoPrecio(costoEnvio)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
                <dt>Total</dt>
                <dd className="text-brand-500">{formatoPrecio(total)}</dd>
              </div>
            </dl>

            <div className="space-y-2">
              <Button fullWidth size="lg" onClick={irAlCheckout} iconoDerecha="flechaDerecha">
                {isAuthenticated ? "Finalizar compra" : "Inicia sesión para comprar"}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    cerrarCarrito();
                    navigate("/productos");
                  }}
                >
                  Seguir comprando
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => vaciarCarrito()}
                  className="text-rose-400 hover:bg-rose-500/12"
                >
                  Vaciar carrito
                </Button>
              </div>
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
              <Icon name="candado" className="h-3.5 w-3.5" />
              Compra protegida. El precio final lo confirma el servidor.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

export default CartDrawer;
