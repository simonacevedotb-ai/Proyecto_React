import { NavLink, Outlet, useNavigate } from "react-router-dom";

import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";

const SECCIONES = [
  { to: "/cliente", label: "Resumen", icono: "panel", exacto: true },
  { to: "/cliente/pedidos", label: "Mis pedidos", icono: "recibo" },
  { to: "/cliente/facturas", label: "Mis facturas", icono: "recibo" },
  { to: "/cliente/solicitudes", label: "Mis solicitudes", icono: "herramienta" },
  { to: "/cliente/pqr", label: "Mis PQR", icono: "chat" },
  { to: "/cliente/perfil", label: "Mi perfil", icono: "usuario" },
];

/**
 * Área privada del cliente.
 *
 * Conserva el encabezado y el pie de la tienda (a diferencia del panel
 * administrativo, que tiene su propio entorno) porque el cliente sigue
 * comprando mientras consulta su cuenta.
 */
function ClienteLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const cerrarSesion = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="bg-dark-900 pb-16">
      {/* Encabezado de la cuenta */}
      <div className="bg-gradient-to-r from-dark-900 to-dark-800 py-8">
        <div className="mx-auto flex w-[94%] max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white">
              {(usuario?.nombre || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-white sm:text-2xl">
                Hola, {usuario?.nombre}
              </h1>
              <p className="truncate text-sm text-white/40">{usuario?.email}</p>
            </div>
          </div>

          <button
            onClick={cerrarSesion}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 sm:self-auto"
          >
            <Icon name="salir" className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="mx-auto w-[94%] max-w-7xl py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Menú de la cuenta */}
          <aside className="lg:w-60 lg:shrink-0">
            <nav
              aria-label="Secciones de mi cuenta"
              className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-dark-900 p-2 scroll-oculto lg:sticky lg:top-[calc(var(--altura-header)+16px)] lg:flex-col lg:overflow-visible lg:p-3"
            >
              {SECCIONES.map((seccion) => (
                <NavLink
                  key={seccion.to}
                  to={seccion.to}
                  end={seccion.exacto}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-brand-500/10 text-brand-500"
                        : "text-white/60 hover:bg-white/10"
                    }`
                  }
                >
                  <Icon name={seccion.icono} className="h-4 w-4" />
                  {seccion.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default ClienteLayout;
