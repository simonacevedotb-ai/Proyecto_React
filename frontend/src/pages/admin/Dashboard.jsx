import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  BarraEstados,
  BarrasHorizontales,
  GraficaBarras,
  GraficaLineas,
} from "../../components/admin/Graficas";
import { PanelHeader, StatCard, Tarjeta } from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { dashboardService } from "../../services/dashboardService";
import {
  ESTADOS_VENTA,
  formatoFecha,
  formatoNumero,
  formatoPrecio,
} from "../../utils/formato";

/** Dashboard administrativo: el estado del negocio de un vistazo. */
function Dashboard() {
  const { usuario, esAdmin } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [recarga, setRecarga] = useState(0);
  const cargar = () => setRecarga((n) => n + 1);

  useEffect(() => {
    let vivo = true;

    async function pedirResumen() {
      setCargando(true);
      setError("");
      try {
        const data = await dashboardService.resumen();
        if (vivo) setDatos(data);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirResumen();
    return () => {
      vivo = false;
    };
  }, [recarga]);

  if (error) {
    return (
      <>
        <PanelHeader titulo="Dashboard" icono="panel" />
        <Alert tipo="error" titulo="No se pudieron cargar las métricas">
          {error}
        </Alert>
        <Button className="mt-4" onClick={cargar} icono="refrescar">
          Reintentar
        </Button>
      </>
    );
  }

  const v = datos?.ventas || {};
  const inv = datos?.inventario || {};
  const usu = datos?.usuarios || {};
  const at = datos?.atencion || {};

  const hayAlertas = (inv.agotados || 0) > 0 || (inv.stock_bajo || 0) > 0;

  return (
    <>
      <PanelHeader
        titulo={`Hola, ${usuario?.nombre}`}
        descripcion="Este es el estado actual de la tienda."
        icono="panel"
      >
        <Button variant="secondary" size="sm" onClick={cargar} icono="refrescar">
          Actualizar
        </Button>
        <Button size="sm" to="/admin/reportes" icono="grafico">
          Ver reportes
        </Button>
      </PanelHeader>

      {/* Indicadores principales */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Ventas totales"
          valor={formatoPrecio(v.ingresos_totales || 0)}
          detalle={`${formatoNumero(v.pedidos_totales || 0)} pedidos válidos`}
          icono="billete"
          tono="exito"
          cargando={cargando}
        />
        <StatCard
          etiqueta="Ventas de hoy"
          valor={formatoPrecio(v.ingresos_hoy || 0)}
          detalle={`${formatoNumero(v.pedidos_hoy || 0)} pedidos hoy`}
          icono="rayo"
          tono="marca"
          variacion={v.variacion_dia}
          cargando={cargando}
        />
        <StatCard
          etiqueta="Ventas del mes"
          valor={formatoPrecio(v.ingresos_mes || 0)}
          detalle={`${formatoNumero(v.pedidos_mes || 0)} pedidos este mes`}
          icono="grafico"
          tono="marca"
          variacion={v.variacion_mes}
          cargando={cargando}
        />
        <StatCard
          etiqueta="Ticket promedio"
          valor={formatoPrecio(v.ticket_promedio || 0)}
          detalle="Promedio por pedido"
          icono="recibo"
          tono="neutro"
          cargando={cargando}
        />
      </div>

      {/* Indicadores secundarios */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          etiqueta="Productos en catálogo"
          valor={formatoNumero(inv.total_productos || 0)}
          detalle={`${formatoNumero(inv.productos_activos || 0)} activos`}
          icono="caja"
          tono="marca"
          cargando={cargando}
        />
        <StatCard
          etiqueta="Productos agotados"
          valor={formatoNumero(inv.agotados || 0)}
          detalle={`${formatoNumero(inv.stock_bajo || 0)} con stock bajo`}
          icono="alerta"
          tono={inv.agotados > 0 ? "error" : "exito"}
          alerta={inv.agotados > 0}
          cargando={cargando}
        />
        <StatCard
          etiqueta="Usuarios registrados"
          valor={formatoNumero(usu.total || 0)}
          detalle={`${formatoNumero(usu.clientes || 0)} clientes · ${formatoNumero(
            usu.nuevos_mes || 0
          )} nuevos este mes`}
          icono="usuarios"
          tono="marca"
          cargando={cargando}
        />
        <StatCard
          etiqueta="Valor del inventario"
          valor={formatoPrecio(inv.valor_inventario || 0)}
          detalle="Precio de venta × existencias"
          icono="almacen"
          tono="neutro"
          cargando={cargando}
        />
      </div>

      {/* Avisos operativos */}
      {!cargando &&
        (v.pendientes > 0 || at.solicitudes_pendientes > 0 || at.mensajes_nuevos > 0) && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {v.pendientes > 0 && (
              <Link
                to="/admin/ventas?estado=pendiente"
                className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/12 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Icon name="recibo" className="h-5 w-5 shrink-0 text-amber-400" />
                <p className="text-sm font-semibold text-amber-400">
                  {v.pendientes} pedido(s) por confirmar
                </p>
              </Link>
            )}
            {at.solicitudes_pendientes > 0 && (
              <Link
                to="/admin/solicitudes?estado=pendiente"
                className="flex items-center gap-3 rounded-xl border border-sky-500/25 bg-sky-500/12 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Icon name="documento" className="h-5 w-5 shrink-0 text-sky-400" />
                <p className="text-sm font-semibold text-sky-400">
                  {at.solicitudes_pendientes} solicitud(es) sin atender
                </p>
              </Link>
            )}
            {at.mensajes_nuevos > 0 && (
              <Link
                to="/admin/mensajes?estado=nuevo"
                className="flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Icon name="sobre" className="h-5 w-5 shrink-0 text-brand-500" />
                <p className="text-sm font-semibold text-brand-400">
                  {at.mensajes_nuevos} mensaje(s) sin leer
                </p>
              </Link>
            )}
          </div>
        )}

      {/* Gráficas */}
      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta
          titulo="Ingresos de los últimos 14 días"
          descripcion="Total facturado por día, sin contar pedidos cancelados"
          className="xl:col-span-2"
        >
          {cargando ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <GraficaLineas
              datos={datos.series.dias}
              titulo="Ingresos de los últimos 14 días"
            />
          )}
        </Tarjeta>

        <Tarjeta titulo="Pedidos por estado" descripcion="Distribución de todo el histórico">
          {cargando ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <BarraEstados porEstado={v.por_estado} />
          )}
        </Tarjeta>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Tarjeta
          titulo="Ingresos por mes"
          descripcion="Últimos 6 meses"
          className="xl:col-span-2"
        >
          {cargando ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <GraficaBarras datos={datos.series.meses} titulo="Ingresos por mes" />
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Productos más vendidos"
          descripcion="Por unidades vendidas"
          acciones={
            <Link
              to="/admin/reportes"
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              Ver reporte
            </Link>
          }
        >
          {cargando ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <BarrasHorizontales datos={datos.mas_vendidos} />
          )}
        </Tarjeta>
      </div>

      {/* Últimas ventas y alertas de stock */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Tarjeta
          titulo="Últimas ventas"
          acciones={
            <Link
              to="/admin/ventas"
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              Ver todas
            </Link>
          }
          sinPadding
        >
          {cargando ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : datos.ultimas_ventas.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/40">
              Todavía no hay ventas registradas.
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {datos.ultimas_ventas.map((venta) => {
                const estado = ESTADOS_VENTA[venta.estado] || ESTADOS_VENTA.pendiente;
                return (
                  <li key={venta.id_venta}>
                    <Link
                      to="/admin/ventas"
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-white/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">{venta.codigo}</p>
                        <p className="truncate text-xs text-white/50">
                          {venta.cliente_nombre} · {formatoFecha(venta.creado_en)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-bold text-white">
                          {formatoPrecio(venta.total)}
                        </span>
                        <Badge clase={estado.clase}>{estado.texto}</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Alertas de inventario"
          descripcion="Productos que necesitan reposición"
          acciones={
            <Link
              to="/admin/inventario"
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              Gestionar stock
            </Link>
          }
          sinPadding
        >
          {cargando ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : !hayAlertas ? (
            <div className="p-8 text-center">
              <Icon name="checkCirculo" className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-white/80">Inventario saludable</p>
              <p className="text-xs text-white/50">
                Ningún producto está agotado ni por debajo de su mínimo.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {datos.alertas_stock.map((p) => (
                <li
                  key={p.id_producto}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{p.nombre}</p>
                    <p className="text-xs text-white/50">
                      {p.marca} · mínimo {p.stock_minimo} unidades
                    </p>
                  </div>
                  <Badge tono={p.stock <= 0 ? "error" : "alerta"}>
                    {p.stock <= 0 ? "Agotado" : `Quedan ${p.stock}`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      {!esAdmin && (
        <Alert tipo="info" className="mt-5">
          Estás viendo el panel con permisos de <strong>empleado</strong>: puedes
          gestionar catálogo, inventario, pedidos y atención al cliente, pero no
          administrar usuarios ni eliminar registros.
        </Alert>
      )}
    </>
  );
}

export default Dashboard;
