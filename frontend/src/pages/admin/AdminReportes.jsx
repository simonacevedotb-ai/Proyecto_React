import { useCallback, useEffect, useState } from "react";

import { BarrasHorizontales } from "../../components/admin/Graficas";
import { PanelHeader, StatCard, TablaAdmin, Tarjeta } from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { dashboardService } from "../../services/dashboardService";
import {
  ESTADOS_VENTA,
  fechaISO,
  formatoFecha,
  formatoNumero,
  formatoPrecio,
  METODOS_PAGO,
} from "../../utils/formato";

const HOY = new Date();

function inicioDeMes() {
  return fechaISO(new Date(HOY.getFullYear(), HOY.getMonth(), 1));
}

function restarDias(dias) {
  const d = new Date(HOY);
  d.setDate(d.getDate() - dias);
  return fechaISO(d);
}

const RANGOS = [
  { label: "Últimos 7 días", desde: restarDias(6), hasta: fechaISO(HOY) },
  { label: "Últimos 30 días", desde: restarDias(29), hasta: fechaISO(HOY) },
  { label: "Este mes", desde: inicioDeMes(), hasta: fechaISO(HOY) },
  { label: "Este año", desde: `${HOY.getFullYear()}-01-01`, hasta: fechaISO(HOY) },
];

