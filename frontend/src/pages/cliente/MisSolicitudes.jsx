import { useEffect, useState } from "react";

import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { Skeleton } from "../../components/ui/Skeleton";
import { solicitudService } from "../../services/solicitudService";
import { ESTADOS_SOLICITUD, formatoFecha, formatoPrecio } from "../../utils/formato";

/** Solicitudes de servicio técnico del cliente y su seguimiento. */
function MisSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;

    async function pedirSolicitudes() {
      try {
        const lista = await solicitudService.misSolicitudes();
        if (vivo) setSolicitudes(lista);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirSolicitudes();
    return () => {
      vivo = false;
    };
  }, []);

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icono="error"
        titulo="No se pudieron cargar tus solicitudes"
        descripcion={error}
        accion="Reintentar"
        onAccion={() => window.location.reload()}
      />
    );
  }

  if (solicitudes.length === 0) {
    return (
      <EmptyState
        icono="herramienta"
        titulo="No tienes servicios agendados"
        descripcion="Cuando agendes una reparación o un diagnóstico, aquí podrás seguir su estado."
        accion="Ver servicios disponibles"
        accionTo="/servicios"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Mis solicitudes
          </h1>
          <p className="text-sm text-white/50">
            {solicitudes.length}{" "}
            {solicitudes.length === 1 ? "servicio agendado" : "servicios agendados"}
          </p>
        </div>
        <Button to="/servicios" size="sm" icono="mas">
          Agendar otro servicio
        </Button>
      </div>

      <ul className="space-y-4">
        {solicitudes.map((solicitud) => {
          const estado = ESTADOS_SOLICITUD[solicitud.estado] || ESTADOS_SOLICITUD.pendiente;
          return (
            <li
              key={solicitud.id_solicitud}
              className="overflow-hidden rounded-2xl border border-white/10 bg-dark-900"
            >
              <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      {solicitud.nombre_servicio}
                    </h2>
                    <Badge clase={estado.clase}>{estado.texto}</Badge>
                  </div>
                  <p className="text-xs text-white/50">
                    Código {solicitud.codigo} · Agendado el{" "}
                    {formatoFecha(solicitud.creado_en)}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold text-white">
                  {formatoPrecio(solicitud.precio_servicio)}
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-white/40">
                    Equipo
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-white">
                    {solicitud.equipo || "No especificado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-white/40">
                    Contacto registrado
                  </dt>
                  <dd className="mt-0.5 text-sm text-white/80">
                    {solicitud.cliente_telefono}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-white/40">
                    Falla reportada
                  </dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-white/60">
                    {solicitud.descripcion}
                  </dd>
                </div>
              </dl>

              {solicitud.respuesta && (
                <div className="border-t border-white/10 bg-brand-50/50 p-5">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-500">
                    <Icon name="chat" className="h-3.5 w-3.5" />
                    Respuesta del equipo técnico
                  </p>
                  <p className="text-sm leading-relaxed text-white/80">
                    {solicitud.respuesta}
                  </p>
                  <p className="mt-2 text-[11px] text-white/40">
                    Última actualización: {formatoFecha(solicitud.actualizado_en)}
                  </p>
                </div>
              )}

              {solicitud.estado === "pendiente" && !solicitud.respuesta && (
                <p className="border-t border-white/10 bg-amber-50/60 px-5 py-3 text-xs text-amber-400">
                  Estamos revisando tu solicitud. Te contactaremos al teléfono registrado
                  para confirmar la cita.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default MisSolicitudes;
