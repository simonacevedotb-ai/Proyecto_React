import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

/**
 * Pantalla a la que lleva el enlace del correo de verificación.
 *
 * El token viaja en la URL (?token=...). El backend comprueba que exista,
 * que no haya caducado y que no se haya usado antes; si todo está bien,
 * marca la cuenta como verificada.
 *
 * Si hay sesión abierta, los datos del usuario se refrescan en el acto
 * para que el aviso de "correo sin confirmar" desaparezca.
 */
function VerificarCorreo() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { usuario, actualizarUsuario } = useAuth();

  const [estado, setEstado] = useState(token ? "verificando" : "sin-token");
  const [mensaje, setMensaje] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  useEffect(() => {
    if (!token) return undefined;

    let vivo = true;

    async function verificar() {
      try {
        const datos = await authService.verificarCorreo(token);
        if (!vivo) return;
        setEstado("verificado");
        setMensaje(datos.message || "Correo verificado correctamente.");
        // Si el enlace lo abre la misma persona que tiene la sesión abierta,
        // se refresca su usuario para que la interfaz lo refleje enseguida.
        if (datos.usuario && usuario?.id_usuario === datos.usuario.id_usuario) {
          actualizarUsuario(datos.usuario);
        }
      } catch (error) {
        if (!vivo) return;
        setEstado("error");
        setMensaje(error.message || "No se pudo verificar el correo.");
      }
    }

    verificar();
    return () => {
      vivo = false;
    };
    // Solo depende del token: no se debe repetir al refrescar el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleReenviar = async () => {
    if (!usuario?.email) return;
    setReenviando(true);
    try {
      await authService.reenviarVerificacion(usuario.email);
      setReenviado(true);
    } catch {
      setReenviado(true); // La respuesta es siempre la misma, por privacidad
    } finally {
      setReenviando(false);
    }
  };

  const contenido = {
    verificando: {
      icono: "refrescar",
      clase: "border-white/20 text-white/60",
      titulo: "Verificando tu correo...",
      texto: "Un momento, estamos confirmando el enlace.",
    },
    verificado: {
      icono: "checkCirculo",
      clase: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
      titulo: "Correo verificado",
      texto: mensaje,
    },
    error: {
      icono: "error",
      clase: "border-brand-500/40 bg-brand-500/10 text-brand-500",
      titulo: "No pudimos verificar el enlace",
      texto: mensaje,
    },
    "sin-token": {
      icono: "alerta",
      clase: "border-amber-500/40 bg-amber-500/10 text-amber-400",
      titulo: "Falta el enlace de verificación",
      texto: "Abre el enlace tal como llegó al correo, sin recortarlo.",
    },
  }[estado];

  return (
    <div className="relative flex min-h-[calc(100vh-var(--altura-header))] items-center justify-center bg-black px-4 py-16">
      <div className="malla-tecnica pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md border border-white/10 bg-dark-900 p-8 text-center">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center border ${contenido.clase}`}
        >
          <Icon
            name={contenido.icono}
            className={`h-7 w-7 ${
              estado === "verificando" ? "animate-[girar_1s_linear_infinite]" : ""
            }`}
          />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-white">{contenido.titulo}</h1>
        <p className="mb-6 text-sm leading-relaxed text-white/55">{contenido.texto}</p>

        {estado === "verificado" && (
          <div className="space-y-3">
            <Button to={usuario ? "/cliente" : "/login"} fullWidth size="lg">
              {usuario ? "Ir a mi cuenta" : "Iniciar sesión"}
            </Button>
            <Button to="/productos" variant="secondary" fullWidth>
              Ver el catálogo
            </Button>
          </div>
        )}

        {(estado === "error" || estado === "sin-token") && (
          <div className="space-y-3">
            {reenviado ? (
              <Alert tipo="exito">
                Si tu cuenta aún no está confirmada, acabamos de enviarte un enlace nuevo.
              </Alert>
            ) : (
              usuario && (
                <Button
                  fullWidth
                  size="lg"
                  cargando={reenviando}
                  onClick={handleReenviar}
                  icono="sobre"
                >
                  Enviarme un enlace nuevo
                </Button>
              )
            )}
            <Button to="/login" variant="secondary" fullWidth>
              Volver al inicio de sesión
            </Button>
          </div>
        )}

        <p className="mt-6 border-t border-white/10 pt-4 text-xs text-white/35">
          ¿Necesitas ayuda?{" "}
          <Link to="/contacto" className="font-semibold text-brand-500 hover:underline">
            Escríbenos
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default VerificarCorreo;
