import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import { useToast } from "../context/ToastContext";
import { useForm } from "../hooks/useForm";
import { authService } from "../services/authService";
import { validateConfirmPassword, validatePassword } from "../utils/validations";

/**
 * Pantalla a la que lleva el enlace del correo de recuperación.
 *
 * El token viaja en la URL (?token=...). El backend verifica que exista,
 * que no haya caducado y que no se haya usado antes.
 */
function RestablecerPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const toast = useToast();

  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");

  const { values, errors, handleChange, handleBlur, validateAll } = useForm(
    { password: "", confirmPassword: "" },
    {
      password: validatePassword,
      confirmPassword: (valor, todos) => validateConfirmPassword(todos.password)(valor),
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!validateAll()) return;

    setEnviando(true);
    try {
      const data = await authService.restablecerPassword({
        token,
        password: values.password,
      });
      setListo(true);
      toast.exito(data.message);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (error) {
      setErrorServidor(error.message || "No pudimos restablecer la contraseña.");
      toast.error(error.message || "No pudimos restablecer la contraseña.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center bg-dark-900 px-4 py-14">
      <div className="malla-hero pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-dark-900 p-6 shadow-2xl sm:p-8">
        {!token ? (
          <>
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/12 text-amber-400">
              <Icon name="alerta" className="h-7 w-7" />
            </span>
            <h1 className="mb-2 text-center text-xl font-bold text-white">
              Enlace incompleto
            </h1>
            <p className="mb-6 text-center text-sm leading-relaxed text-white/50">
              Este enlace no trae el código de verificación. Solicita uno nuevo desde la
              pantalla de inicio de sesión.
            </p>
            <Button fullWidth to="/login">
              Ir a iniciar sesión
            </Button>
          </>
        ) : listo ? (
          <>
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-400">
              <Icon name="checkCirculo" className="h-8 w-8" />
            </span>
            <h1 className="mb-2 text-center text-xl font-bold text-white">
              ¡Contraseña actualizada!
            </h1>
            <p className="mb-6 text-center text-sm leading-relaxed text-white/50">
              Ya puedes iniciar sesión con tu nueva contraseña. Te llevamos allá en unos
              segundos...
            </p>
            <Button fullWidth to="/login">
              Iniciar sesión ahora
            </Button>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-bold text-white">Nueva contraseña</h1>
            <p className="mb-6 text-sm text-white/50">
              Elige una contraseña segura que no uses en otros sitios.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errorServidor && (
                <Alert tipo="error">
                  {errorServidor}
                  <Link
                    to="/login"
                    className="mt-1 block font-semibold underline hover:no-underline"
                  >
                    Solicitar un enlace nuevo
                  </Link>
                </Alert>
              )}

              <Input
                label="Nueva contraseña"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
                hint="8 a 20 caracteres, con mayúscula, minúscula y número."
                autoComplete="new-password"
              />

              <Input
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                required
                placeholder="••••••••"
                value={values.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              <Button type="submit" fullWidth cargando={enviando} icono="candado">
                Guardar contraseña
              </Button>
            </form>

            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline"
            >
              <Icon name="flechaIzquierda" className="h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default RestablecerPassword;
