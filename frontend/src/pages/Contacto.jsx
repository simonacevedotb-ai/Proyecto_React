import { useEffect, useState } from "react";

import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useForm } from "../hooks/useForm";
import { useReveal } from "../hooks/useReveal";
import { contactoService } from "../services/contactoService";
import { validateEmail } from "../utils/validations";

const ASUNTOS = [
  { value: "Consulta sobre un producto", label: "Consulta sobre un producto" },
  { value: "Estado de mi pedido", label: "Estado de mi pedido" },
  { value: "Servicio técnico", label: "Servicio técnico" },
  { value: "Garantías y devoluciones", label: "Garantías y devoluciones" },
  { value: "Facturación", label: "Facturación" },
  { value: "Otro", label: "Otro" },
];

const CANALES = [
  {
    icono: "llamada",
    titulo: "Teléfono",
    valor: "+57 314 772 8502",
    href: "tel:+573147728502",
    detalle: "Lunes a viernes, 8:00 a. m. – 6:00 p. m.",
  },
  {
    icono: "sobre",
    titulo: "Correo",
    valor: "contacto@phonestore.com",
    href: "mailto:contacto@phonestore.com",
    detalle: "Respondemos en menos de 24 horas hábiles",
  },
  {
    icono: "chat",
    titulo: "WhatsApp",
    valor: "Chatea con un asesor",
    href: "https://wa.me/573147728502?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20PhoneStore.",
    detalle: "La forma más rápida de resolver dudas",
  },
  {
    icono: "ubicacion",
    titulo: "Tienda física",
    valor: "Calle 45 #12-34, Medellín",
    href: "https://maps.google.com/?q=Medellin+Colombia",
    detalle: "Sábados de 9:00 a. m. a 2:00 p. m.",
  },
];

function validarNombre(valor) {
  if (!valor || !valor.trim()) return "Tu nombre es obligatorio.";
  if (valor.trim().length < 2) return "Debe tener al menos 2 caracteres.";
  if (valor.length > 80) return "Máximo 80 caracteres.";
  return "";
}

function validarTelefonoOpcional(valor) {
  if (!valor) return "";
  if (!/^[0-9]{7,15}$/.test(valor)) return "Ingresa entre 7 y 15 dígitos numéricos.";
  return "";
}

function validarAsunto(valor) {
  if (!valor) return "Selecciona un asunto.";
  return "";
}

function validarMensaje(valor) {
  if (!valor || !valor.trim()) return "Escribe tu mensaje.";
  if (valor.trim().length < 10) return "El mensaje debe tener al menos 10 caracteres.";
  if (valor.length > 1000) return "Máximo 1000 caracteres.";
  return "";
}

/**
 * Formulario de contacto conectado al backend.
 *
 * Los mensajes se guardan en la tabla `mensajes_contacto` y aparecen en
 * la bandeja del panel administrativo, donde se marcan como leídos o
 * respondidos.
 */
