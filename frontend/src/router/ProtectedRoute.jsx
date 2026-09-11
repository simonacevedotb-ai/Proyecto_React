import { Navigate, useLocation } from "react-router-dom";

import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";

/**
 * Protege una ruta en el Frontend.
 *
 * - Sin sesión, manda al login recordando a dónde quería ir el usuario.
 * - Con sesión pero sin el rol adecuado, muestra un aviso claro en lugar
 *   de dejar la pantalla en blanco.
 *
 * IMPORTANTE: esto es solo comodidad para el usuario. La autorización
 * real la hace el backend en cada petición (app/auth.py -> require_role):
 * aunque alguien escriba /admin en la barra del navegador, la API no le
 * devolverá ni un solo dato sin el rol correcto.
 */
function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, rol, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-white/50">
        <span className="h-8 w-8 animate-[girar_.7s_linear_infinite] rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm">Verificando tu sesión...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(rol)) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-[94%] max-w-lg flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/12 text-rose-400">
          <Icon name="candado" className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Acceso restringido</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-white/50">
            Tu cuenta tiene el rol <strong className="capitalize">{rol}</strong>, que no
            tiene permiso para entrar a esta sección. Si crees que es un error, contacta
            al administrador de la tienda.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-600"
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
