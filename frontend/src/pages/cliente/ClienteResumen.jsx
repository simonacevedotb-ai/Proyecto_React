import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { solicitudService } from "../../services/solicitudService";
import { ventaService } from "../../services/ventaService";
import {
  ESTADOS_SOLICITUD,
  ESTADOS_VENTA,
  formatoFecha,
  formatoPrecio,
} from "../../utils/formato";

const ACCESOS = [
  {
    to: "/productos",
    icono: "caja",
    titulo: "Seguir comprando",
    texto: "Explora el catálogo completo",
  },
  {
    to: "/servicios",
    icono: "herramienta",
    titulo: "Agendar un servicio",
    texto: "Reparaciones con garantía",
  },
  {
    to: "/contacto",
    icono: "chat",
    titulo: "Necesito ayuda",
    texto: "Escríbenos tu caso",
  },
];

/** Panel de inicio del cliente: datos, resumen de actividad y accesos. */
function ClienteResumen() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;

    async function pedirDatos() {
      const [ventas, solis] = await Promise.all([
        ventaService.misPedidos().catch(() => []),
        solicitudService.misSolicitudes().catch(() => []),
      ]);
      if (!vivo) return;
      setPedidos(ventas);
      setSolicitudes(solis);
      setCargando(false);
    }

    pedirDatos();
    return () => {
      vivo = false;
    };
  }, []);

  const totalGastado = pedidos
    .filter((p) => p.estado !== "cancelada")
    .reduce((acc, p) => acc + Number(p.total || 0), 0);

  const pedidosActivos = pedidos.filter(
    (p) => p.estado === "pendiente" || p.estado === "pagada" || p.estado === "enviada"
  ).length;

  const solicitudesAbiertas = solicitudes.filter(
    (s) => s.estado === "pendiente" || s.estado === "en_proceso"
  ).length;

  const tarjetas = [
    {
      icono: "recibo",
      etiqueta: "Pedidos realizados",
      valor: pedidos.length,
      detalle: pedidosActivos > 0 ? `${pedidosActivos} en curso` : "Ninguno en curso",
      color: "text-brand-500 bg-brand-500/10",
    },
    {
      icono: "billete",
      etiqueta: "Total comprado",
      valor: formatoPrecio(totalGastado),
      detalle: "Sin contar pedidos cancelados",
      color: "text-emerald-400 bg-emerald-500/12",
    },
    {
      icono: "herramienta",
      etiqueta: "Servicios agendados",
      valor: solicitudes.length,
      detalle:
        solicitudesAbiertas > 0 ? `${solicitudesAbiertas} en atención` : "Ninguno abierto",
      color: "text-amber-400 bg-amber-500/12",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <div key={t.etiqueta} className="rounded-2xl border border-white/10 bg-dark-900 p-5">
            <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${t.color}`}>
              <Icon name={t.icono} className="h-5 w-5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
              {t.etiqueta}
            </p>
            {cargando ? (
              <Skeleton className="mt-1.5 h-7 w-24" />
            ) : (
              <p className="mt-0.5 text-xl font-bold text-white">{t.valor}</p>
            )}
            <p className="mt-0.5 text-xs text-white/40">{t.detalle}</p>
          </div>
        ))}
      </div>

      {/* Últimos pedidos */}
      <section className="rounded-2xl border border-white/10 bg-dark-900">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-bold text-white">Últimos pedidos</h2>
          <Link
            to="/cliente/pedidos"
            className="text-sm font-semibold text-brand-500 transition-colors hover:text-brand-500"
          >
            Ver todos
          </Link>
        </header>

        {cargando ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icono="recibo"
              titulo="Todavía no has comprado"
              descripcion="Cuando hagas tu primer pedido, aparecerá aquí con su estado y su detalle."
              accion="Ver el catálogo"
              accionTo="/productos"
            />
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {pedidos.slice(0, 4).map((pedido) => {
              const estado = ESTADOS_VENTA[pedido.estado] || ESTADOS_VENTA.pendiente;
              return (
                <li key={pedido.id_venta}>
                  <Link
                    to="/cliente/pedidos"
                    className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{pedido.codigo}</p>
                      <p className="text-xs text-white/50">
                        {formatoFecha(pedido.creado_en)} · {pedido.total_articulos}{" "}
                        {pedido.total_articulos === 1 ? "artículo" : "artículos"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-bold text-white">
                        {formatoPrecio(pedido.total)}
                      </span>
                      <Badge clase={estado.clase}>{estado.texto}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Solicitudes recientes */}
      {!cargando && solicitudes.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-dark-900">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-base font-bold text-white">Servicios agendados</h2>
            <Link
              to="/cliente/solicitudes"
              className="text-sm font-semibold text-brand-500 transition-colors hover:text-brand-500"
            >
              Ver todos
            </Link>
          </header>
          <ul className="divide-y divide-white/10">
            {solicitudes.slice(0, 3).map((solicitud) => {
              const estado =
                ESTADOS_SOLICITUD[solicitud.estado] || ESTADOS_SOLICITUD.pendiente;
              return (
                <li
                  key={solicitud.id_solicitud}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {solicitud.nombre_servicio}
                    </p>
                    <p className="text-xs text-white/50">
                      {solicitud.codigo} · {formatoFecha(solicitud.creado_en, { conHora: false })}
                    </p>
                  </div>
                  <Badge clase={estado.clase}>{estado.texto}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Datos de la cuenta */}
      <section className="rounded-2xl border border-white/10 bg-dark-900 p-5">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Mis datos</h2>
          <Link
            to="/cliente/perfil"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 transition-colors hover:text-brand-500"
          >
            <Icon name="editar" className="h-3.5 w-3.5" />
            Editar
          </Link>
        </header>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Nombre completo", valor: `${usuario?.nombre} ${usuario?.apellido}` },
            {
              label: "Documento",
              valor: `${usuario?.tipo_documento} ${usuario?.numero_documento}`,
            },
            { label: "Correo electrónico", valor: usuario?.email },
            { label: "Teléfono", valor: usuario?.telefono },
            { label: "Dirección", valor: usuario?.direccion },
            {
              label: "Estado de la cuenta",
              valor: usuario?.estado === "activo" ? "Activa" : "Inactiva",
            },
          ].map((dato) => (
            <div key={dato.label} className="rounded-xl bg-dark-900 p-4">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-white/40">
                {dato.label}
              </dt>
              <dd className="mt-1 break-words text-sm font-semibold text-white">
                {dato.valor || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ACCESOS.map((acceso) => (
          <Link
            key={acceso.to}
            to={acceso.to}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-dark-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-lg"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white">
              <Icon name={acceso.icono} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{acceso.titulo}</p>
              <p className="text-xs text-white/50">{acceso.texto}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default ClienteResumen;
