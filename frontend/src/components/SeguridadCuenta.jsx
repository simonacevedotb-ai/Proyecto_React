import { useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authService } from "../services/authService";
import Alert from "./ui/Alert";
import Button from "./ui/Button";
import Icon from "./ui/Icon";

/**
 * Seguridad de la cuenta: estado del correo y verificación en dos pasos.
 *
 * Las dos cosas van juntas porque dependen una de la otra: el código del
 * segundo paso se envía al correo, así que no tiene sentido activarlo
 * mientras esa dirección no esté confirmada. El backend aplica esa misma
 * regla; aquí solo se explica y se evita el intento inútil.
 */
function SeguridadCuenta() {
  const { usuario, actualizarUsuario } = useAuth();
  const toast = useToast();

  const [cambiando, setCambiando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  const verificado = !!usuario?.email_verificado;
  const dobleFactor = !!usuario?.doble_factor;

  const handleAlternar = async () => {
    setCambiando(true);
    try {
      const datos = await authService.cambiarDobleFactor(!dobleFactor);
      actualizarUsuario(datos.usuario);
      toast.exito(datos.message);
    } catch (error) {
      toast.error(error.message || "No se pudo cambiar la configuración.");
    } finally {
      setCambiando(false);
    }
  };

  const handleReenviar = async () => {
    setReenviando(true);
    try {
      await authService.reenviarVerificacion(usuario.email);
      setReenviado(true);
      toast.exito("Te enviamos un enlace nuevo a tu correo.");
    } catch (error) {
      toast.error(error.message || "No se pudo enviar el correo.");
    } finally {
      setReenviando(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-dark-900 p-6">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
          <Icon name="escudo" className="h-4 w-4" />
        </span>
        Seguridad de la cuenta
      </h2>
      <p className="mb-5 pl-10 text-xs text-white/45">
        Protege tu cuenta con una segunda comprobación al iniciar sesión.
      </p>

      {/* --- Estado del correo --- */}
      <div className="mb-4 flex flex-col gap-3 border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon
            name={verificado ? "checkCirculo" : "alerta"}
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              verificado ? "text-emerald-400" : "text-amber-400"
            }`}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {verificado ? "Correo verificado" : "Correo sin verificar"}
            </p>
            <p className="truncate text-xs text-white/45">{usuario?.email}</p>
          </div>
        </div>

        {!verificado && !reenviado && (
          <Button size="sm" cargando={reenviando} onClick={handleReenviar} icono="sobre">
            Reenviar enlace
          </Button>
        )}
        {!verificado && reenviado && (
          <span className="shrink-0 text-xs font-semibold text-emerald-400">
            Enlace enviado
          </span>
        )}
      </div>

      {/* --- Verificación en dos pasos --- */}
      <div className="flex flex-col gap-4 border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Verificación en dos pasos</p>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                dobleFactor
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {dobleFactor ? "Activada" : "Desactivada"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-white/45">
            Al iniciar sesión te enviaremos un código de 6 dígitos a tu correo. Sin ese
            código, tu contraseña por sí sola no abre la cuenta.
          </p>
        </div>

        <Button
          size="sm"
          variant={dobleFactor ? "secondary" : "primary"}
          cargando={cambiando}
          disabled={!verificado && !dobleFactor}
          onClick={handleAlternar}
          className="shrink-0"
        >
          {dobleFactor ? "Desactivar" : "Activar"}
        </Button>
      </div>

      {!verificado && !dobleFactor && (
        <Alert tipo="alerta" className="mt-4">
          Confirma primero tu correo: el código del segundo paso se envía a esa dirección.
        </Alert>
      )}
    </section>
  );
}

export default SeguridadCuenta;
