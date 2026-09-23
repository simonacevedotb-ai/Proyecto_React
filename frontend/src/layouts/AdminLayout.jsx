import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/images/logo.png";
import { contactoService } from "../services/contactoService";
import { inventarioService } from "../services/inventarioService";
import { pqrService } from "../services/pqrService";
import { solicitudService } from "../services/solicitudService";
import { ventaService } from "../services/ventaService";

/**
 * Entorno del panel administrativo.
 *
 * Es deliberadamente distinto de la tienda: barra lateral oscura fija,
 * cabecera propia con buscador de secciones y notificaciones, y sin el
 * encabezado ni el pie de la parte pública. Así el administrador sabe
 * siempre que está trabajando "detrás del mostrador".
 *
 * El menú se arma según el rol: el empleado no ve la gestión de
 * usuarios ni la configuración, y el backend además rechaza esas
 * operaciones aunque alguien escriba la URL a mano.
 */
const MENU = [
  {
    grupo: "General",
    items: [
      { to: "/admin", label: "Dashboard", icono: "panel", exacto: true },
      { to: "/admin/reportes", label: "Reportes", icono: "grafico" },
    ],
  },
  {
    grupo: "Catálogo",
    items: [
      { to: "/admin/productos", label: "Productos", icono: "caja" },
      { to: "/admin/categorias", label: "Categorías", icono: "cuadricula" },
      { to: "/admin/servicios", label: "Servicios", icono: "herramienta" },
      { to: "/admin/inventario", label: "Inventario", icono: "almacen" },
    ],
  },
  {
    grupo: "Operación",
    items: [
      { to: "/admin/ventas", label: "Pedidos y ventas", icono: "recibo", contador: "pedidos" },
      { to: "/admin/facturas", label: "Facturación", icono: "billete" },
      { to: "/admin/solicitudes", label: "Solicitudes", icono: "documento", contador: "solicitudes" },
      { to: "/admin/pqr", label: "PQR", icono: "chat", contador: "pqr" },
      { to: "/admin/mensajes", label: "Mensajes", icono: "sobre", contador: "mensajes" },
    ],
  },
  {
    grupo: "Administración",
    soloAdmin: true,
    items: [
      { to: "/admin/usuarios", label: "Usuarios", icono: "usuarios" },
      { to: "/admin/configuracion", label: "Configuración", icono: "engranaje" },
    ],
  },
];

