import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AgendarServicioModal from "../components/tienda/AgendarServicioModal";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import { ICONOS_SERVICIO } from "../utils/iconos";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useReveal } from "../hooks/useReveal";
import { servicioService } from "../services/servicioService";
import { formatoPrecio } from "../utils/formato";

const PASOS = [
  {
    icono: "documento",
    titulo: "1. Agenda en línea",
    texto: "Eliges el servicio, cuentas qué le pasa a tu equipo y envías la solicitud.",
  },
  {
    icono: "llamada",
    titulo: "2. Te contactamos",
    texto: "Un técnico te llama para confirmar la cita y darte un estimado del tiempo.",
  },
  {
    icono: "herramienta",
    titulo: "3. Reparamos",
    texto: "Trabajamos con repuestos certificados y te avisamos de cualquier hallazgo.",
  },
  {
    icono: "checkCirculo",
    titulo: "4. Entregamos",
    texto: "Recibes tu equipo probado, con garantía escrita sobre la reparación.",
  },
];

/**
 * Página de servicios técnicos.
 *
 * Cada tarjeta permite agendar el servicio de verdad: la solicitud se
 * guarda en la base de datos con un código de seguimiento y el cliente
 * la ve luego en "Mis solicitudes".
 */
function Servicios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  useEffect(() => {
    let vivo = true;

    async function pedirServicios() {
      try {
        const lista = await servicioService.listar();
        if (vivo) setServicios(lista);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirServicios();
    return () => {
      vivo = false;
    };
  }, []);

  // Permite abrir el modal directamente con /servicios?servicio=3.
  // Se calcula durante el render (no en un efecto): el servicio a mostrar
  // es simplemente el que dice la URL, o el que el usuario pulsó.
  const idEnUrl = searchParams.get("servicio");
  const servicioDeUrl = idEnUrl
    ? servicios.find((s) => String(s.id_servicio) === String(idEnUrl))
    : null;
  const servicioAbierto = servicioSeleccionado || servicioDeUrl || null;

  useReveal([servicios]);

  const abrirAgendamiento = (servicio) => {
    if (!isAuthenticated) {
      toast.info("Inicia sesión para agendar tu servicio y hacerle seguimiento.");
      navigate("/login", { state: { from: `/servicios?servicio=${servicio.id_servicio}` } });
      return;
    }
    setServicioSeleccionado(servicio);
  };

  const cerrarAgendamiento = () => {
    setServicioSeleccionado(null);
    if (searchParams.get("servicio")) {
      const nuevos = new URLSearchParams(searchParams);
      nuevos.delete("servicio");
      setSearchParams(nuevos, { replace: true });
    }
  };

  return (
    <div className="bg-dark-900 pb-16">
      {/* Encabezado */}
      <section className="relative overflow-hidden bg-dark-900 py-16 text-white sm:py-20">
        <div className="malla-hero pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto w-[94%] max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-300">
            <Icon name="herramienta" className="h-3.5 w-3.5" />
            Servicio técnico especializado
          </span>
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Reparamos tu equipo <span className="text-brand-400">como debe ser</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/30">
            Taller propio, repuestos certificados y garantía por escrito. Agenda en
            línea y sigue el estado de tu orden desde tu cuenta.
          </p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-b border-white/10 bg-dark-900 py-12">
        <div className="mx-auto w-[94%] max-w-7xl">
          <h2 className="reveal mb-8 text-center text-xl font-bold tracking-tight text-white sm:text-2xl">
            ¿Cómo funciona?
          </h2>
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className={`reveal reveal-d${i + 1} relative text-center`}>
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
                  <Icon name={paso.icono} className="h-6 w-6" />
                </span>
                <h3 className="mb-1.5 text-sm font-bold text-white">{paso.titulo}</h3>
                <p className="text-xs leading-relaxed text-white/50">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Listado de servicios */}
      <section className="py-12 sm:py-14">
        <div className="mx-auto w-[94%] max-w-7xl">
          <header className="reveal mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Nuestros <span className="text-brand-500">servicios</span>
            </h2>
            <p className="mt-1.5 text-sm text-white/50 sm:text-base">
              Precios claros y tiempos reales. Sin sorpresas al momento de entregar.
            </p>
          </header>

          {error ? (
            <EmptyState
              icono="error"
              titulo="No se pudieron cargar los servicios"
              descripcion={error}
              accion="Reintentar"
              onAccion={() => window.location.reload()}
            />
          ) : cargando ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          ) : servicios.length === 0 ? (
            <EmptyState
              icono="herramienta"
              titulo="Aún no hay servicios publicados"
              descripcion="El administrador puede crearlos desde el panel de gestión de servicios."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {servicios.map((servicio, i) => (
                <article
                  key={servicio.id_servicio}
                  className={`reveal reveal-d${Math.min((i % 3) + 1, 5)} tarjeta tarjeta-hover group flex flex-col p-6`}
                >
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white">
                    <Icon
                      name={ICONOS_SERVICIO[servicio.icono] || "herramienta"}
                      className="h-6 w-6"
                    />
                  </span>

                  <h3 className="mb-2 text-lg font-bold text-white">{servicio.nombre}</h3>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-white/50">
                    {servicio.descripcion || "Servicio realizado por nuestros técnicos certificados."}
                  </p>

                  <div className="mb-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                        Desde
                      </p>
                      <p className="text-xl font-bold text-white">
                        {formatoPrecio(servicio.precio)}
                      </p>
                    </div>
                    {servicio.duracion && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-dark-900 px-2.5 py-1.5 text-xs font-medium text-white/60">
                        <Icon name="reloj" className="h-3.5 w-3.5 text-brand-500" />
                        {servicio.duracion}
                      </span>
                    )}
                  </div>

                  <Button fullWidth icono="documento" onClick={() => abrirAgendamiento(servicio)}>
                    Agendar este servicio
                  </Button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Llamada a la acción */}
      <section className="mx-auto w-[94%] max-w-7xl">
        <div className="reveal rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-center text-white shadow-xl sm:p-12">
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
            ¿No sabes qué le pasa a tu equipo?
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-sm text-brand-50 sm:text-base">
            Agenda un diagnóstico técnico. Revisamos módulo por módulo y te entregamos un
            informe escrito con el costo exacto antes de tocar nada.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/contacto"
              className="inline-flex items-center gap-2 rounded-xl bg-dark-900 px-6 py-3 text-sm font-bold text-brand-500 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Icon name="chat" className="h-4 w-4" />
              Escríbenos tu caso
            </Link>
            <a
              href="https://wa.me/573147728502?text=Hola%2C%20necesito%20asesor%C3%ADa%20con%20el%20servicio%20t%C3%A9cnico%20de%20PhoneStore."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
            >
              <Icon name="llamada" className="h-4 w-4" />
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <AgendarServicioModal
        servicio={servicioAbierto}
        isOpen={!!servicioAbierto}
        onClose={cerrarAgendamiento}
      />
    </div>
  );
}

export default Servicios;
