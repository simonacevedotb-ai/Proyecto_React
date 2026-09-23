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
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import { SkeletonFila } from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { useToast } from "../../context/ToastContext";
import { useDebounce } from "../../hooks/useDebounce";
import { pqrService } from "../../services/pqrService";
import { formatoFecha } from "../../utils/formato";

const POR_PAGINA = 10;

const TIPOS = [
  { value: "peticion", label: "Peticiones" },
  { value: "queja", label: "Quejas" },
  { value: "reclamo", label: "Reclamos" },
  { value: "sugerencia", label: "Sugerencias" },
];

const ESTADOS = [
  { value: "pendiente", label: "Pendientes" },
  { value: "en_proceso", label: "En proceso" },
  { value: "respondida", label: "Respondidas" },
  { value: "cerrada", label: "Cerradas" },
];

const COLOR_ESTADO = {
  pendiente: "bg-amber-500/15 text-amber-400",
  en_proceso: "bg-sky-500/15 text-sky-400",
  respondida: "bg-emerald-500/15 text-emerald-400",
  cerrada: "bg-white/10 text-white/45",
};

const COLOR_TIPO = {
  peticion: "text-sky-400",
  queja: "text-amber-400",
  reclamo: "text-brand-500",
  sugerencia: "text-emerald-400",
};

