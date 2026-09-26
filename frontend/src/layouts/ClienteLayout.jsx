import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/images/logo.png";

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
 * Entorno propio, separado de la tienda pública (igual que el panel
 * administrativo): barra lateral fija, sin encabezado ni pie de la parte
 * pública. "Ir a la tienda" es ahora una acción explícita del menú, no
 * algo que ya está puesto encima.
 */
function ClienteLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarMovil, setSidebarMovil] = useState(false);

  // Cierra el menú móvil al cambiar de sección.
  const [rutaAnterior, setRutaAnterior] = useState(location.pathname);
  if (rutaAnterior !== location.pathname) {
    setRutaAnterior(location.pathname);
    setSidebarMovil(false);
  }

  const cerrarSesion = () => {
    logout();
    navigate("/", { replace: true });
  };

  const barraLateral = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <img src={logo} alt="PhoneStore" className="h-9 w-auto shrink-0 object-contain" />
        <div className="min-w-0 border-l border-white/10 pl-3">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
            Mi cuenta
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold text-white">
          {(usuario?.nombre || "?").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">Hola, {usuario?.nombre}</p>
          <p className="truncate text-xs text-white/40">{usuario?.email}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Secciones de mi cuenta">
        <ul className="space-y-0.5">
          {SECCIONES.map((seccion) => (
            <li key={seccion.to}>
              <NavLink
                to={seccion.to}
                end={seccion.exacto}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-brand-500/15 text-brand-300 shadow-[inset_2px_0_0_0] shadow-brand-400"
                      : "text-white/40 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon name={seccion.icono} className="h-4.5 w-4.5 shrink-0" />
                <span className="flex-1 truncate">{seccion.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/40 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Icon name="carrito" className="h-4.5 w-4.5" />
          Ir a la tienda
        </Link>
        <button
          onClick={cerrarSesion}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10"
        >
          <Icon name="salir" className="h-4.5 w-4.5" />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-dark-800">
      {/* Barra lateral fija (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-dark-900 lg:flex">
        {barraLateral}
      </aside>

      {/* Barra lateral (móvil) */}
      <div
        onClick={() => setSidebarMovil(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-dark-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          sidebarMovil ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal={sidebarMovil}
        aria-label="Secciones de mi cuenta"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-dark-900 transition-transform duration-300 ease-out lg:hidden ${
          sidebarMovil ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {barraLateral}
      </aside>

      {/* Contenido */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/10 bg-dark-900/95 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setSidebarMovil(true)}
            aria-label="Abrir menú"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">
            Mi cuenta · PhoneStore
          </p>

          <Link
            to="/"
            className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/60 transition-colors hover:border-white/20 hover:text-white sm:flex"
          >
            <Icon name="carrito" className="h-4 w-4" />
            Ir a la tienda
          </Link>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ClienteLayout;
