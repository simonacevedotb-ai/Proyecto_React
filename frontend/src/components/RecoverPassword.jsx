import { useState } from "react";

import { useToast } from "../context/ToastContext";
import { useForm } from "../hooks/useForm";
import { authService } from "../services/authService";
import { validateEmail } from "../utils/validations";
import Alert from "./ui/Alert";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import Input from "./ui/Input";

/**
 * Recuperación de contraseña conectada al backend.
 *
 * El backend genera un token de un solo uso, lo guarda hasheado con
 * caducidad y envía el enlace por correo. La respuesta es siempre la
 * misma exista o no la cuenta, para no revelar qué correos están
 * registrados, y el enlace nunca viaja en el JSON.
 */
function RecoverPassword({ onBack }) {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const toast = useToast();

  const { values, errors, handleChange, handleBlur, validateAll } = useForm(
    { email: "" },
    { email: validateEmail }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!validateAll()) return;

    setEnviando(true);
    try {
      await authService.recuperarPassword(values.email.trim());
      setEnviado(true);
      toast.exito("Revisa tu correo para continuar.");
    } catch (error) {
      const mensaje =
        error.status === 429
          ? "Demasiadas solicitudes seguidas. Espera unos minutos e intenta de nuevo."
          : error.message || "No pudimos procesar la solicitud.";
      setErrorServidor(mensaje);
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-white">Recuperar contraseña</h2>
      <p className="mb-6 text-sm text-white/50">
        Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
      </p>

      {enviado ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/12 p-5 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/18 text-emerald-400">
              <Icon name="sobre" className="h-7 w-7" />
            </span>
            <h3 className="mb-1.5 text-base font-bold text-emerald-400">
              Revisa tu correo
            </h3>
            <p className="text-sm leading-relaxed text-emerald-400">
              Si <strong>{values.email}</strong> está registrado, te enviamos un enlace
              para restablecer tu contraseña. Caduca en 30 minutos y solo se puede usar
              una vez.
            </p>
          </div>

          <Alert tipo="info">
            ¿No lo ves? Revisa la carpeta de correo no deseado. En un entorno de
            desarrollo sin servidor de correo configurado, el enlace queda registrado en
            la consola del backend y en{" "}
            <code className="rounded bg-white/10 px-1 text-[11px]">
              backend-fastapi/correos_enviados.log
            </code>
            .
          </Alert>

          <Button variant="secondary" fullWidth onClick={() => setEnviado(false)}>
            Usar otro correo
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorServidor && <Alert tipo="error">{errorServidor}</Alert>}

          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            required
            placeholder="tucorreo@ejemplo.com"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            autoComplete="email"
            icono="sobre"
          />

          <Button type="submit" fullWidth cargando={enviando}>
            Enviar enlace de recuperación
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 transition-colors hover:text-brand-500 hover:underline"
      >
        <Icon name="flechaIzquierda" className="h-4 w-4" />
        Volver al inicio de sesión
      </button>
    </div>
  );
}

export default RecoverPassword;