/** Bandeja de peticiones, quejas y reclamos. */
function AdminPQR() {
  const toast = useToast();

  const [solicitudes, setSolicitudes] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [resumen, setResumen] = useState({
    pendiente: 0,
    en_proceso: 0,
    respondida: 0,
    cerrada: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const busquedaDiferida = useDebounce(busqueda, 400);

  const [abierta, setAbierta] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [cerrarAlResponder, setCerrarAlResponder] = useState(false);
  const [respondiendo, setRespondiendo] = useState(false);

  const [filtroAnterior, setFiltroAnterior] = useState("");
  const filtroActual = `${busquedaDiferida}|${tipo}|${estado}`;
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
        const datos = await pqrService.listar({
          buscar: busquedaDiferida || undefined,
          tipo: tipo || undefined,
          estado: estado || undefined,
          pagina,
          limite: POR_PAGINA,
        });
        if (!vivo) return;
        setSolicitudes(datos.pqr);
        setPaginacion(datos.paginacion);
        setResumen(datos.resumen);
      } catch (fallo) {
        if (vivo) setError(fallo.message || "No se pudieron cargar las solicitudes.");
      } finally {
        if (vivo) setCargando(false);
      }
    }

    cargar();
    return () => {
      vivo = false;
    };
  }, [busquedaDiferida, tipo, estado, pagina, recarga]);

  const refrescar = useCallback(() => setRecarga((n) => n + 1), []);

  const abrir = (solicitud) => {
    setAbierta(solicitud);
    setRespuesta(solicitud.respuesta || "");
    setCerrarAlResponder(false);
  };

  const cambiarEstado = async (solicitud, nuevo) => {
    try {
      const datos = await pqrService.cambiarEstado(solicitud.id_pqr, nuevo);
      toast.exito(datos.message);
      refrescar();
      if (abierta?.id_pqr === solicitud.id_pqr) setAbierta(datos.pqr);
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo cambiar el estado.");
    }
  };

  const responder = async () => {
    if (respuesta.trim().length < 5) {
      toast.alerta("Escribe una respuesta un poco más completa.");
      return;
    }

    setRespondiendo(true);
    try {
      const datos = await pqrService.responder(abierta.id_pqr, {
        respuesta: respuesta.trim(),
        estado: cerrarAlResponder ? "cerrada" : "respondida",
      });
      toast.exito(datos.message);
      setAbierta(null);
      refrescar();
    } catch (fallo) {
      toast.error(fallo.message || "No se pudo enviar la respuesta.");
    } finally {
      setRespondiendo(false);
    }
  };

  return (
    <div className="space-y-6">
      <PanelHeader
        titulo="PQR"
        descripcion="Peticiones, quejas, reclamos y sugerencias de los clientes."
        icono="chat"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          etiqueta="Pendientes"
          valor={resumen.pendiente}
          detalle="Sin abrir todavía"
          icono="alerta"
          tono="alerta"
          alerta={resumen.pendiente > 0}
          cargando={cargando}
        />
        <StatCard
          etiqueta="En proceso"
          valor={resumen.en_proceso}
          detalle="Se están revisando"
          icono="refrescar"
          tono="marca"
          cargando={cargando}
        />
        <StatCard
          etiqueta="Respondidas"
          valor={resumen.respondida}
          detalle="Ya tienen respuesta"
          icono="checkCirculo"
          tono="exito"
          cargando={cargando}
        />
        <StatCard
          etiqueta="Cerradas"
          valor={resumen.cerrada}
          detalle="Caso terminado"
          icono="check"
          tono="neutro"
          cargando={cargando}
        />
      </div>

      <Tarjeta sinPadding>
        <BarraFiltros
          busqueda={busqueda}
          onBuscar={setBusqueda}
          placeholder="Buscar por radicado, asunto, cliente o correo..."
        >
          <SelectorFiltro
            value={tipo}
            onChange={setTipo}
            options={[{ value: "", label: "Todos los tipos" }, ...TIPOS]}
            ariaLabel="Filtrar por tipo"
          />
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

        <TablaAdmin
          columnas={[
            { label: "Radicado" },
            { label: "Tipo" },
            { label: "Asunto" },
            { label: "Cliente" },
            { label: "Fecha" },
            { label: "Estado" },
            { label: "Acciones" },
          ]}
        >
          {cargando ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} columnas={7} />)
          ) : solicitudes.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10">
                <EmptyState
                  icono="chat"
                  titulo="No hay solicitudes con estos filtros"
                  descripcion="Cuando un cliente radique una PQR, aparecerá aquí."
                />
              </td>
            </tr>
          ) : (
            solicitudes.map((p) => (
              <tr key={p.id_pqr} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <span className="whitespace-nowrap font-mono text-xs font-bold text-white">
                    {p.radicado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      COLOR_TIPO[p.tipo] || "text-white/50"
                    }`}
                  >
                    {p.tipo}
                  </span>
                </td>
                <td className="max-w-xs px-4 py-3">
                  <p className="truncate text-sm text-white">{p.asunto}</p>
                  {p.codigo_venta && (
                    <p className="text-[11px] text-white/35">Pedido {p.codigo_venta}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white/75">{p.cliente_nombre}</p>
                  <p className="truncate text-[11px] text-white/35">{p.cliente_email}</p>
                </td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {formatoFecha(p.creado_en)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      COLOR_ESTADO[p.estado] || COLOR_ESTADO.pendiente
                    }`}
                  >
                    {p.estado.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <AccionFila
                      icono="ojo"
                      etiqueta="Ver y responder"
                      onClick={() => abrir(p)}
                    />
                    {p.estado === "pendiente" && (
                      <AccionFila
                        icono="refrescar"
                        etiqueta="Marcar en proceso"
                        onClick={() => cambiarEstado(p, "en_proceso")}
                      />
                    )}
                    {p.estado !== "cerrada" && (
                      <AccionFila
                        icono="check"
                        etiqueta="Cerrar caso"
                        tono="exito"
                        onClick={() => cambiarEstado(p, "cerrada")}
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
          etiqueta="solicitudes"
        />
      </Tarjeta>

      {/* ---------- Detalle y respuesta ---------- */}
      <Modal
        isOpen={!!abierta}
        onClose={() => setAbierta(null)}
        title={abierta ? abierta.radicado : ""}
        descripcion={abierta ? abierta.asunto : ""}
        size="lg"
      >
        {abierta && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  COLOR_TIPO[abierta.tipo]
                }`}
              >
                {abierta.tipo}
              </span>
              <span className="h-3 w-px bg-white/20" aria-hidden="true" />
              <span
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  COLOR_ESTADO[abierta.estado]
                }`}
              >
                {abierta.estado.replace("_", " ")}
              </span>
              <span className="ml-auto text-xs text-white/40">
                {formatoFecha(abierta.creado_en)}
              </span>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                Lo que nos cuenta el cliente
              </p>
              <p className="whitespace-pre-line border-l-2 border-white/15 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/70">
                {abierta.descripcion}
              </p>
            </div>

            <dl className="grid gap-3 border-y border-white/10 py-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-white/35">
                  Cliente
                </dt>
                <dd className="text-white">{abierta.cliente_nombre}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-white/35">
                  Correo
                </dt>
                <dd className="break-all text-white/70">{abierta.cliente_email}</dd>
              </div>
              {abierta.cliente_telefono && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-white/35">
                    Teléfono
                  </dt>
                  <dd className="text-white/70">{abierta.cliente_telefono}</dd>
                </div>
              )}
              {abierta.codigo_venta && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-white/35">
                    Pedido relacionado
                  </dt>
                  <dd className="text-white/70">{abierta.codigo_venta}</dd>
                </div>
              )}
            </dl>

            {abierta.estado === "cerrada" ? (
              <Alert tipo="info">
                Este caso está cerrado. Si el cliente necesita algo más, debe radicar
                una solicitud nueva.
              </Alert>
            ) : (
              <div className="space-y-3">
                <Textarea
                  label="Respuesta al cliente"
                  name="respuesta"
                  rows={5}
                  maxLength={1000}
                  hint="Se envía por correo a la dirección que registró."
                  placeholder="Escribe la respuesta..."
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                />

                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/60">
                  <input
                    type="checkbox"
                    checked={cerrarAlResponder}
                    onChange={(e) => setCerrarAlResponder(e.target.checked)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  Cerrar el caso al enviar la respuesta
                </label>

                <Button
                  fullWidth
                  size="lg"
                  cargando={respondiendo}
                  onClick={responder}
                  icono="sobre"
                >
                  Enviar respuesta
                </Button>
              </div>
            )}

            {abierta.respuesta && abierta.estado === "cerrada" && (
              <div className="border-l-2 border-brand-500 bg-white/[0.03] p-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                  Respuesta enviada
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
                  {abierta.respuesta}
                </p>
                {abierta.responsable && (
                  <p className="mt-2 text-[11px] text-white/35">
                    Por {abierta.responsable} · {formatoFecha(abierta.respondida_en)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminPQR;
