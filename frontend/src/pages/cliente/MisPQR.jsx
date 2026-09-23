import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { Skeleton } from "../../components/ui/Skeleton";
import { pqrService } from "../../services/pqrService";
import { formatoFecha } from "../../utils/formato";

const ESTADOS = {
  pendiente: { texto: "Pendiente", clase: "bg-amber-500/15 text-amber-400" },
  en_proceso: { texto: "En proceso", clase: "bg-sky-500/15 text-sky-400" },
  respondida: { texto: "Respondida", clase: "bg-emerald-500/15 text-emerald-400" },
  cerrada: { texto: "Cerrada", clase: "bg-white/10 text-white/45" },
};

const COLOR_TIPO = {
  peticion: "text-sky-400",
  queja: "text-amber-400",
  reclamo: "text-brand-500",
  sugerencia: "text-emerald-400",
};

/** Peticiones, quejas y reclamos radicados por el cliente. */
function MisPQR() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    let vivo = true;

    async function pedirPQR() {
      try {
        const lista = await pqrService.misPQR();
        if (vivo) setSolicitudes(lista);
      } catch (fallo) {
        if (vivo) setError(fallo.message || "No se pudieron cargar tus solicitudes.");
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirPQR();
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Mis PQR</h1>
          <p className="text-sm text-white/50">
            Tus peticiones, quejas y reclamos, con el estado de cada una.
          </p>
        </div>
        <Button to="/pqr" size="sm" icono="mas">
          Radicar una nueva
        </Button>
      </div>

      {error && <Alert tipo="error">{error}</Alert>}

      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : solicitudes.length === 0 ? (
        <EmptyState
          icono="chat"
          titulo="No has radicado ninguna solicitud"
          descripcion="Si algo no salió como esperabas, cuéntanos y le hacemos seguimiento."
        >
          <Button to="/pqr" icono="sobre">
            Radicar una PQR
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {solicitudes.map((p) => {
            const estado = ESTADOS[p.estado] || ESTADOS.pendiente;
            const expandida = abierta === p.id_pqr;

            return (
              <li key={p.id_pqr} className="border border-white/10 bg-dark-900">
                <button
                  type="button"
                  onClick={() => setAbierta(expandida ? null : p.id_pqr)}
                  aria-expanded={expandida}
                  className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-white">
                        {p.radicado}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          COLOR_TIPO[p.tipo] || "text-white/45"
                        }`}
                      >
                        {p.tipo}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${estado.clase}`}
                      >
                        {estado.texto}
                      </span>
                    </div>

                    <p className="truncate text-sm font-medium text-white">{p.asunto}</p>
                    <p className="mt-0.5 text-xs text-white/40">
                      Radicada el {formatoFecha(p.creado_en)}
                    </p>
                  </div>

                  <Icon
                    name="chevronAbajo"
                    className={`mt-1 h-4 w-4 shrink-0 text-white/40 transition-transform ${
                      expandida ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandida && (
                  <div className="space-y-4 border-t border-white/10 p-5 animate-[fadeIn_.2s_ease-out]">
                    <div>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/35">
                        Lo que contaste
                      </p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-white/65">
                        {p.descripcion}
                      </p>
                    </div>

                    {p.respuesta ? (
                      <div className="border-l-2 border-brand-500 bg-white/[0.03] p-4">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                          Nuestra respuesta
                        </p>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
                          {p.respuesta}
                        </p>
                        <p className="mt-2 text-[11px] text-white/35">
                          {p.responsable ? `${p.responsable} · ` : ""}
                          {formatoFecha(p.respondida_en)}
                        </p>
                      </div>
                    ) : (
                      <Alert tipo="info">
                        Estamos revisando tu caso. Te avisaremos al correo apenas
                        tengamos una respuesta.
                      </Alert>
                    )}

                    {p.codigo_venta && (
                      <p className="text-xs text-white/40">
                        Relacionada con el pedido{" "}
                        <Link
                          to="/cliente/pedidos"
                          className="text-brand-500 hover:underline"
                        >
                          {p.codigo_venta}
                        </Link>
                      </p>
                    )}
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

export default MisPQR;
