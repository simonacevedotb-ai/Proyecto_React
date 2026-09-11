import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { contactoService } from "../../services/contactoService";
import { REGEX } from "../../utils/validations";
import Button from "../ui/Button";
import Icon from "../ui/Icon";

/**
 * Suscripción al boletín.
 *
 * No es un formulario decorativo: la suscripción se guarda de verdad
 * como un mensaje en la bandeja de contacto del panel administrativo,
 * donde el equipo la ve y la gestiona.
 */
function Newsletter() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [suscrito, setSuscrito] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valor = email.trim();

    if (!REGEX.email.test(valor)) {
      setError("Escribe un correo electrónico válido.");
      return;
    }
    setError("");
    setEnviando(true);

    try {
      await contactoService.enviar({
        nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : "Suscriptor del boletín",
        email: valor,
        asunto: "Suscripción al boletín de novedades",
        mensaje:
          "Solicito recibir por correo las novedades, lanzamientos y ofertas de PhoneStore.",
      });
      setSuscrito(true);
      setEmail("");
      toast.exito("¡Listo! Quedaste suscrito a nuestras novedades.");
    } catch (err) {
      const mensaje =
        err.status === 429
          ? "Ya registramos varias solicitudes desde este equipo. Intenta de nuevo en unos minutos."
          : err.message || "No pudimos registrar tu suscripción.";
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-dark-900 py-14 sm:py-16">
      <div className="malla-hero pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="reveal relative mx-auto grid w-[94%] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <div className="text-white">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-300">
            <Icon name="regalo" className="h-3.5 w-3.5" />
            Novedades y ofertas
          </span>
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Entérate antes que nadie
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-white/30 sm:text-base">
            Recibe los lanzamientos, las rebajas reales y los descuentos en servicio
            técnico directamente en tu correo. Sin spam: puedes salirte cuando quieras.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
          {suscrito ? (
            <div className="text-center">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Icon name="checkCirculo" className="h-7 w-7" />
              </span>
              <h3 className="mb-1.5 text-lg font-bold text-white">
                ¡Suscripción registrada!
              </h3>
              <p className="text-sm text-white/30">
                Guardamos tu correo y te escribiremos con las próximas novedades.
              </p>
              <button
                onClick={() => setSuscrito(false)}
                className="mt-4 text-sm font-semibold text-brand-400 hover:underline"
              >
                Suscribir otro correo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label
                htmlFor="newsletter-email"
                className="mb-2 block text-sm font-semibold text-white"
              >
                Tu correo electrónico
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="tucorreo@ejemplo.com"
                  aria-invalid={!!error}
                  className={`h-12 flex-1 rounded-xl border bg-white/10 px-4 text-sm text-white placeholder:text-white/40 outline-none transition-colors ${
                    error
                      ? "border-rose-500/40 focus:border-rose-500/40"
                      : "border-white/20 focus:border-brand-400"
                  }`}
                />
                <Button type="submit" cargando={enviando} size="md" className="sm:w-auto">
                  Suscribirme
                </Button>
              </div>

              {error && (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-300">
                  <Icon name="error" className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}

              <p className="mt-3 text-xs leading-relaxed text-white/40">
                Al suscribirte aceptas nuestra{" "}
                <Link to="/politicas/privacidad" className="font-semibold text-brand-400 hover:underline">
                  política de privacidad
                </Link>
                . Solo usamos tu correo para enviarte novedades de la tienda.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default Newsletter;
