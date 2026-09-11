import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import DobleFactorPaso from "../components/DobleFactorPaso";
import RegisterModal from "../components/RegisterModal";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useForm } from "../hooks/useForm";
import { required, validateEmail } from "../utils/validations";

// A dónde va cada rol después de iniciar sesión
const RUTA_POR_ROL = {
  administrador: "/admin",
  empleado: "/admin",
  cliente: "/cliente",
};

const VENTAJAS = [
  { icono: "recibo", texto: "Sigue el estado de todos tus pedidos" },
  { icono: "herramienta", texto: "Agenda y consulta tus servicios técnicos" },
  { icono: "camion", texto: "Compra más rápido con tus datos guardados" },
  { icono: "escudo", texto: "Garantías asociadas a tu cuenta" },
];

function Login() {
  // "login" | "codigo" (segundo paso de la verificación en dos pasos)
  const [vista, setVista] = useState("login");
  const [desafio, setDesafio] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const { values, errors, handleChange, handleBlur, validateAll } = useForm(
    { email: "", password: "" },
    { email: validateEmail, password: required }
  );

  const irADestino = (usuarioAutenticado) => {
    const destino = location.state?.from || RUTA_POR_ROL[usuarioAutenticado.rol] || "/";
    navigate(destino, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!validateAll()) return;

    setEnviando(true);
    try {
      const resultado = await login(values.email.trim(), values.password);

      // La cuenta con verificación en dos pasos todavía no tiene sesión:
      // el backend mandó un código al correo y hay que pedirlo.
      if (resultado.requiereDobleFactor) {
        setDesafio({
          desafio: resultado.desafio,
          emailParcial: resultado.emailParcial,
          minutos: resultado.minutos,
        });
        setVista("codigo");
        toast.info("Te enviamos un código de verificación por correo.");
        return;
      }

      toast.exito(`¡Hola de nuevo, ${resultado.usuario.nombre}!`);
      irADestino(resultado.usuario);
    } catch (error) {
      const mensaje =
        error.status === 429
          ? "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo."
          : error.message || "No se pudo iniciar sesión.";
      setLoginError(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-var(--altura-header))] items-center bg-dark-900 px-4 py-12">
      <div className="malla-hero pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        {/* Presentación */}
        <div className="hidden text-white lg:block">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight">
            Tu cuenta de{" "}
            <span className="block text-brand-400">
              Phone<span className="text-white">Store</span>
            </span>
          </h1>
          <p className="mb-8 max-w-md text-base leading-relaxed text-white/30">
            Inicia sesión para comprar más rápido, seguir tus pedidos y gestionar tus
            servicios técnicos desde un solo lugar.
          </p>

          <ul className="space-y-3">
            {VENTAJAS.map((v) => (
              <li key={v.texto} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                  <Icon name={v.icono} className="h-4 w-4" />
                </span>
                <span className="text-sm text-white/30">{v.texto}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Formulario */}
        <div className="w-full rounded-2xl bg-dark-900 p-6 shadow-2xl sm:p-8">
          {vista === "codigo" ? (
            <DobleFactorPaso
              desafio={desafio.desafio}
              emailParcial={desafio.emailParcial}
              minutos={desafio.minutos}
              onVerificado={(usuarioAutenticado) => {
                toast.exito(`¡Hola de nuevo, ${usuarioAutenticado.nombre}!`);
                irADestino(usuarioAutenticado);
              }}
              onCancelar={() => {
                setDesafio(null);
                setVista("login");
              }}
            />
          ) : (
            <>
              <h2 className="mb-1 text-2xl font-bold text-white">Iniciar sesión</h2>
              <p className="mb-6 text-sm text-white/50">
                Ingresa tus credenciales para acceder a tu cuenta.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {loginError && <Alert tipo="error">{loginError}</Alert>}

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

                <Input
                  label="Contraseña"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.password}
                  autoComplete="current-password"
                />

                <div className="flex justify-end">
                  <Link
                    to="/recuperar-contrasena"
                    className="text-sm font-semibold text-brand-500 transition-colors hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <Button type="submit" fullWidth size="lg" cargando={enviando}>
                  {enviando ? "Ingresando..." : "Iniciar sesión"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-dark-700" />
                <span className="text-xs font-medium uppercase tracking-wide text-white/40">
                  o
                </span>
                <span className="h-px flex-1 bg-dark-700" />
              </div>

              <Button
                variant="secondary"
                fullWidth
                onClick={() => setIsRegisterOpen(true)}
                icono="usuario"
              >
                Crear una cuenta nueva
              </Button>

              <p className="mt-6 text-center text-xs leading-relaxed text-white/40">
                Al continuar aceptas nuestros{" "}
                <Link to="/politicas/terminos" className="font-semibold text-brand-500 hover:underline">
                  términos y condiciones
                </Link>{" "}
                y la{" "}
                <Link to="/politicas/privacidad" className="font-semibold text-brand-500 hover:underline">
                  política de privacidad
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegistered={(usuarioNuevo) => {
          setIsRegisterOpen(false);
          if (usuarioNuevo) irADestino(usuarioNuevo);
        }}
      />
    </div>
  );
}

export default Login;
