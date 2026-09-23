import { useCallback, useEffect, useState } from "react";

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
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import { SkeletonFila } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { useDebounce } from "../../hooks/useDebounce";
import { facturaService } from "../../services/facturaService";
import { ventaService } from "../../services/ventaService";
import { formatoFecha, formatoPrecio } from "../../utils/formato";

const POR_PAGINA = 10;

const ESTADOS = [
  { value: "emitida", label: "Emitidas" },
  { value: "pagada", label: "Pagadas" },
  { value: "anulada", label: "Anuladas" },
];

const COLOR_ESTADO = {
  emitida: "bg-amber-500/15 text-amber-400",
  pagada: "bg-emerald-500/15 text-emerald-400",
  anulada: "bg-white/10 text-white/45",
};

/** Emisión y consulta de las facturas de venta. */
function AdminFacturas() {
  const toast = useToast();

  const [facturas, setFacturas] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [resumen, setResumen] = useState({ facturado: 0, emitidas: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const busquedaDiferida = useDebounce(busqueda, 400);

  const [detalle, setDetalle] = useState(null);
  const [emitiendo, setEmitiendo] = useState(false);
  const [modalEmitir, setModalEmitir] = useState(false);
  const [sinFacturar, setSinFacturar] = useState([]);
  const [buscandoVentas, setBuscandoVentas] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [ventaElegida, setVentaElegida] = useState(null);

  // Volver a la primera página cuando cambian los filtros
  const [filtroAnterior, setFiltroAnterior] = useState("");
  const filtroActual = `${busquedaDiferida}|${estado}`;
  if (filtroAnterior !== filtroActual) {
    setFiltroAnterior(filtroActual);
    setPagina(1);
  }

  useEffect(() => {
    let vivo = true;

    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const datos = await facturaService.listar({
          buscar: busquedaDiferida || undefined,
          estado: estado || undefined,
          pagina,
          limite: POR_PAGINA,
        });
        if (!vivo) return;
        setFacturas(datos.facturas);
        setPaginacion(datos.paginacion);
        setResumen(datos.resumen);
      } catch (fallo) {
        if (vivo) setError(fallo.message || "No se pudieron cargar las facturas.");
      } finally {
        if (vivo) setCargando(false);
      }
    }

    cargar();
    return () => {
      vivo = false;
    };
  }, [busquedaDiferida, estado, pagina, recarga]);

  const refrescar = useCallback(() => setRecarga((n) => n + 1), []);

  /** Trae los pedidos que todavía no tienen factura. */
  const abrirEmisor = async () => {
    setModalEmitir(true);
    setVentaElegida(null);
    setObservaciones("");
    setBuscandoVentas(true);
    try {
      const datos = await ventaService.listar({ limite: 50 });
      const numerosFacturados = new Set(
        (await facturaService.listar({ limite: 100 })).facturas.map((f) => f.id_venta)
      );
      setSinFacturar(
        datos.ventas.filter(
          (v) => v.estado !== "cancelada" && !numerosFacturados.has(v.id_venta)
        )
      );
    } catch (fallo) {
      toast.error(fallo.message || "No se pudieron cargar los pedidos.");
    } finally {
      setBuscandoVentas(false);
    }
  };

  const emitir = async () => {
    if (!ventaElegida) return;
    setEmitiendo(true);
    try {
      const datos = await facturaService.emitir({
        idVenta: ventaElegida.id_venta,
        observaciones: observaciones.trim() || undefined,
      });
      toast.exito(datos.message);
      setModalEmitir(false);
      refrescar();
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo emitir la factura.");
    } finally {
      setEmitiendo(false);
    }
  };

  const descargar = async (factura) => {
    try {
      await facturaService.descargarPDF(factura.id_factura, factura.numero);
      toast.exito(`Descargando ${factura.numero}.pdf`);
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo descargar la factura.");
    }
  };

  const cambiarEstado = async (factura, nuevo) => {
    try {
      const datos = await facturaService.cambiarEstado(factura.id_factura, nuevo);
      toast.exito(datos.message);
      refrescar();
      if (detalle?.id_factura === factura.id_factura) setDetalle(datos.factura);
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo cambiar el estado.");
    }
  };

  const verDetalle = async (factura) => {
    try {
      setDetalle(await facturaService.obtener(factura.id_factura));
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo abrir la factura.");
    }
  };

  return (
    <div className="space-y-6">
      <PanelHeader
        titulo="Facturación"
        descripcion="Emite y consulta las facturas de venta."
        icono="recibo"
      >
        <Button onClick={abrirEmisor} icono="mas">
          Emitir factura
        </Button>
      </PanelHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          etiqueta="Total facturado"
          valor={formatoPrecio(resumen.facturado)}
          detalle="Sin contar las facturas anuladas"
          icono="billete"
          tono="exito"
          cargando={cargando}
        />
        <StatCard
          etiqueta="Facturas emitidas"
          valor={resumen.emitidas}
          detalle={`${paginacion.total} en el filtro actual`}
          icono="recibo"
          tono="marca"
          cargando={cargando}
        />
      </div>

      <Tarjeta sinPadding>
        <BarraFiltros
          busqueda={busqueda}
          onBuscar={setBusqueda}
          placeholder="Buscar por número, cliente, correo o documento..."
        >
          <SelectorFiltro
            value={estado}
            onChange={setEstado}
            options={[{ value: "", label: "Todos los estados" }, ...ESTADOS]}
            ariaLabel="Filtrar por estado"
          />
        </BarraFiltros>

        {error && (
          <div className="p-4">
            <Alert tipo="error">{error}</Alert>
          </div>
        )}

        <>
          <TablaAdmin
            columnas={[
              { label: "Número" },
              { label: "Fecha" },
              { label: "Cliente" },
              { label: "Total" },
              { label: "Estado" },
              { label: "Acciones" },
            ]}
          >
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} columnas={6} />)
            ) : facturas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10">
                  <EmptyState
                    icono="recibo"
                    titulo="No hay facturas con estos filtros"
                    descripcion="Emite la primera factura a partir de un pedido registrado."
                  />
                </td>
              </tr>
            ) : (
              facturas.map((f) => (
                <tr key={f.id_factura} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold text-white">
                      {f.numero}
                    </span>
                    {f.codigo_venta && (
                      <p className="text-[11px] text-white/35">Pedido {f.codigo_venta}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {formatoFecha(f.creado_en)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{f.cliente_nombre}</p>
                    <p className="truncate text-[11px] text-white/35">{f.cliente_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-white">
                    {formatoPrecio(f.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        COLOR_ESTADO[f.estado] || COLOR_ESTADO.emitida
                      }`}
                    >
                      {f.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <AccionFila icono="ojo" etiqueta="Ver" onClick={() => verDetalle(f)} />
                      <AccionFila
                        icono="descargar"
                        etiqueta="Descargar PDF"
                        onClick={() => descargar(f)}
                      />
                      {f.estado === "emitida" && (
                        <AccionFila
                          icono="check"
                          etiqueta="Marcar pagada"
                          tono="exito"
                          onClick={() => cambiarEstado(f, "pagada")}
                        />
                      )}
                      {f.estado !== "anulada" && (
                        <AccionFila
                          icono="cerrar"
                          etiqueta="Anular"
                          tono="error"
                          onClick={() => cambiarEstado(f, "anulada")}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </TablaAdmin>

          <Pagination
            pagina={paginacion.pagina}
            totalPaginas={paginacion.total_paginas}
            total={paginacion.total}
            onCambiar={setPagina}
            etiqueta="facturas"
          />
        </>
      </Tarjeta>

      {/* ---------- Emitir ---------- */}
      <Modal
        isOpen={modalEmitir}
        onClose={() => setModalEmitir(false)}
        title="Emitir una factura"
        descripcion="Elige el pedido que quieres facturar."
        size="lg"
      >
        {buscandoVentas ? (
          <p className="py-10 text-center text-sm text-white/45">Buscando pedidos...</p>
        ) : sinFacturar.length === 0 ? (
          <EmptyState
            icono="check"
            titulo="Todo facturado"
            descripcion="No quedan pedidos pendientes de factura."
          />
        ) : (
          <div className="space-y-4">
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {sinFacturar.map((v) => (
                <button
                  key={v.id_venta}
                  type="button"
                  onClick={() => setVentaElegida(v)}
                  className={`flex w-full items-center justify-between gap-3 border p-3 text-left transition-colors ${
                    ventaElegida?.id_venta === v.id_venta
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{v.codigo}</p>
                    <p className="truncate text-xs text-white/45">
                      {v.cliente_nombre} · {formatoFecha(v.creado_en)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-brand-500">
                    {formatoPrecio(v.total)}
                  </span>
                </button>
              ))}
            </div>

            <Input
              label="Observaciones"
              name="observaciones"
              maxLength={255}
              placeholder="Opcional: una nota que aparecerá en la factura"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />

            <Button
              fullWidth
              size="lg"
              cargando={emitiendo}
              disabled={!ventaElegida}
              onClick={emitir}
              icono="recibo"
            >
              {ventaElegida ? `Emitir factura de ${ventaElegida.codigo}` : "Elige un pedido"}
            </Button>
          </div>
        )}
      </Modal>

      {/* ---------- Detalle ---------- */}
      <Modal
        isOpen={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle ? `Factura ${detalle.numero}` : ""}
        size="lg"
      >
        {detalle && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                  Cliente
                </p>
                <p className="text-sm font-semibold text-white">{detalle.cliente_nombre}</p>
                <p className="text-xs text-white/45">{detalle.cliente_email}</p>
                {detalle.cliente_documento && (
                  <p className="text-xs text-white/45">Doc. {detalle.cliente_documento}</p>
                )}
                {detalle.cliente_direccion && (
                  <p className="text-xs text-white/45">{detalle.cliente_direccion}</p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                  Documento
                </p>
                <p className="text-xs text-white/45">{formatoFecha(detalle.creado_en)}</p>
                <p className="text-xs text-white/45">Pedido {detalle.codigo_venta}</p>
                <span
                  className={`mt-1.5 inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    COLOR_ESTADO[detalle.estado]
                  }`}
                >
                  {detalle.estado}
                </span>
              </div>
            </div>

            <div className="border border-white/10">
              {(detalle.detalles || []).map((d) => (
                <div
                  key={d.id_detalle}
                  className="flex items-center justify-between gap-3 border-b border-white/10 p-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{d.nombre_producto}</p>
                    <p className="text-[11px] text-white/40">
                      {d.cantidad} × {formatoPrecio(d.precio_unitario)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-white">
                    {formatoPrecio(d.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-white/60">
                <dt>Subtotal</dt>
                <dd>{formatoPrecio(detalle.subtotal)}</dd>
              </div>
              {detalle.descuento > 0 && (
                <div className="flex justify-between text-white/60">
                  <dt>Descuento</dt>
                  <dd>- {formatoPrecio(detalle.descuento)}</dd>
                </div>
              )}
              {detalle.impuestos > 0 && (
                <div className="flex justify-between text-white/60">
                  <dt>Impuestos</dt>
                  <dd>{formatoPrecio(detalle.impuestos)}</dd>
                </div>
              )}
              <div className="flex justify-between text-white/60">
                <dt>Envío</dt>
                <dd>
                  {detalle.costo_envio > 0 ? formatoPrecio(detalle.costo_envio) : "Gratis"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
                <dt>Total</dt>
                <dd className="text-brand-500">{formatoPrecio(detalle.total)}</dd>
              </div>
            </dl>

            {detalle.observaciones && (
              <p className="border-l-2 border-brand-500 bg-white/[0.03] p-3 text-xs text-white/55">
                {detalle.observaciones}
              </p>
            )}

            <Button fullWidth onClick={() => descargar(detalle)} icono="descargar">
              Descargar en PDF
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminFacturas;