function AdminLayout() {
  const { usuario, rol, esAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarMovil, setSidebarMovil] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [contadores, setContadores] = useState({
    pedidos: 0,
    solicitudes: 0,
    mensajes: 0,
    pqr: 0,
    stockBajo: 0,
    agotados: 0,
  });

  const refUsuario = useRef(null);
  const refNotificaciones = useRef(null);

  // Contadores de pendientes para la barra lateral y las notificaciones
  useEffect(() => {
    let activo = true;

    async function cargarContadores() {
      const [ventas, solicitudes, mensajes, alertas, pqr] = await Promise.all([
        ventaService.listar({ estado: "pendiente", limite: 1 }).catch(() => null),
        solicitudService.listar({ estado: "pendiente", limite: 1 }).catch(() => null),
        contactoService.listar({ estado: "nuevo", limite: 1 }).catch(() => null),
        inventarioService.alertas().catch(() => null),
        pqrService.listar({ estado: "pendiente", limite: 1 }).catch(() => null),
      ]);

      if (!activo) return;
      setContadores({
        pedidos: ventas?.paginacion?.total || 0,
        solicitudes: solicitudes?.paginacion?.total || 0,
        mensajes: mensajes?.paginacion?.total || 0,
        pqr: pqr?.paginacion?.total || 0,
        stockBajo: alertas?.totales?.stock_bajo || 0,
        agotados: alertas?.totales?.agotados || 0,
      });
    }

    cargarContadores();
    return () => {
      activo = false;
    };
  }, [location.pathname]);

  // Cierra los menús al navegar, ajustando el estado durante el render
  // (patrón de React para reaccionar a un cambio de valor sin un efecto).
  const [rutaAnterior, setRutaAnterior] = useState(location.pathname);
  if (rutaAnterior !== location.pathname) {
    setRutaAnterior(location.pathname);
    setSidebarMovil(false);
    setMenuUsuario(false);
    setNotificacionesAbiertas(false);
  }

  useEffect(() => {
    const alHacerClic = (e) => {
      if (refUsuario.current && !refUsuario.current.contains(e.target)) setMenuUsuario(false);
      if (refNotificaciones.current && !refNotificaciones.current.contains(e.target)) {
        setNotificacionesAbiertas(false);
      }
    };
    document.addEventListener("mousedown", alHacerClic);
    return () => document.removeEventListener("mousedown", alHacerClic);
  }, []);

  const cerrarSesion = () => {
    logout();
    navigate("/", { replace: true });
  };

  const notificaciones = [
    contadores.pedidos > 0 && {
      icono: "recibo",
      color: "text-amber-400 bg-amber-500/12",
      texto: `${contadores.pedidos} pedido(s) pendiente(s) por confirmar`,
      to: "/admin/ventas?estado=pendiente",
    },
    contadores.solicitudes > 0 && {
      icono: "documento",
      color: "text-sky-400 bg-sky-500/12",
      texto: `${contadores.solicitudes} solicitud(es) de servicio sin atender`,
      to: "/admin/solicitudes?estado=pendiente",
    },
    contadores.mensajes > 0 && {
      icono: "sobre",
      color: "text-brand-500 bg-brand-500/10",
      texto: `${contadores.mensajes} mensaje(s) de contacto sin leer`,
      to: "/admin/mensajes?estado=nuevo",
    },
    contadores.agotados > 0 && {
      icono: "alerta",
      color: "text-rose-400 bg-rose-500/12",
      texto: `${contadores.agotados} producto(s) agotado(s)`,
      to: "/admin/inventario",
    },
    contadores.stockBajo > 0 && {
      icono: "almacen",
      color: "text-amber-400 bg-amber-500/12",
      texto: `${contadores.stockBajo} producto(s) con stock bajo`,
      to: "/admin/inventario",
    },
  ].filter(Boolean);

  const menuVisible = MENU.filter((grupo) => !grupo.soloAdmin || esAdmin);

  const barraLateral = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
        <img src={logo} alt="PhoneStore" className="h-9 w-auto shrink-0 object-contain" />
        <div className="min-w-0 border-l border-white/10 pl-3">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
            Panel {esAdmin ? "administrativo" : "de trabajo"}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menú administrativo">
        {menuVisible.map((grupo) => (
          <div key={grupo.grupo} className="mb-5 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
              {grupo.grupo}
            </p>
            <ul className="space-y-0.5">
              {grupo.items.map((item) => {
                const pendientes = item.contador ? contadores[item.contador] : 0;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.exacto}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                          isActive
                            ? "bg-brand-500/15 text-brand-300 shadow-[inset_2px_0_0_0] shadow-brand-400"
                            : "text-white/40 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      <Icon name={item.icono} className="h-4.5 w-4.5 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {pendientes > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
                          {pendientes > 99 ? "99+" : pendientes}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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
        aria-label="Menú administrativo"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-dark-900 transition-transform duration-300 ease-out lg:hidden ${
          sidebarMovil ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {barraLateral}
      </aside>

      {/* Contenido */}
      <div className="lg:pl-64">
        {/* Cabecera administrativa */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/10 bg-dark-900/95 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setSidebarMovil(true)}
            aria-label="Abrir menú"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">
              {esAdmin ? "Administración" : "Operación"} · PhoneStore
            </p>
            <p className="hidden truncate text-xs text-white/40 sm:block">
              {new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Notificaciones */}
          <div ref={refNotificaciones} className="relative">
            <button
              onClick={() => setNotificacionesAbiertas((v) => !v)}
              aria-label={`Notificaciones (${notificaciones.length})`}
              aria-expanded={notificacionesAbiertas}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10"
            >
              <Icon name="campana" className="h-5 w-5" />
              {notificaciones.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {notificaciones.length}
                </span>
              )}
            </button>

            {notificacionesAbiertas && (
              <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl bg-dark-900 shadow-2xl ring-1 ring-slate-900/5 animate-[fadeIn_.18s_ease-out]">
                <div className="border-b border-white/10 bg-dark-900 px-4 py-3">
                  <p className="text-sm font-bold text-white">Pendientes por atender</p>
                </div>

                {notificaciones.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Icon
                      name="checkCirculo"
                      className="mx-auto mb-2 h-8 w-8 text-emerald-500"
                    />
                    <p className="text-sm font-semibold text-white/80">Todo al día</p>
                    <p className="text-xs text-white/50">
                      No hay pedidos, solicitudes ni mensajes sin atender.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-80 divide-y divide-white/10 overflow-y-auto">
                    {notificaciones.map((n, i) => (
                      <li key={i}>
                        <Link
                          to={n.to}
                          className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.color}`}
                          >
                            <Icon name={n.icono} className="h-4 w-4" />
                          </span>
                          <p className="text-sm leading-snug text-white/80">{n.texto}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Usuario */}
          <div ref={refUsuario} className="relative">
            <button
              onClick={() => setMenuUsuario((v) => !v)}
              aria-expanded={menuUsuario}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-white/10"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                {(usuario?.nombre || "?").charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[8rem] truncate text-xs font-bold text-white">
                  {usuario?.nombre} {usuario?.apellido}
                </span>
                <span className="block text-[10px] capitalize text-white/40">{rol}</span>
              </span>
              <Icon name="chevronAbajo" className="hidden h-3.5 w-3.5 text-white/40 sm:block" />
            </button>

            {menuUsuario && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl bg-dark-900 shadow-2xl ring-1 ring-slate-900/5 animate-[fadeIn_.18s_ease-out]"
              >
                <div className="border-b border-white/10 bg-dark-900 px-4 py-3">
                  <p className="truncate text-sm font-bold text-white">
                    {usuario?.nombre} {usuario?.apellido}
                  </p>
                  <p className="truncate text-xs text-white/50">{usuario?.email}</p>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/admin/configuracion"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                  >
                    <Icon name="engranaje" className="h-4 w-4" />
                    Mi cuenta y ajustes
                  </Link>
                  <Link
                    to="/"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                  >
                    <Icon name="carrito" className="h-4 w-4" />
                    Ver la tienda
                  </Link>
                  <button
                    onClick={cerrarSesion}
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/12"
                  >
                    <Icon name="salir" className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
