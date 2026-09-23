import { useState } from "react";
import { Link } from "react-router-dom";

import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useForm } from "../hooks/useForm";
import { pqrService } from "../services/pqrService";
import { formatoFecha } from "../utils/formato";
import {
  maxLength,
  minLength,
  required,
  validateEmail,
  validateNombre,
} from "../utils/validations";

/**
 * Peticiones, quejas, reclamos y sugerencias.
 *
 * La pantalla hace dos cosas: radicar un caso nuevo y consultar uno ya
 * radicado. Ninguna de las dos exige iniciar sesión, porque quien tiene
 * un problema no siempre tiene cuenta. Al radicar se entrega un número
 * con el que después se consulta el estado.
 */
const TIPOS = [
  { value: "peticion", label: "Petición" },
  { value: "queja", label: "Queja" },
  { value: "reclamo", label: "Reclamo" },
  { value: "sugerencia", label: "Sugerencia" },
];

const ESTADOS = {
  pendiente: { texto: "Pendiente", clase: "bg-amber-500/15 text-amber-400" },
  en_proceso: { texto: "En proceso", clase: "bg-sky-500/15 text-sky-400" },
  respondida: { texto: "Respondida", clase: "bg-emerald-500/15 text-emerald-400" },
  cerrada: { texto: "Cerrada", clase: "bg-white/10 text-white/50" },
};

const QUE_ES = [
  {
    titulo: "Petición",
    texto: "Pides información o solicitas algo concreto sobre un producto o servicio.",
  },
  {
    titulo: "Queja",
    texto: "Manifiestas tu inconformidad con la atención o con la forma en que se hizo algo.",
  },
  {
    titulo: "Reclamo",
    texto: "Exiges una solución: un producto llegó mal, incompleto o no llegó.",
  },
  {
    titulo: "Sugerencia",
    texto: "Propones una mejora para la tienda o el servicio.",
  },
];

