import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  AccionFila,
  BarraFiltros,
  PanelHeader,
  SelectorFiltro,
  TablaAdmin,
  Tarjeta,
} from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import { SkeletonFila } from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { useToast } from "../../context/ToastContext";
import { useDebounce } from "../../hooks/useDebounce";
import { solicitudService } from "../../services/solicitudService";
import { ESTADOS_SOLICITUD, formatoFecha, formatoPrecio } from "../../utils/formato";

const POR_PAGINA = 10;

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
];

/** Atención de las solicitudes de servicio técnico enviadas por clientes. */
function AdminSolicitudes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [solicitudes, setSolicitudes] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const busquedaRetrasada = useDebounce(busqueda, 400);
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get("estado") || "");
  const [pagina, setPagina] = useState(1);

  const [atendiendo, setAtendiendo] = useState(null);
  const [estadoNuevo, setEstadoNuevo] = useState("pendiente");
  const [respuesta, setRespuesta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");

  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirSolicitudes() {
      setCargando(true);
      setError("");
      try {
        const data = await solicitudService.listar({
          buscar: busquedaRetrasada,
          estado: filtroEstado,
          pagina,
          limite: POR_PAGINA,
        });
        if (!vivo) return;
        setSolicitudes(data.solicitudes);
        setPaginacion(data.paginacion);
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
  }, [busquedaRetrasada, filtroEstado, pagina, recarga]);

  const [filtrosPrevios, setFiltrosPrevios] = useState("");
  const filtrosActuales = `${busquedaRetrasada}|${filtroEstado}`;
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

  const abrirAtencion = (solicitud) => {
    setAtendiendo(solicitud);
    setEstadoNuevo(solicitud.estado);
    setRespuesta(solicitud.respuesta || "");
    setErrorFormulario("");
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorFormulario("");
    if (respuesta.length > 500) {
      setErrorFormulario("La respuesta no puede superar los 500 caracteres.");
      return;
    }

    setGuardando(true);
    try {
      await solicitudService.actualizar(atendiendo.id_solicitud, {
        estado: estadoNuevo,
        respuesta: respuesta.trim() || null,
      });
      toast.exito(`Solicitud ${atendiendo.codigo} actualizada.`);
      setAtendiendo(null);
      cargar();
    } catch (err) {
      setErrorFormulario(err.message || "No se pudo actualizar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  const columnas = [
    { label: "Solicitud" },
    { label: "Cliente" },
    { label: "Equipo" },
    { label: "Fecha" },
    { label: "Estado" },
    { label: "Acciones", className: "text-right" },
  ];

  return (
    <>
      <PanelHeader
        titulo="Solicitudes de servicio"
        descripcion="Reparaciones y diagnósticos agendados por los clientes."
        icono="documento"
      >
        <Button variant="secondary" size="sm" onClick={cargar} icono="refrescar">
          Actualizar
        </Button>
      </PanelHeader>

      <Tarjeta sinPadding>
        <div className="p-5 pb-0">
          <BarraFiltros
            busqueda={busqueda}
            onBuscar={setBusqueda}
            placeholder="Buscar por código, cliente, correo o servicio..."
          >
            <SelectorFiltro
              value={filtroEstado}
              onChange={cambiarFiltroEstado}
              ariaLabel="Filtrar por estado"
              options={[{ value: "", label: "Todos los estados" }, ...ESTADOS]}
            />
          </BarraFiltros>
        </div>

        {error ? (
          <div className="p-5">
            <Alert tipo="error">{error}</Alert>
          </div>
        ) : (
          <>
            <TablaAdmin columnas={columnas}>
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} columnas={6} />)
              ) : solicitudes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState
                      icono="documento"
                      titulo="No hay solicitudes con estos filtros"
                      descripcion="Cuando un cliente agende un servicio desde la tienda, aparecerá aquí."
                      className="border-0 bg-transparent py-0"
                    />
                  </td>
                </tr>
              ) : (
                solicitudes.map((s) => {
                  const estado = ESTADOS_SOLICITUD[s.estado] || ESTADOS_SOLICITUD.pendiente;
                  return (
                    <tr key={s.id_solicitud} className="transition-colors hover:bg-white/5">
                      <td className="px-4 py-3">
                        <p className="font-bold text-white">{s.codigo}</p>
                        <p className="truncate text-xs text-white/50">{s.nombre_servicio}</p>
                        <p className="text-xs font-semibold text-brand-500">
                          {formatoPrecio(s.precio_servicio)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate font-semibold text-white/80">
                          {s.cliente_nombre}
                        </p>
                        <p className="truncate text-xs text-white/50">{s.cliente_telefono}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate text-white/60">{s.equipo || "—"}</p>
                        <p className="lineas-2 max-w-xs text-xs text-white/40">
                          {s.descripcion}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-white/50">
                        {formatoFecha(s.creado_en)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge clase={estado.clase}>{estado.texto}</Badge>
                        {s.respuesta && (
                          <p className="mt-1 text-[11px] text-emerald-400">Con respuesta</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <AccionFila
                            icono="chat"
                            etiqueta="Atender solicitud"
                            tono="marca"
                            onClick={() => abrirAtencion(s)}
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
                etiqueta="solicitudes"
              />
            </div>
          </>
        )}
      </Tarjeta>

      <Modal
        isOpen={!!atendiendo}
        onClose={() => setAtendiendo(null)}
        title={`Solicitud ${atendiendo?.codigo || ""}`}
        descripcion={atendiendo ? formatoFecha(atendiendo.creado_en) : undefined}
        size="lg"
      >
        {atendiendo && (
          <form onSubmit={guardar} className="space-y-5" noValidate>
            {errorFormulario && <Alert tipo="error">{errorFormulario}</Alert>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-dark-900 p-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                  Cliente
                </p>
                <p className="text-sm font-semibold text-white">
                  {atendiendo.cliente_nombre}
                </p>
                <p className="break-all text-xs text-white/50">{atendiendo.cliente_email}</p>
                <p className="text-xs text-white/50">{atendiendo.cliente_telefono}</p>
              </div>
              <div className="rounded-xl bg-dark-900 p-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                  Servicio
                </p>
                <p className="text-sm font-semibold text-white">
                  {atendiendo.nombre_servicio}
                </p>
                <p className="text-xs text-white/50">
                  Valor base: {formatoPrecio(atendiendo.precio_servicio)}
                </p>
                <p className="text-xs text-white/50">
                  Equipo: {atendiendo.equipo || "No especificado"}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                Falla reportada por el cliente
              </p>
              <p className="rounded-xl border border-white/10 p-4 text-sm leading-relaxed text-white/80">
                {atendiendo.descripcion}
              </p>
            </div>

            <Select
              label="Estado de la solicitud"
              name="estado"
              value={estadoNuevo}
              onChange={(e) => setEstadoNuevo(e.target.value)}
              options={ESTADOS}
              placeholder={null}
            />

            <Textarea
              label="Respuesta para el cliente"
              name="respuesta"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Ej: Recibimos tu equipo. El diagnóstico estará listo mañana antes de las 3 p. m."
              hint="El cliente ve este mensaje en la sección Mis solicitudes de su cuenta."
            />

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setAtendiendo(null)}>
                Cancelar
              </Button>
              <Button type="submit" cargando={guardando} icono="check">
                Guardar atención
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export default AdminSolicitudes;
