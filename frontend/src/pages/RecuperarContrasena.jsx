import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import { useToast } from "../context/ToastContext";
import { authService } from "../services/authService";
import { validateConfirmPassword, validateEmail, validatePassword } from "../utils/validations";

/**
 * Recuperación de contraseña en una sola pantalla.
 *
 * El correo que envía el backend trae dos caminos y los dos terminan aquí:
 *
 *   - un código de 6 dígitos, que se escribe en esta misma página
 *   - un botón con un enlace que abre esta página con `?token=...`
 *
 * Cuando se llega por el enlace, el token ya identifica la solicitud y el
 * campo del código sobra; cuando se llega a mano, hace falta el correo y
 * el código. En los dos casos la contraseña nueva se escribe aquí y no se
 * cambia de pantalla.
 */
function RecuperarContrasena() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const [errores, setErrores] = useState({});
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [listo, setListo] = useState(false);

  const porEnlace = Boolean(token);

  const handleEnviarCodigo = async (e) => {
    e.preventDefault();
    setErrorServidor("");

    const errorCorreo = validateEmail(email);
    if (errorCorreo) {
      setErrores((previos) => ({ ...previos, email: errorCorreo }));
      return;
    }
    setErrores((previos) => ({ ...previos, email: "" }));

    setEnviandoCodigo(true);
    try {
      await authService.recuperarPassword(email.trim());
      setCodigoEnviado(true);
      toast.exito("Revisa tu correo: te enviamos el código.");
    } catch (error) {
      setErrorServidor(
        error.status === 429
          ? "Pediste el código demasiadas veces. Espera unos minutos."
          : error.message || "No se pudo enviar el código."
      );
    } finally {
      setEnviandoCodigo(false);
    }
  };

  const handleActualizar = async (e) => {
    e.preventDefault();
    setErrorServidor("");

    const nuevos = {
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password)(confirmar),
    };
    if (!porEnlace) {
      nuevos.email = validateEmail(email);
      nuevos.codigo =
        codigo.length === 6 ? "" : "Escribe los 6 dígitos que llegaron al correo.";
    }
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    setGuardando(true);
    try {
      if (porEnlace) {
        await authService.restablecerPassword({ token, password });
      } else {
        await authService.restablecerConCodigo({
          email: email.trim(),
          codigo,
          password,
        });
      }
      setListo(true);
      toast.exito("Contraseña actualizada. Ya puedes iniciar sesión.");
      setTimeout(() => navigate("/login", { replace: true }), 2200);
    } catch (error) {
      if (error.errors) setErrores((previos) => ({ ...previos, ...error.errors }));
      setErrorServidor(error.message || "No se pudo actualizar la contraseña.");
    } finally {
      setGuardando(false);
    }
  };

  // ---------------------------------------------------------------
  if (listo) {
    return (
      <Marco>
        <div className="text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            <Icon name="checkCirculo" className="h-7 w-7" />
          </span>
          <h1 className="mb-2 text-2xl font-bold text-white">Contraseña actualizada</h1>
          <p className="mb-7 text-sm leading-relaxed text-white/55">
            Ya puedes entrar con tu contraseña nueva. Te llevamos al inicio de sesión.
          </p>
          <Button to="/login" fullWidth size="lg">
            Iniciar sesión
          </Button>
        </div>
      </Marco>
    );
  }

  return (
    <Marco>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-500">
        PhoneStore
      </p>
      <h1 className="mb-2 text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
        Recuperar contraseña
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-white/55">
        {porEnlace
          ? "Abriste el enlace del correo. Solo falta escribir tu contraseña nueva."
          : "Te enviamos un código de 6 dígitos al correo. Escríbelo aquí junto con tu contraseña nueva."}
      </p>

      {errorServidor && (
        <Alert tipo="error" className="mb-5">
          {errorServidor}
        </Alert>
      )}

      {/* ---------- Paso 1: pedir el código ---------- */}
      {!porEnlace && (
        <>
          {codigoEnviado && (
            <Alert tipo="exito" className="mb-4">
              Te enviamos un correo con el código y un enlace directo. Revisa también
              la carpeta de correo no deseado.
            </Alert>
          )}

          <form onSubmit={handleEnviarCodigo} className="space-y-4" noValidate>
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              required
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errores.email}
              autoComplete="email"
              icono="sobre"
            />

            <Button
              type="submit"
              variant={codigoEnviado ? "secondary" : "primary"}
              fullWidth
              size="lg"
              cargando={enviandoCodigo}
              icono="sobre"
            >
              {codigoEnviado ? "Enviar el código otra vez" : "Enviar código de recuperación"}
            </Button>
          </form>

          <div className="my-7 h-px bg-white/10" />
        </>
      )}

      {/* ---------- Paso 2: código y contraseña nueva ---------- */}
      <form onSubmit={handleActualizar} className="space-y-4" noValidate>
        {!porEnlace && (
          <div>
            <label
              htmlFor="codigo"
              className="mb-1.5 block text-sm font-semibold text-white/80"
            >
              Código de 6 dígitos
              <span className="ml-0.5 text-brand-500">*</span>
            </label>
            <input
              id="codigo"
              name="codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-invalid={!!errores.codigo}
              className={`w-full border bg-white/5 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-white placeholder:text-white/20 outline-none transition-colors ${
                errores.codigo
                  ? "border-rose-500/50 focus:border-rose-500"
                  : "border-white/15 focus:border-brand-500"
              }`}
            />
            <p className="mt-1.5 text-xs text-white/40">
              {errores.codigo ? (
                <span className="font-medium text-rose-400">{errores.codigo}</span>
              ) : (
                "Lo encuentras en el correo que acabamos de enviarte."
              )}
            </p>
          </div>
        )}

        <Input
          label="Nueva contraseña"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errores.password}
          hint="Entre 8 y 20 caracteres, con mayúscula, minúscula y número."
          autoComplete="new-password"
        />

        <Input
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          required
          placeholder="••••••••"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          error={errores.confirmPassword}
          autoComplete="new-password"
        />

        <Button type="submit" fullWidth size="lg" cargando={guardando} icono="candado">
          Actualizar contraseña
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-white/50 transition-colors hover:text-brand-500"
      >
        <Icon name="flechaIzquierda" className="h-4 w-4" />
        Volver a iniciar sesión
      </Link>
    </Marco>
  );
}

/** Fondo y tarjeta, compartidos por los dos estados de la pantalla. */
function Marco({ children }) {
  return (
    <div className="relative flex min-h-[calc(100vh-var(--altura-header))] items-center justify-center bg-black px-4 py-16">
      <div
        className="malla-tecnica pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md border border-white/10 bg-dark-900 p-7 shadow-2xl sm:p-9">
        {children}
      </div>
    </div>
  );
}

export default RecuperarContrasena;