/** Reporte de ventas por rango de fechas, exportable a CSV o impresión. */
function AdminReportes() {
  const toast = useToast();

  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(fechaISO(HOY));
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirReporte() {
      setCargando(true);
      setError("");
      try {
        const data = await dashboardService.reporte({ desde, hasta });
        if (vivo) setDatos(data);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirReporte();
    return () => {
      vivo = false;
    };
  }, [desde, hasta, recarga]);

  const aplicarRango = (rango) => {
    setDesde(rango.desde);
    setHasta(rango.hasta);
  };

  /** Exporta el reporte a un archivo CSV que se abre en Excel. */
  const exportarCSV = () => {
    if (!datos || datos.ventas.length === 0) {
      toast.alerta("No hay datos para exportar en este rango.");
      return;
    }

    const filas = [
      ["Codigo", "Fecha", "Cliente", "Correo", "Ciudad", "Metodo de pago", "Articulos", "Subtotal", "Envio", "Total", "Estado"],
      ...datos.ventas.map((v) => [
        v.codigo,
        v.creado_en,
        v.cliente_nombre,
        v.cliente_email,
        v.ciudad,
        METODOS_PAGO[v.metodo_pago] || v.metodo_pago,
        v.total_articulos,
        v.subtotal,
        v.costo_envio,
        v.total,
        v.estado,
      ]),
    ];

    // El punto y coma y el BOM hacen que Excel en español lo abra bien.
    const csv = filas
      .map((fila) =>
        fila.map((celda) => `"${String(celda ?? "").replace(/"/g, '""')}"`).join(";")
      )
      .join("\r\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte-ventas-${desde}-a-${hasta}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);

    toast.exito("Reporte descargado en formato CSV.");
  };

  const totales = datos?.totales || {};

  const columnas = [
    { label: "Pedido" },
    { label: "Fecha" },
    { label: "Cliente" },
    { label: "Método de pago" },
    { label: "Total" },
    { label: "Estado" },
  ];

  return (
    <>
      <PanelHeader
        titulo="Reportes de ventas"
        descripcion="Consulta el desempeño de la tienda en el periodo que necesites."
        icono="grafico"
      >
        <Button variant="secondary" size="sm" icono="imprimir" onClick={() => window.print()}>
          Imprimir
        </Button>
        <Button size="sm" icono="descargar" onClick={exportarCSV}>
          Exportar CSV
        </Button>
      </PanelHeader>

      {/* Selección de rango */}
      <Tarjeta className="no-imprimir mb-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {RANGOS.map((r) => {
              const activo = r.desde === desde && r.hasta === hasta;
              return (
                <button
                  key={r.label}
                  onClick={() => aplicarRango(r)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    activo
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-white/10 text-white/60 hover:border-brand-500/40 hover:text-brand-500"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-white/50">
              Desde
              <input
                type="date"
                value={desde}
                max={hasta}
                onChange={(e) => setDesde(e.target.value)}
                className="mt-1 block h-11 rounded-xl border border-white/10 px-3 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <label className="text-xs font-semibold text-white/50">
              Hasta
              <input
                type="date"
                value={hasta}
                min={desde}
                max={fechaISO(HOY)}
                onChange={(e) => setHasta(e.target.value)}
                className="mt-1 block h-11 rounded-xl border border-white/10 px-3 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <Button variant="secondary" onClick={cargar} icono="refrescar">
              Actualizar reporte
            </Button>
          </div>
        </div>
      </Tarjeta>

      {error ? (
        <Alert tipo="error" titulo="No se pudo generar el reporte">
          {error}
        </Alert>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              etiqueta="Ingresos del periodo"
              valor={formatoPrecio(totales.ingresos || 0)}
              detalle="Sin contar pedidos cancelados"
              icono="billete"
              tono="exito"
              cargando={cargando}
            />
            <StatCard
              etiqueta="Pedidos"
              valor={formatoNumero(totales.pedidos || 0)}
              detalle="Incluye todos los estados"
              icono="recibo"
              tono="marca"
              cargando={cargando}
            />
            <StatCard
              etiqueta="Artículos vendidos"
              valor={formatoNumero(totales.articulos || 0)}
              detalle="Unidades despachadas"
              icono="caja"
              tono="neutro"
              cargando={cargando}
            />
          </div>

          <p className="mb-5 text-sm text-white/50">
            Periodo: <strong className="text-white/80">{datos?.rango?.desde}</strong> a{" "}
            <strong className="text-white/80">{datos?.rango?.hasta}</strong>
          </p>

          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Tarjeta titulo="Productos más vendidos" descripcion="Ordenados por ingresos">
              {cargando ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : (
                <BarrasHorizontales datos={(datos?.productos || []).slice(0, 8)} />
              )}
            </Tarjeta>

            <Tarjeta titulo="Ventas por método de pago">
              {cargando ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : (datos?.por_metodo_pago || []).length === 0 ? (
                <p className="py-8 text-center text-sm text-white/40">
                  Sin ventas en este periodo.
                </p>
              ) : (
                <ul className="space-y-4">
                  {datos.por_metodo_pago.map((m) => {
                    const porcentaje =
                      totales.ingresos > 0 ? (m.total / totales.ingresos) * 100 : 0;
                    return (
                      <li key={m.metodo}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold text-white/80">
                            {METODOS_PAGO[m.metodo] || m.metodo}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {formatoPrecio(m.total)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-dark-800">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-[width] duration-700"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-white/40">
                          {m.pedidos} {m.pedidos === 1 ? "pedido" : "pedidos"} ·{" "}
                          {porcentaje.toFixed(0)}% de los ingresos
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>
          </div>

          <Tarjeta
            titulo="Detalle de pedidos del periodo"
            descripcion="Máximo 200 registros; usa la exportación para el listado completo"
            sinPadding
          >
            <TablaAdmin columnas={columnas}>
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (datos?.ventas || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState
                      icono="grafico"
                      titulo="Sin ventas en este periodo"
                      descripcion="Prueba con un rango de fechas más amplio."
                      className="border-0 bg-transparent py-0"
                    />
                  </td>
                </tr>
              ) : (
                datos.ventas.map((v) => {
                  const estado = ESTADOS_VENTA[v.estado] || ESTADOS_VENTA.pendiente;
                  return (
                    <tr key={v.id_venta} className="transition-colors hover:bg-white/5">
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-white">
                        {v.codigo}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-white/50">
                        {formatoFecha(v.creado_en)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate font-semibold text-white/80">
                          {v.cliente_nombre}
                        </p>
                        <p className="truncate text-xs text-white/50">{v.ciudad}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-white/60">
                        {METODOS_PAGO[v.metodo_pago] || v.metodo_pago}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-white">
                        {formatoPrecio(v.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge clase={estado.clase}>{estado.texto}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </TablaAdmin>
          </Tarjeta>
        </>
      )}
    </>
  );
}

export default AdminReportes;
