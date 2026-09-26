import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  AccionFila,
  BarraFiltros,
  PanelHeader,
  SelectorFiltro,
  StatCard,
  TablaAdmin,
  Tarjeta,
} from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import { SkeletonFila } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { useDebounce } from "../../hooks/useDebounce";
import { ventaService } from "../../services/ventaService";
import {
  ESTADOS_VENTA,
  formatoFecha,
  formatoNumero,
  formatoPrecio,
  METODOS_PAGO,
  TRANSICIONES_VENTA,
} from "../../utils/formato";

const POR_PAGINA = 10;

const ESTADOS = [
  { value: "", label: "Todos los estados" },
  { value: "pendiente", label: "Pendientes" },
  { value: "pagada", label: "Pagados" },
  { value: "enviada", label: "Enviados" },
  { value: "entregada", label: "Entregados" },
  { value: "cancelada", label: "Cancelados" },
];

/**
 * Gestión de pedidos.
 *
 * Los estados avanzan en un orden concreto (pendiente → pagada →
 * enviada → entregada). El backend rechaza cualquier salto; aquí solo
 * se ofrecen las transiciones válidas. Cancelar devuelve las unidades
 * al inventario automáticamente.
 */
function AdminVentas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [ventas, setVentas] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [resumen, setResumen] = useState({ ingresos_totales: 0, pedidos_validos: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const busquedaRetrasada = useDebounce(busqueda, 400);
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get("estado") || "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);

  const [detalle, setDetalle] = useState(null);
  const [cambio, setCambio] = useState(null); // { venta, estado }
  const [procesando, setProcesando] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirVentas() {
      setCargando(true);
      setError("");
      try {
        const data = await ventaService.listar({
          buscar: busquedaRetrasada,
          estado: filtroEstado,
          desde,
          hasta,
          pagina,
          limite: POR_PAGINA,
        });
        if (!vivo) return;
        setVentas(data.ventas);
        setPaginacion(data.paginacion);
        setResumen(data.resumen);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirVentas();
    return () => {
      vivo = false;
    };
  }, [busquedaRetrasada, filtroEstado, desde, hasta, pagina, recarga]);

  const [filtrosPrevios, setFiltrosPrevios] = useState("");
  const filtrosActuales = `${busquedaRetrasada}|${filtroEstado}|${desde}|${hasta}`;
  if (filtrosPrevios !== filtrosActuales) {
    setFiltrosPrevios(filtrosActuales);
    setPagina(1);
  }

  const cambiarFiltroEstado = (valor) => {
    setFiltroEstado(valor);
    const nuevos = new URLSearchParams(searchParams);
    if (valor) nuevos.set("estado", valor);
    else nuevos.delete("estado");
    setSearchParams(nuevos, { replace: true });
  };

  const confirmarCambio = async () => {
    if (!cambio) return;
    setProcesando(true);
    try {
      const actualizada = await ventaService.cambiarEstado(
        cambio.venta.id_venta,
        cambio.estado
      );
      toast.exito(`Pedido ${actualizada.codigo} marcado como ${cambio.estado}.`);
      setCambio(null);
      if (detalle?.id_venta === actualizada.id_venta) setDetalle(actualizada);
      cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const columnas = [
    { label: "Pedido" },
    { label: "Cliente" },
    { label: "Fecha" },
    { label: "Artículos" },
    { label: "Total" },
    { label: "Estado" },
    { label: "Acciones", className: "text-right" },
  ];

  return (
    <>
      <PanelHeader
        titulo="Pedidos y ventas"
        descripcion="Cada venta guarda sus productos, cantidades y precios del momento de la compra."
        icono="recibo"
      >
        <Button variant="secondary" size="sm" onClick={cargar} icono="refrescar">
          Actualizar
        </Button>
      </PanelHeader>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          etiqueta="Ingresos registrados"
          valor={formatoPrecio(resumen.ingresos_totales)}
          detalle="Sin contar pedidos cancelados"
          icono="billete"
          tono="exito"
          cargando={cargando}
        />
        <StatCard
          etiqueta="Pedidos válidos"
          valor={formatoNumero(resumen.pedidos_validos)}
          detalle="Histórico completo"
          icono="recibo"
          tono="marca"
          cargando={cargando}
        />
        <StatCard
          etiqueta="Resultados del filtro"
          valor={formatoNumero(paginacion.total)}
          detalle="Pedidos que coinciden"
          icono="filtro"
          tono="neutro"
          cargando={cargando}
        />
      </div>

      <Tarjeta sinPadding>
        <div className="p-5 pb-0">
          <BarraFiltros
            busqueda={busqueda}
            onBuscar={setBusqueda}
            placeholder="Buscar por código, cliente, correo o documento..."
          >
            <SelectorFiltro
              value={filtroEstado}
              onChange={cambiarFiltroEstado}
              ariaLabel="Filtrar por estado"
              options={ESTADOS}
            />
          </BarraFiltros>

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-white/50">
              Desde
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="mt-1 block h-10 rounded-xl border border-white/10 px-3 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="text-xs font-semibold text-white/50">
              Hasta
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="mt-1 block h-10 rounded-xl border border-white/10 px-3 text-sm outline-none focus:border-brand-500"
              />
            </label>
            {(desde || hasta || filtroEstado || busqueda) && (
              <Button
                variant="ghost"
                size="sm"
                icono="refrescar"
                onClick={() => {
                  setDesde("");
                  setHasta("");
                  setBusqueda("");
                  cambiarFiltroEstado("");
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-5">
            <Alert tipo="error">{error}</Alert>
          </div>
        ) : (
          <>
            <TablaAdmin columnas={columnas}>
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} columnas={7} />)
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <EmptyState
                      icono="recibo"
                      titulo="No hay pedidos con estos filtros"
                      descripcion="Cuando un cliente confirme una compra, aparecerá aquí automáticamente."
                      className="border-0 bg-transparent py-0"
                    />
                  </td>
                </tr>
              ) : (
                ventas.map((v) => {
                  const estado = ESTADOS_VENTA[v.estado] || ESTADOS_VENTA.pendiente;
                  const siguientes = TRANSICIONES_VENTA[v.estado] || [];
                  return (
                    <tr key={v.id_venta} className="transition-colors hover:bg-white/5">
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-bold text-white">{v.codigo}</p>
                        <p className="text-xs text-white/50">
                          {METODOS_PAGO[v.metodo_pago] || v.metodo_pago}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate font-semibold text-white/80">
                          {v.cliente_nombre}
                        </p>
                        <p className="truncate text-xs text-white/50">{v.cliente_email}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-white/50">
                        {formatoFecha(v.creado_en)}
                      </td>
                      <td className="px-4 py-3 text-white/60">{v.total_articulos}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-white">
                        {formatoPrecio(v.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge clase={estado.clase}>{estado.texto}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {siguientes.length > 0 && (
                            <select
                              value=""
                              onChange={(e) =>
                                e.target.value && setCambio({ venta: v, estado: e.target.value })
                              }
                              aria-label={`Cambiar estado del pedido ${v.codigo}`}
                              style={{ colorScheme: "dark" }}
                              className="rounded-lg border border-white/10 bg-dark-900 px-2 py-1.5 text-xs font-semibold text-white/60 outline-none transition-colors focus:border-brand-500"
                            >
                              <option value="">Cambiar a...</option>
                              {siguientes.map((s) => (
                                <option key={s} value={s}>
                                  {ESTADOS_VENTA[s].texto}
                                </option>
                              ))}
                            </select>
                          )}
                          <AccionFila
                            icono="ojo"
                            etiqueta="Ver detalle del pedido"
                            tono="marca"
                            onClick={() => setDetalle(v)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </TablaAdmin>

            <div className="px-5">
              <Pagination
                pagina={paginacion.pagina}
                totalPaginas={paginacion.total_paginas}
                total={paginacion.total}
                onCambiar={setPagina}
                etiqueta="pedidos"
              />
            </div>
          </>
        )}
      </Tarjeta>

      {/* Detalle del pedido */}
      <Modal
        isOpen={!!detalle}
        onClose={() => setDetalle(null)}
        title={`Pedido ${detalle?.codigo || ""}`}
        descripcion={detalle ? formatoFecha(detalle.creado_en) : undefined}
        size="lg"
      >
        {detalle && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge clase={(ESTADOS_VENTA[detalle.estado] || ESTADOS_VENTA.pendiente).clase}>
                {(ESTADOS_VENTA[detalle.estado] || ESTADOS_VENTA.pendiente).texto}
              </Badge>
              <span className="text-xs text-white/50">
                {METODOS_PAGO[detalle.metodo_pago] || detalle.metodo_pago}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-dark-900 p-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                  Cliente
                </p>
                <p className="text-sm font-semibold text-white">
                  {detalle.cliente_nombre}
                </p>
                <p className="break-all text-xs text-white/50">{detalle.cliente_email}</p>
                <p className="text-xs text-white/50">{detalle.cliente_telefono}</p>
                {detalle.cliente_documento && (
                  <p className="text-xs text-white/50">Doc. {detalle.cliente_documento}</p>
                )}
              </div>
              <div className="rounded-xl bg-dark-900 p-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                  Envío
                </p>
                <p className="text-sm text-white/80">{detalle.direccion_envio}</p>
                <p className="text-xs text-white/50">{detalle.ciudad}</p>
                {detalle.notas && (
                  <p className="mt-1.5 text-xs italic text-white/50">
                    Nota: {detalle.notas}
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-dark-900 text-left text-xs font-bold uppercase text-white/50">
                  <tr>
                    <th className="px-4 py-2.5">Producto</th>
                    <th className="px-4 py-2.5 text-center">Cant.</th>
                    <th className="px-4 py-2.5 text-right">Precio</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {detalle.detalles?.map((d) => (
                    <tr key={d.id_detalle}>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-white">{d.nombre_producto}</p>
                        {d.marca_producto && (
                          <p className="text-xs text-white/50">{d.marca_producto}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center text-white/60">{d.cantidad}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-white/60">
                        {formatoPrecio(d.precio_unitario)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-white">
                        {formatoPrecio(d.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="space-y-1.5 rounded-xl bg-dark-900 p-4 text-sm">
              <div className="flex justify-between text-white/60">
                <dt>Subtotal</dt>
                <dd>{formatoPrecio(detalle.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-white/60">
                <dt>Envío</dt>
                <dd>
                  {detalle.costo_envio === 0 ? "Gratis" : formatoPrecio(detalle.costo_envio)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 text-base font-bold text-white">
                <dt>Total</dt>
                <dd className="text-brand-500">{formatoPrecio(detalle.total)}</dd>
              </div>
            </dl>

            {(TRANSICIONES_VENTA[detalle.estado] || []).length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-white/80">Cambiar estado a:</p>
                <div className="flex flex-wrap gap-2">
                  {TRANSICIONES_VENTA[detalle.estado].map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === "cancelada" ? "danger" : "primary"}
                      onClick={() => setCambio({ venta: detalle, estado: s })}
                    >
                      {ESTADOS_VENTA[s].texto}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {detalle.estado === "entregada" && (
              <Alert tipo="exito">
                Este pedido está entregado y cerrado. Su información queda como histórico.
              </Alert>
            )}
            {detalle.estado === "cancelada" && (
              <Alert tipo="alerta">
                Pedido cancelado. Las unidades ya fueron devueltas al inventario.
              </Alert>
            )}

            <div className="no-imprimir flex justify-end gap-2">
              <Button variant="secondary" size="sm" icono="imprimir" onClick={() => window.print()}>
                Imprimir
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDetalle(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!cambio}
        onClose={() => setCambio(null)}
        onConfirmar={confirmarCambio}
        titulo="Cambiar estado del pedido"
        mensaje={`¿Marcar el pedido ${cambio?.venta?.codigo} como "${
          ESTADOS_VENTA[cambio?.estado]?.texto || cambio?.estado
        }"?`}
        detalle={
          cambio?.estado === "cancelada"
            ? "Al cancelar, todas las unidades del pedido vuelven automáticamente al inventario y queda registro en el kardex."
            : "El cambio queda registrado con su fecha y el cliente lo verá en su cuenta."
        }
        textoConfirmar="Confirmar"
        peligroso={cambio?.estado === "cancelada"}
        cargando={procesando}
      />
    </>
  );
}

export default AdminVentas;
