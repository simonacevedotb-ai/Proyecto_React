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
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import { SkeletonFila } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDebounce } from "../../hooks/useDebounce";
import { contactoService } from "../../services/contactoService";
import { ESTADOS_MENSAJE, formatoFecha } from "../../utils/formato";

const POR_PAGINA = 10;

const ESTADOS = [
  { value: "nuevo", label: "Nuevos" },
  { value: "leido", label: "Leídos" },
  { value: "respondido", label: "Respondidos" },
];

/** Bandeja de los mensajes enviados desde el formulario de contacto. */
function AdminMensajes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { esAdmin } = useAuth();
  const toast = useToast();

  const [mensajes, setMensajes] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [nuevos, setNuevos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const busquedaRetrasada = useDebounce(busqueda, 400);
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get("estado") || "");
  const [pagina, setPagina] = useState(1);

  const [abierto, setAbierto] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirMensajes() {
      setCargando(true);
      setError("");
      try {
        const data = await contactoService.listar({
          buscar: busquedaRetrasada,
          estado: filtroEstado,
          pagina,
          limite: POR_PAGINA,
        });
        if (!vivo) return;
        setMensajes(data.mensajes);
        setPaginacion(data.paginacion);
        setNuevos(data.nuevos);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirMensajes();
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
    const nuevosParams = new URLSearchParams(searchParams);
    if (valor) nuevosParams.set("estado", valor);
    else nuevosParams.delete("estado");
    setSearchParams(nuevosParams, { replace: true });
  };

  const abrirMensaje = async (mensaje) => {
    setAbierto(mensaje);
    // Al abrirlo se marca como leído automáticamente
    if (mensaje.estado === "nuevo") {
      try {
        await contactoService.cambiarEstado(mensaje.id_mensaje, "leido");
        cargar();
      } catch {
        /* si falla, el mensaje sigue visible igual */
      }
    }
  };

  const marcarEstado = async (mensaje, estado) => {
    try {
      await contactoService.cambiarEstado(mensaje.id_mensaje, estado);
      toast.exito(`Mensaje marcado como ${ESTADOS_MENSAJE[estado].texto.toLowerCase()}.`);
      setAbierto(null);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmarEliminar = async () => {
    if (!confirmacion) return;
    setProcesando(true);
    try {
      await contactoService.eliminar(confirmacion.id_mensaje);
      toast.exito("Mensaje eliminado.");
      setConfirmacion(null);
      setAbierto(null);
      cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const columnas = [
    { label: "Remitente" },
    { label: "Asunto" },
    { label: "Fecha" },
    { label: "Estado" },
    { label: "Acciones", className: "text-right" },
  ];

  return (
    <>
      <PanelHeader
        titulo="Mensajes de contacto"
        descripcion="Consultas enviadas desde el formulario público de la tienda."
        icono="sobre"
      >
        <Button variant="secondary" size="sm" onClick={cargar} icono="refrescar">
          Actualizar
        </Button>
      </PanelHeader>

      {nuevos > 0 && (
        <Alert tipo="info" className="mb-5">
          Tienes <strong>{nuevos}</strong> mensaje(s) sin leer. Se marcan como leídos al
          abrirlos.
        </Alert>
      )}

      <Tarjeta sinPadding>
        <div className="p-5 pb-0">
          <BarraFiltros
            busqueda={busqueda}
            onBuscar={setBusqueda}
            placeholder="Buscar por nombre, correo o asunto..."
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
                Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} columnas={5} />)
              ) : mensajes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptyState
                      icono="sobre"
                      titulo="No hay mensajes con estos filtros"
                      descripcion="Los mensajes del formulario de contacto de la tienda llegan aquí."
                      className="border-0 bg-transparent py-0"
                    />
                  </td>
                </tr>
              ) : (
                mensajes.map((m) => {
                  const estado = ESTADOS_MENSAJE[m.estado] || ESTADOS_MENSAJE.nuevo;
                  return (
                    <tr
                      key={m.id_mensaje}
                      className={`cursor-pointer transition-colors hover:bg-white/5 ${
                        m.estado === "nuevo" ? "bg-brand-50/40" : ""
                      }`}
                      onClick={() => abrirMensaje(m)}
                    >
                      <td className="px-4 py-3">
                        <p
                          className={`truncate ${
                            m.estado === "nuevo"
                              ? "font-bold text-white"
                              : "font-semibold text-white/80"
                          }`}
                        >
                          {m.nombre}
                        </p>
                        <p className="truncate text-xs text-white/50">{m.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate font-medium text-white/80">{m.asunto}</p>
                        <p className="lineas-2 max-w-md text-xs text-white/40">{m.mensaje}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-white/50">
                        {formatoFecha(m.creado_en)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge clase={estado.clase}>{estado.texto}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-0.5">
                          <AccionFila
                            icono="ojo"
                            etiqueta="Leer mensaje"
                            tono="marca"
                            onClick={() => abrirMensaje(m)}
                          />
                          {esAdmin && (
                            <AccionFila
                              icono="eliminar"
                              etiqueta="Eliminar mensaje"
                              tono="error"
                              onClick={() => setConfirmacion(m)}
                            />
                          )}
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
                etiqueta="mensajes"
              />
            </div>
          </>
        )}
      </Tarjeta>

      <Modal
        isOpen={!!abierto}
        onClose={() => setAbierto(null)}
        title={abierto?.asunto || ""}
        descripcion={abierto ? formatoFecha(abierto.creado_en) : undefined}
        size="lg"
      >
        {abierto && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-dark-900 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white">
                {abierto.nombre.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{abierto.nombre}</p>
                <p className="break-all text-xs text-white/50">{abierto.email}</p>
                {abierto.telefono && (
                  <p className="text-xs text-white/50">Tel. {abierto.telefono}</p>
                )}
              </div>
              <Badge clase={(ESTADOS_MENSAJE[abierto.estado] || ESTADOS_MENSAJE.nuevo).clase}>
                {(ESTADOS_MENSAJE[abierto.estado] || ESTADOS_MENSAJE.nuevo).texto}
              </Badge>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                Mensaje
              </p>
              <p className="whitespace-pre-line rounded-xl border border-white/10 p-4 text-sm leading-relaxed text-white/80">
                {abierto.mensaje}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                href={`mailto:${abierto.email}?subject=${encodeURIComponent(
                  `Re: ${abierto.asunto}`
                )}`}
                icono="sobre"
              >
                Responder por correo
              </Button>
              {abierto.telefono && (
                <Button
                  size="sm"
                  variant="secondary"
                  href={`https://wa.me/57${abierto.telefono}`}
                  icono="chat"
                >
                  Escribir por WhatsApp
                </Button>
              )}
              {abierto.estado !== "respondido" && (
                <Button
                  size="sm"
                  variant="secondary"
                  icono="check"
                  onClick={() => marcarEstado(abierto, "respondido")}
                >
                  Marcar como respondido
                </Button>
              )}
              {esAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  icono="eliminar"
                  className="text-rose-400 hover:bg-rose-500/12"
                  onClick={() => setConfirmacion(abierto)}
                >
                  Eliminar
                </Button>
              )}
            </div>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-white/40">
              <Icon name="candado" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              El contenido se guarda limpio de etiquetas HTML, así que un mensaje no puede
              inyectar código en este panel.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmacion}
        onClose={() => setConfirmacion(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar mensaje"
        mensaje={`¿Eliminar el mensaje de ${confirmacion?.nombre}?`}
        detalle="Esta acción no se puede deshacer."
        textoConfirmar="Eliminar"
        peligroso
        cargando={procesando}
      />
    </>
  );
}

export default AdminMensajes;
