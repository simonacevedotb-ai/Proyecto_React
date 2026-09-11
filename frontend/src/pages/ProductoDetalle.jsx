import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import ProductCard from "../components/tienda/ProductCard";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import { Skeleton } from "../components/ui/Skeleton";
import { useCart } from "../context/CartContext";
import { useReveal } from "../hooks/useReveal";
import { productoService } from "../services/productoService";
import { formatoPrecio, porcentajeDescuento } from "../utils/formato";

const GARANTIAS = [
  { icono: "escudo", titulo: "Garantía de 12 meses", texto: "Directa con la tienda" },
  { icono: "camion", titulo: "Envío 24-48 horas", texto: "Gratis desde $1.500.000" },
  { icono: "refrescar", titulo: "Cambio en 5 días", texto: "Si no es lo que esperabas" },
  { icono: "candado", titulo: "Compra protegida", texto: "Precio validado en el servidor" },
];

/** Ficha completa de un producto, con selector de cantidad y relacionados. */
function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agregarProducto, cantidadEnCarrito, abrirCarrito } = useCart();

  const [producto, setProducto] = useState(null);
  const [relacionados, setRelacionados] = useState([]);
  const [cantidad, setCantidad] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    window.scrollTo({ top: 0, behavior: "smooth" });

    async function pedirProducto() {
      setCargando(true);
      setError("");
      setCantidad(1);
      try {
        const data = await productoService.obtener(id);
        if (!vivo) return;
        setProducto(data.producto);
        setRelacionados(data.relacionados || []);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirProducto();
    return () => {
      vivo = false;
    };
  }, [id]);

  useReveal([producto, relacionados]);

  if (cargando) {
    return (
      <div className="mx-auto w-[94%] max-w-7xl py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="mx-auto w-[94%] max-w-3xl py-16">
        <EmptyState
          icono="buscar"
          titulo="No encontramos este producto"
          descripcion={
            error === "Producto no encontrado."
              ? "Puede que ya no esté disponible en el catálogo."
              : error
          }
          accion="Volver al catálogo"
          accionTo="/productos"
        />
      </div>
    );
  }

  const stock = Number(producto.stock ?? 0);
  const agotado = stock <= 0;
  const pocasUnidades = !agotado && stock <= (producto.stock_minimo || 5);
  const descuento = porcentajeDescuento(producto.precio, producto.precio_anterior);
  const enCarrito = cantidadEnCarrito(producto.id_producto);
  const disponibleParaAgregar = Math.max(0, stock - enCarrito);

  const handleAgregar = () => {
    if (agregarProducto(producto, cantidad)) {
      setCantidad(1);
    }
  };

  const handleComprarAhora = () => {
    if (agregarProducto(producto, cantidad)) {
      abrirCarrito();
    }
  };

  return (
    <div className="bg-dark-900 pb-16">
      {/* Ruta de navegación */}
      <div className="border-b border-white/10 bg-dark-900">
        <nav
          aria-label="Ruta"
          className="mx-auto flex w-[94%] max-w-7xl items-center gap-1.5 overflow-x-auto py-4 text-xs text-white/40 scroll-oculto"
        >
          <Link to="/" className="whitespace-nowrap transition-colors hover:text-brand-500">
            Inicio
          </Link>
          <Icon name="chevronDerecha" className="h-3 w-3 shrink-0" />
          <Link to="/productos" className="whitespace-nowrap transition-colors hover:text-brand-500">
            Productos
          </Link>
          {producto.categoria && (
            <>
              <Icon name="chevronDerecha" className="h-3 w-3 shrink-0" />
              <Link
                to={`/productos?categoria=${producto.id_categoria}`}
                className="whitespace-nowrap transition-colors hover:text-brand-500"
              >
                {producto.categoria}
              </Link>
            </>
          )}
          <Icon name="chevronDerecha" className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium text-white/60">{producto.nombre}</span>
        </nav>
      </div>

      <div className="mx-auto w-[94%] max-w-7xl py-8 sm:py-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/50 transition-colors hover:text-brand-500"
        >
          <Icon name="flechaIzquierda" className="h-4 w-4" />
          Volver
        </button>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Imagen */}
          <div className="reveal reveal-izq">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-dark-900 shadow-sm">
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className={`h-full w-full object-cover transition-transform duration-500 hover:scale-105 ${
                    agotado ? "opacity-60 grayscale" : ""
                  }`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/70">
                  <Icon name="telefono" className="h-32 w-32" strokeWidth={0.8} />
                </div>
              )}

              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {descuento > 0 && !agotado && (
                  <span className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow">
                    -{descuento}% de descuento
                  </span>
                )}
                {producto.destacado && (
                  <span className="flex items-center gap-1 border border-brand-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-500">
                    <Icon name="estrella" className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Destacado
                  </span>
                )}
              </div>

              {agotado && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-[1px]">
                  <span className="rounded-full bg-black px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white">
                    Agotado
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GARANTIAS.map((g) => (
                <div
                  key={g.titulo}
                  className="rounded-xl border border-white/10 bg-dark-900 p-3 text-center"
                >
                  <Icon name={g.icono} className="mx-auto mb-1.5 h-5 w-5 text-brand-500" />
                  <p className="text-[11px] font-bold leading-tight text-white/80">
                    {g.titulo}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-white/40">{g.texto}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Información y compra */}
          <div className="reveal reveal-der">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-500">
                {producto.marca}
              </span>
              {producto.categoria && (
                <Link
                  to={`/productos?categoria=${producto.id_categoria}`}
                  className="rounded-full bg-dark-800 px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/15"
                >
                  {producto.categoria}
                </Link>
              )}
            </div>

            <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              {producto.nombre}
            </h1>

            <p className="mb-6 text-sm leading-relaxed text-white/60 sm:text-base">
              {producto.descripcion ||
                "Producto original distribuido por PhoneStore, con garantía de 12 meses y soporte técnico propio."}
            </p>

            {/* Precio */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-dark-900 p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {formatoPrecio(producto.precio)}
                </span>
                {descuento > 0 && (
                  <>
                    <span className="text-lg text-white/40 line-through">
                      {formatoPrecio(producto.precio_anterior)}
                    </span>
                    <span className="rounded-full bg-rose-500/12 px-2.5 py-1 text-xs font-bold text-rose-400">
                      Ahorras {formatoPrecio(producto.precio_anterior - producto.precio)}
                    </span>
                  </>
                )}
              </div>

              <p className="mt-3 flex items-center gap-2 text-sm">
                {agotado ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="font-semibold text-rose-400">
                      Sin unidades disponibles
                    </span>
                  </>
                ) : pocasUnidades ? (
                  <>
                    <span className="h-2 w-2 animate-[latido_1.4s_ease-in-out_infinite] rounded-full bg-amber-500" />
                    <span className="font-semibold text-amber-400">
                      ¡Solo quedan {stock} unidades!
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-emerald-400">
                      Disponible · {stock} unidades en bodega
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Cantidad y acciones */}
            {!agotado && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-white/80">
                  Cantidad
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-xl border border-white/10 bg-dark-900">
                    <button
                      onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                      disabled={cantidad <= 1}
                      aria-label="Disminuir cantidad"
                      className="flex h-12 w-12 items-center justify-center rounded-l-xl text-white/60 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30"
                    >
                      <Icon name="menos" className="h-4 w-4" />
                    </button>
                    <span className="w-14 text-center text-lg font-bold tabular-nums text-white">
                      {cantidad}
                    </span>
                    <button
                      onClick={() =>
                        setCantidad((c) => Math.min(disponibleParaAgregar || stock, c + 1))
                      }
                      disabled={cantidad >= disponibleParaAgregar}
                      aria-label="Aumentar cantidad"
                      className="flex h-12 w-12 items-center justify-center rounded-r-xl text-white/60 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30"
                    >
                      <Icon name="mas" className="h-4 w-4" />
                    </button>
                  </div>

                  {enCarrito > 0 && (
                    <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-400">
                      <Icon name="check" className="h-3.5 w-3.5" />
                      Ya tienes {enCarrito} en el carrito
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                fullWidth
                icono="carrito"
                onClick={handleAgregar}
                disabled={agotado || disponibleParaAgregar === 0}
              >
                {agotado
                  ? "Producto agotado"
                  : disponibleParaAgregar === 0
                    ? "Ya tienes todo el stock"
                    : "Agregar al carrito"}
              </Button>
              <Button
                size="lg"
                fullWidth
                variant="oscuro"
                onClick={handleComprarAhora}
                disabled={agotado || disponibleParaAgregar === 0}
                iconoDerecha="flechaDerecha"
              >
                Comprar ahora
              </Button>
            </div>

            <div className="mt-6 space-y-2 rounded-2xl bg-dark-900 p-5 text-sm text-white/60 ring-1 ring-white/10">
              <p className="flex items-start gap-2">
                <Icon name="camion" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                Despacho el mismo día si compras antes de las 2:00 p. m.
              </p>
              <p className="flex items-start gap-2">
                <Icon name="billete" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                Paga contra entrega, por transferencia o en efectivo en tienda.
              </p>
              <p className="flex items-start gap-2">
                <Icon name="herramienta" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <span>
                  ¿Necesitas instalación o accesorios?{" "}
                  <Link to="/servicios" className="font-semibold text-brand-500 hover:underline">
                    Mira nuestros servicios
                  </Link>
                  .
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Relacionados */}
        {relacionados.length > 0 && (
          <section className="mt-14">
            <h2 className="reveal mb-6 text-xl font-bold tracking-tight text-white sm:text-2xl">
              También te puede <span className="text-brand-500">interesar</span>
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relacionados.map((p, i) => (
                <ProductCard
                  key={p.id_producto}
                  producto={p}
                  className={`reveal reveal-d${Math.min(i + 1, 5)}`}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProductoDetalle;
