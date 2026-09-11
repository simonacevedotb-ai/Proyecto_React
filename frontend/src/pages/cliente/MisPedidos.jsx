import { useEffect, useState } from "react";

import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { Skeleton } from "../../components/ui/Skeleton";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { productoService } from "../../services/productoService";
import { ventaService } from "../../services/ventaService";
import {
  ESTADOS_VENTA,
  formatoFecha,
  formatoPrecio,
  METODOS_PAGO,
} from "../../utils/formato";

const FILTROS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "pagada", label: "Pagados" },
  { value: "enviada", label: "Enviados" },
  { value: "entregada", label: "Entregados" },
  { value: "cancelada", label: "Cancelados" },
];

const LINEA_TIEMPO = ["pendiente", "pagada", "enviada", "entregada"];

/** Historial de compras del cliente con su detalle completo. */
function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");
  const [abierto, setAbierto] = useState(null);
  const [recomprando, setRecomprando] = useState(null);

  const { agregarProducto } = useCart();
  const toast = useToast();

  useEffect(() => {
    let vivo = true;

    async function pedirPedidos() {
      try {
        const lista = await ventaService.misPedidos();
        if (vivo) setPedidos(lista);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirPedidos();
    return () => {
      vivo = false;
    };
  }, []);

  const visibles = filtro ? pedidos.filter((p) => p.estado === filtro) : pedidos;

  /** Vuelve a agregar al carrito los productos de un pedido anterior. */
  const volverAComprar = async (pedido) => {
    setRecomprando(pedido.id_venta);
    let agregados = 0;
    let omitidos = 0;

    for (const detalle of pedido.detalles || []) {
      if (!detalle.id_producto) {
        omitidos += 1;
        continue;
      }
      try {
        const data = await productoService.obtener(detalle.id_producto);
        const producto = data.producto;
        if (producto.estado !== "activo" || producto.stock <= 0) {
          omitidos += 1;
          continue;
        }
        if (agregarProducto(producto, Math.min(detalle.cantidad, producto.stock))) {
          agregados += 1;
        } else {
          omitidos += 1;
        }
      } catch {
        omitidos += 1;
      }
    }

    setRecomprando(null);

    if (agregados === 0) {
      toast.error("Ninguno de los productos de este pedido está disponible.");
    } else if (omitidos > 0) {
      toast.alerta(
        `Agregamos ${agregados} producto(s). ${omitidos} ya no está(n) disponible(s).`
      );
    }
  };

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icono="error"
        titulo="No se pudieron cargar tus pedidos"
        descripcion={error}
        accion="Reintentar"
        onAccion={() => window.location.reload()}
      />
    );
  }

  if (pedidos.length === 0) {
    return (
      <EmptyState
        icono="recibo"
        titulo="Aún no tienes pedidos"
        descripcion="Cuando compres, aquí verás cada pedido con su estado, sus productos y su total."
        accion="Ir al catálogo"
        accionTo="/productos"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Mis pedidos</h1>
        <p className="text-sm text-white/50">
          {pedidos.length} {pedidos.length === 1 ? "pedido registrado" : "pedidos registrados"}
        </p>
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-2 overflow-x-auto pb-1 scroll-oculto">
        {FILTROS.map((f) => {
          const cantidad = f.value
            ? pedidos.filter((p) => p.estado === f.value).length
            : pedidos.length;
          return (
            <button
              key={f.value || "todos"}
              onClick={() => setFiltro(f.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                filtro === f.value
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-white/10 bg-dark-900 text-white/60 hover:border-brand-500/40"
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  filtro === f.value ? "bg-white/25" : "bg-dark-800 text-white/50"
                }`}
              >
                {cantidad}
              </span>
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icono="filtro"
          titulo="No hay pedidos con ese estado"
          descripcion="Prueba con otro filtro para ver el resto de tu historial."
          accion="Ver todos"
          onAccion={() => setFiltro("")}
        />
      ) : (
        <ul className="space-y-4">
          {visibles.map((pedido) => {
            const estado = ESTADOS_VENTA[pedido.estado] || ESTADOS_VENTA.pendiente;
            const expandido = abierto === pedido.id_venta;
            const cancelado = pedido.estado === "cancelada";
            const pasoActual = LINEA_TIEMPO.indexOf(pedido.estado);

            return (
              <li
                key={pedido.id_venta}
                className="overflow-hidden rounded-2xl border border-white/10 bg-dark-900"
              >
                <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-white">
                        {pedido.codigo}
                      </h2>
                      <Badge clase={estado.clase}>{estado.texto}</Badge>
                    </div>
                    <p className="text-xs text-white/50">
                      {formatoFecha(pedido.creado_en)} · {pedido.total_articulos}{" "}
                      {pedido.total_articulos === 1 ? "artículo" : "artículos"} ·{" "}
                      {METODOS_PAGO[pedido.metodo_pago] || pedido.metodo_pago}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-lg font-bold text-white">
                      {formatoPrecio(pedido.total)}
                    </span>
                    <button
                      onClick={() => setAbierto(expandido ? null : pedido.id_venta)}
                      aria-expanded={expandido}
                      className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 transition-colors hover:border-brand-400 hover:text-brand-500"
                    >
                      {expandido ? "Ocultar" : "Ver detalle"}
                      <Icon
                        name="chevronAbajo"
                        className={`h-3.5 w-3.5 transition-transform ${
                          expandido ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {expandido && (
                  <div className="animate-[fadeIn_.25s_ease-out]">
                    {/* Línea de tiempo del pedido */}
                    {!cancelado && (
                      <div className="border-b border-white/10 px-5 py-5">
                        <ol className="flex items-center">
                          {LINEA_TIEMPO.map((paso, i) => {
                            const alcanzado = i <= pasoActual;
                            return (
                              <li key={paso} className="flex flex-1 items-center last:flex-none">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                      alcanzado
                                        ? "bg-brand-500 text-white"
                                        : "bg-dark-800 text-white/40"
                                    }`}
                                  >
                                    {alcanzado ? (
                                      <Icon name="check" className="h-4 w-4" strokeWidth={2.5} />
                                    ) : (
                                      i + 1
                                    )}
                                  </span>
                                  <span
                                    className={`text-[10px] font-semibold capitalize ${
                                      alcanzado ? "text-brand-500" : "text-white/40"
                                    }`}
                                  >
                                    {ESTADOS_VENTA[paso].texto}
                                  </span>
                                </div>
                                {i < LINEA_TIEMPO.length - 1 && (
                                  <span
                                    className={`mx-1 mb-5 h-0.5 flex-1 rounded-full ${
                                      i < pasoActual ? "bg-brand-500" : "bg-dark-700"
                                    }`}
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}

                    {/* Productos */}
                    <ul className="divide-y divide-white/10">
                      {pedido.detalles?.map((d) => (
                        <li
                          key={d.id_detalle}
                          className="flex items-start justify-between gap-3 px-5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {d.nombre_producto}
                            </p>
                            <p className="text-xs text-white/50">
                              {d.marca_producto ? `${d.marca_producto} · ` : ""}
                              {d.cantidad} × {formatoPrecio(d.precio_unitario)}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-white">
                            {formatoPrecio(d.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Totales y envío */}
                    <div className="grid grid-cols-1 gap-4 border-t border-white/10 bg-dark-900 p-5 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">
                          Enviado a
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {pedido.cliente_nombre}
                        </p>
                        <p className="text-xs text-white/50">{pedido.direccion_envio}</p>
                        <p className="text-xs text-white/50">{pedido.ciudad}</p>
                        <p className="text-xs text-white/50">{pedido.cliente_telefono}</p>
                        {pedido.notas && (
                          <p className="mt-1.5 text-xs italic text-white/50">
                            Nota: {pedido.notas}
                          </p>
                        )}
                      </div>

                      <dl className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-white/60">
                          <dt>Subtotal</dt>
                          <dd>{formatoPrecio(pedido.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between text-white/60">
                          <dt>Envío</dt>
                          <dd>
                            {pedido.costo_envio === 0 ? (
                              <span className="font-semibold text-emerald-400">Gratis</span>
                            ) : (
                              formatoPrecio(pedido.costo_envio)
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-1.5 text-base font-bold text-white">
                          <dt>Total</dt>
                          <dd className="text-brand-500">{formatoPrecio(pedido.total)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        icono="refrescar"
                        cargando={recomprando === pedido.id_venta}
                        onClick={() => volverAComprar(pedido)}
                      >
                        Volver a comprar
                      </Button>
                      <Button variant="ghost" size="sm" to="/contacto" icono="chat">
                        ¿Un problema con este pedido?
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MisPedidos;