function PQR() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [radicada, setRadicada] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");

  const [radicado, setRadicado] = useState("");
  const [consulta, setConsulta] = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState("");

  const formulario = useForm(
    {
      tipo: "",
      asunto: "",
      descripcion: "",
      nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : "",
      email: usuario?.email || "",
      telefono: usuario?.telefono || "",
    },
    {
      tipo: required,
      asunto: (valor) => required(valor) || minLength(5)(valor) || maxLength(120)(valor),
      descripcion: (valor) =>
        required(valor) || minLength(15)(valor) || maxLength(1000)(valor),
      nombre: validateNombre,
      email: validateEmail,
    }
  );

  const handleRadicar = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!formulario.validateAll()) return;

    setEnviando(true);
    try {
      const datos = await pqrService.radicar(formulario.values);
      setRadicada(datos.pqr);
      formulario.reset();
      toast.exito(`Solicitud radicada: ${datos.pqr.radicado}`);
    } catch (error) {
      setErrorServidor(
        error.status === 429
          ? "Radicaste varias solicitudes seguidas. Espera unos minutos."
          : error.message || "No se pudo radicar la solicitud."
      );
    } finally {
      setEnviando(false);
    }
  };

  const handleConsultar = async (e) => {
    e.preventDefault();
    setErrorConsulta("");
    setConsulta(null);

    const numero = radicado.trim();
    if (!numero) {
      setErrorConsulta("Escribe el número de radicado.");
      return;
    }

    setConsultando(true);
    try {
      setConsulta(await pqrService.consultar(numero));
    } catch (error) {
      setErrorConsulta(error.message || "No encontramos esa solicitud.");
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-var(--altura-header))] bg-black">
      <div
        className="malla-tecnica pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-[94%] max-w-6xl py-14 sm:py-20">
        {/* ---------- Encabezado ---------- */}
        <header className="mb-10 max-w-2xl">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-500">
            Atención al cliente
          </p>
          <h1 className="mb-3 text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            Peticiones, quejas y reclamos
          </h1>
          <p className="text-sm leading-relaxed text-white/55 sm:text-base">
            Cuéntanos qué pasó y le hacemos seguimiento. Al radicar recibes un
            número con el que puedes consultar el estado cuando quieras, y te
            respondemos al correo que registres.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
          {/* ---------- Radicar ---------- */}
          <section className="border border-white/10 bg-dark-900 p-6 sm:p-8">
            {radicada ? (
              <div className="text-center">
                <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                  <Icon name="checkCirculo" className="h-7 w-7" />
                </span>
                <h2 className="mb-2 text-xl font-bold text-white">Solicitud radicada</h2>
                <p className="mb-5 text-sm leading-relaxed text-white/55">
                  Guarda este número. Con él consultas el estado sin iniciar sesión.
                </p>

                <p className="mx-auto mb-6 inline-block border-2 border-dashed border-brand-500 bg-brand-500/10 px-7 py-4 text-2xl font-bold tracking-[0.18em] text-white">
                  {radicada.radicado}
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      setRadicado(radicada.radicado);
                      setRadicada(null);
                    }}
                    icono="buscar"
                  >
                    Consultar su estado
                  </Button>
                  <Button fullWidth onClick={() => setRadicada(null)} icono="mas">
                    Radicar otra
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mb-1 text-lg font-bold text-white">Radicar una solicitud</h2>
                <p className="mb-6 text-sm text-white/45">
                  Todos los campos marcados con * son obligatorios.
                </p>

                <form onSubmit={handleRadicar} className="space-y-4" noValidate>
                  {errorServidor && <Alert tipo="error">{errorServidor}</Alert>}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Tipo de solicitud"
                      name="tipo"
                      required
                      options={TIPOS}
                      placeholder="Elige el tipo"
                      value={formulario.values.tipo}
                      onChange={formulario.handleChange}
                      onBlur={formulario.handleBlur}
                      error={formulario.errors.tipo}
                    />
                    <Input
                      label="Número de pedido"
                      name="id_venta"
                      type="number"
                      placeholder="Opcional"
                      hint="Si tu caso es sobre una compra."
                      value={formulario.values.id_venta || ""}
                      onChange={formulario.handleChange}
                    />
                  </div>

                  <Input
                    label="Asunto"
                    name="asunto"
                    required
                    maxLength={120}
                    placeholder="Resume el caso en una línea"
                    value={formulario.values.asunto}
                    onChange={formulario.handleChange}
                    onBlur={formulario.handleBlur}
                    error={formulario.errors.asunto}
                  />

                  <Textarea
                    label="Descripción"
                    name="descripcion"
                    required
                    rows={5}
                    maxLength={1000}
                    hint="Cuenta qué pasó con el mayor detalle posible."
                    placeholder="Describe la situación..."
                    value={formulario.values.descripcion}
                    onChange={formulario.handleChange}
                    onBlur={formulario.handleBlur}
                    error={formulario.errors.descripcion}
                  />

                  <div className="border-t border-white/10 pt-4">
                    <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-white/40">
                      Tus datos de contacto
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Nombre completo"
                        name="nombre"
                        required
                        maxLength={80}
                        value={formulario.values.nombre}
                        onChange={formulario.handleChange}
                        onBlur={formulario.handleBlur}
                        error={formulario.errors.nombre}
                      />
                      <Input
                        label="Teléfono"
                        name="telefono"
                        maxLength={15}
                        placeholder="Opcional"
                        value={formulario.values.telefono}
                        onChange={formulario.handleChange}
                      />
                    </div>

                    <Input
                      className="mt-4"
                      label="Correo electrónico"
                      name="email"
                      type="email"
                      required
                      hint="A este correo enviamos la respuesta."
                      value={formulario.values.email}
                      onChange={formulario.handleChange}
                      onBlur={formulario.handleBlur}
                      error={formulario.errors.email}
                      icono="sobre"
                    />
                  </div>

                  <Button type="submit" fullWidth size="lg" cargando={enviando} icono="sobre">
                    Radicar solicitud
                  </Button>
                </form>
              </>
            )}
          </section>

          {/* ---------- Consultar y ayuda ---------- */}
          <div className="space-y-6">
            <section className="border border-white/10 bg-dark-900 p-6">
              <h2 className="mb-1 text-lg font-bold text-white">Consultar el estado</h2>
              <p className="mb-5 text-sm text-white/45">
                Escribe el número que recibiste al radicar.
              </p>

              <form onSubmit={handleConsultar} className="space-y-3" noValidate>
                <Input
                  label="Número de radicado"
                  name="radicado"
                  placeholder="PQR-2026-000100"
                  value={radicado}
                  onChange={(e) => setRadicado(e.target.value.toUpperCase())}
                  error={errorConsulta}
                  icono="buscar"
                />
                <Button type="submit" fullWidth cargando={consultando} variant="secondary">
                  Consultar
                </Button>
              </form>

              {consulta && (
                <div className="mt-5 border-t border-white/10 pt-5 animate-[fadeIn_.25s_ease-out]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-bold text-white">
                      {consulta.radicado}
                    </span>
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        (ESTADOS[consulta.estado] || ESTADOS.pendiente).clase
                      }`}
                    >
                      {(ESTADOS[consulta.estado] || ESTADOS.pendiente).texto}
                    </span>
                  </div>

                  <p className="mb-1 text-[11px] uppercase tracking-wider text-white/35">
                    {consulta.tipo}
                  </p>
                  <p className="mb-3 text-sm font-semibold text-white">{consulta.asunto}</p>
                  <p className="mb-4 text-xs text-white/40">
                    Radicada el {formatoFecha(consulta.creado_en)}
                  </p>

                  {consulta.respuesta ? (
                    <div className="border-l-2 border-brand-500 bg-white/[0.03] p-4">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-500">
                        Nuestra respuesta
                      </p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
                        {consulta.respuesta}
                      </p>
                      {consulta.respondida_en && (
                        <p className="mt-2 text-[11px] text-white/35">
                          {formatoFecha(consulta.respondida_en)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Alert tipo="info">
                      Tu solicitud está en trámite. Te avisaremos al correo apenas
                      tengamos una respuesta.
                    </Alert>
                  )}
                </div>
              )}
            </section>

            <section className="border border-white/10 bg-dark-900 p-6">
              <h2 className="mb-4 text-lg font-bold text-white">¿Cuál me corresponde?</h2>
              <dl className="space-y-3.5">
                {QUE_ES.map((item) => (
                  <div key={item.titulo}>
                    <dt className="text-sm font-semibold text-brand-500">{item.titulo}</dt>
                    <dd className="text-xs leading-relaxed text-white/50">{item.texto}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/40">
                Si tu caso es sobre un pedido en curso, míralo primero en{" "}
                <Link to="/cliente/pedidos" className="text-brand-500 hover:underline">
                  Mis pedidos
                </Link>
                . Para dudas rápidas, el asistente del sitio responde al instante.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PQR;