function Contacto() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");

  const { values, errors, handleChange, handleBlur, validateAll, setValues, setErrors, reset } =
    useForm(
      { nombre: "", email: "", telefono: "", asunto: "", mensaje: "" },
      {
        nombre: validarNombre,
        email: validateEmail,
        telefono: validarTelefonoOpcional,
        asunto: validarAsunto,
        mensaje: validarMensaje,
      }
    );

  useEffect(() => {
    if (!usuario) return;
    setValues((prev) => ({
      ...prev,
      nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
      email: usuario.email || "",
      telefono: usuario.telefono || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  useReveal([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!validateAll()) {
      toast.error("Revisa los campos marcados en rojo.");
      return;
    }

    setEnviando(true);
    try {
      const data = await contactoService.enviar({
        nombre: values.nombre.trim(),
        email: values.email.trim(),
        telefono: values.telefono.trim() || null,
        asunto: values.asunto,
        mensaje: values.mensaje.trim(),
      });
      setEnviado(true);
      reset();
      toast.exito(data.message);
    } catch (error) {
      if (error.errors) setErrors((prev) => ({ ...prev, ...error.errors }));
      const mensaje =
        error.status === 429
          ? "Recibimos varios mensajes desde este equipo. Espera unos minutos e intenta de nuevo."
          : error.message || "No pudimos enviar tu mensaje.";
      setErrorServidor(mensaje);
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-dark-900 pb-16">
      {/* Encabezado */}
      <section className="relative overflow-hidden bg-dark-900 py-14 text-white sm:py-16">
        <div className="malla-hero pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto w-[94%] max-w-4xl text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Hablemos
          </h1>
          <p className="mx-auto max-w-2xl text-base text-white/30">
            ¿Tienes una duda sobre un producto, tu pedido o una reparación? Escríbenos y
            te respondemos por el canal que prefieras.
          </p>
        </div>
      </section>

      <div className="mx-auto w-[94%] max-w-7xl py-10">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Canales */}
          <div className="space-y-4 lg:col-span-2">
            {CANALES.map((canal, i) => (
              <a
                key={canal.titulo}
                href={canal.href}
                target={canal.href.startsWith("http") ? "_blank" : undefined}
                rel={canal.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={`reveal reveal-d${Math.min(i + 1, 5)} group flex items-start gap-4 rounded-2xl border border-white/10 bg-dark-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-lg`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-white">
                  <Icon name={canal.icono} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/40">
                    {canal.titulo}
                  </p>
                  <p className="break-words text-sm font-bold text-white transition-colors group-hover:text-brand-500">
                    {canal.valor}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50">{canal.detalle}</p>
                </div>
              </a>
            ))}

            <div className="reveal rounded-2xl border border-white/10 bg-dark-900 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Icon name="reloj" className="h-4 w-4 text-brand-500" />
                Horario de atención
              </h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-white/50">Lunes a viernes</dt>
                  <dd className="font-semibold text-white/80">8:00 a. m. – 6:00 p. m.</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Sábados</dt>
                  <dd className="font-semibold text-white/80">9:00 a. m. – 2:00 p. m.</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">Domingos y festivos</dt>
                  <dd className="font-semibold text-white/40">Cerrado</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Formulario */}
          <div className="lg:col-span-3">
            <div className="reveal reveal-der rounded-2xl border border-white/10 bg-dark-900 p-6 sm:p-8">
              <h2 className="mb-1 text-xl font-bold text-white">Envíanos un mensaje</h2>
              <p className="mb-6 text-sm text-white/50">
                Completa el formulario y nuestro equipo te responderá al correo que
                registres.
              </p>

              {enviado ? (
                <div className="text-center">
                  <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-400">
                    <Icon name="checkCirculo" className="h-8 w-8" />
                  </span>
                  <h3 className="mb-2 text-lg font-bold text-white">
                    ¡Mensaje enviado!
                  </h3>
                  <p className="mb-6 text-sm leading-relaxed text-white/50">
                    Ya está en la bandeja de nuestro equipo. Te responderemos en menos de
                    24 horas hábiles.
                  </p>
                  <Button variant="secondary" onClick={() => setEnviado(false)}>
                    Enviar otro mensaje
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {errorServidor && <Alert tipo="error">{errorServidor}</Alert>}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Nombre completo"
                      name="nombre"
                      value={values.nombre}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.nombre}
                      maxLength={80}
                      icono="usuario"
                      required
                    />
                    <Input
                      label="Correo electrónico"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.email}
                      icono="sobre"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Teléfono (opcional)"
                      name="telefono"
                      value={values.telefono}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.telefono}
                      maxLength={15}
                      icono="llamada"
                      hint="Si prefieres que te llamemos"
                    />
                    <Select
                      label="Asunto"
                      name="asunto"
                      value={values.asunto}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.asunto}
                      options={ASUNTOS}
                      placeholder="¿Sobre qué nos escribes?"
                      required
                    />
                  </div>

                  <Textarea
                    label="Mensaje"
                    name="mensaje"
                    value={values.mensaje}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.mensaje}
                    rows={5}
                    maxLength={1000}
                    placeholder="Cuéntanos con detalle en qué podemos ayudarte..."
                    required
                  />

                  <Button type="submit" fullWidth size="lg" cargando={enviando} icono="sobre">
                    Enviar mensaje
                  </Button>

                  <p className="text-center text-xs leading-relaxed text-white/40">
                    Usamos tus datos únicamente para responder tu solicitud, según nuestra
                    política de privacidad.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contacto;
