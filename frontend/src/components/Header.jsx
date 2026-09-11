import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import logo from "../assets/images/logo.png";
import Icon from "./ui/Icon";

const ENLACES = [
  { to: "/", label: "Inicio" },
  { to: "/productos", label: "Productos" },
  { to: "/servicios", label: "Servicios" },
  { to: "/quienes-somos", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
];

const AVISOS = [
  { texto: "Envío gratis en compras desde $1.500.000", to: "/productos" },
  { texto: "Garantía de 12 meses en todos los equipos", to: "/quienes-somos" },
  { texto: "Servicio técnico propio: agenda en línea", to: "/servicios" },
];

const RUTA_PANEL_POR_ROL = {
  administrador: "/admin",
  empleado: "/admin",
  cliente: "/cliente",
};

const ETIQUETA_PANEL = {
  administrador: "Panel administrativo",
  empleado: "Panel de trabajo",
  cliente: "Mi cuenta",
};

/**
 * Encabezado fijo de la tienda.
 *
 * Dos franjas: una barra roja de avisos que rota mensajes y la barra
 * principal negra con el logo al centro, la navegación a la izquierda y
 * las acciones a la derecha.
 *
 * El contenido nunca queda tapado: la clase `.con-header-fijo` reserva
 * la altura de las dos franjas.
 */
function Header() {
  const { isAuthenticated, usuario, rol, logout } = useAuth();
  const { totalUnidades, alternarCarrito } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado inicial calculado una sola vez: si la página se abre ya
  // desplazada (al volver atrás, por ejemplo), arranca compacto.
  const [compacto, setCompacto] = useState(() => window.scrollY > 24);
  const [menuMovil, setMenuMovil] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [aviso, setAviso] = useState(0);

  const refUsuario = useRef(null);
  const refBuscador = useRef(null);

  useEffect(() => {
    const alHacerScroll = () => setCompacto(window.scrollY > 24);
    window.addEventListener("scroll", alHacerScroll, { passive: true });
    return () => window.removeEventListener("scroll", alHacerScroll);
  }, []);

  // Rotación automática de los avisos
  useEffect(() => {
    const temporizador = setInterval(
      () => setAviso((previo) => (previo + 1) % AVISOS.length),
      5000
    );
    return () => clearInterval(temporizador);
  }, []);

  // Cierra los menús al cambiar de página. Se ajusta durante el render
  // (patrón recomendado por React para "reaccionar a un cambio de valor"),
  // no en un efecto: así no hay un render extra en cada navegación.
  const [rutaAnterior, setRutaAnterior] = useState(location.pathname);
  if (rutaAnterior !== location.pathname) {
    setRutaAnterior(location.pathname);
    setMenuMovil(false);
    setMenuUsuario(false);
    setBuscadorAbierto(false);
  }

  // Bloquea el scroll del fondo cuando el menú móvil está abierto
  useEffect(() => {
    document.body.style.overflow = menuMovil ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuMovil]);

  // Cierra el menú de usuario / buscador al hacer clic fuera o pulsar ESC
  useEffect(() => {
    const alHacerClic = (e) => {
      if (refUsuario.current && !refUsuario.current.contains(e.target)) {
        setMenuUsuario(false);
      }
      if (refBuscador.current && !refBuscador.current.contains(e.target)) {
        setBuscadorAbierto(false);
      }
    };
    const alPulsar = (e) => {
      if (e.key === "Escape") {
        setMenuUsuario(false);
        setBuscadorAbierto(false);
        setMenuMovil(false);
      }
    };
    document.addEventListener("mousedown", alHacerClic);
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("mousedown", alHacerClic);
      document.removeEventListener("keydown", alPulsar);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setMenuUsuario(false);
    setMenuMovil(false);
    navigate("/", { replace: true });
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    const termino = busqueda.trim();
    navigate(termino ? `/productos?buscar=${encodeURIComponent(termino)}` : "/productos");
    setBusqueda("");
    setBuscadorAbierto(false);
    setMenuMovil(false);
  };

  const claseEnlace = ({ isActive }) =>
    `relative px-3 py-2 text-[13px] font-medium uppercase tracking-wide transition-colors
     duration-200 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px]
     after:origin-left after:scale-x-0 after:bg-brand-500 after:transition-transform
     after:duration-300 hover:after:scale-x-100 ${
       isActive ? "text-white after:scale-x-100" : "text-white/60 hover:text-white"
     }`;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[60]">
        {/* ---------- Barra de avisos ---------- */}
        <div className="h-9 overflow-hidden bg-brand-500">
          <div className="mx-auto flex h-full w-[94%] max-w-7xl items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setAviso((p) => (p - 1 + AVISOS.length) % AVISOS.length)}
              aria-label="Aviso anterior"
              className="hidden shrink-0 text-white/70 transition-colors hover:text-white sm:block"
            >
              <Icon name="chevronIzquierda" className="h-3.5 w-3.5" />
            </button>

            <Link
              key={aviso}
              to={AVISOS[aviso].to}
              className="truncate text-center text-[12px] font-medium text-white animate-[fadeIn_.4s_ease-out] hover:underline"
            >
              {AVISOS[aviso].texto}
            </Link>

            <button
              type="button"
              onClick={() => setAviso((p) => (p + 1) % AVISOS.length)}
              aria-label="Siguiente aviso"
              className="hidden shrink-0 text-white/70 transition-colors hover:text-white sm:block"
            >
              <Icon name="chevronDerecha" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ---------- Barra principal ---------- */}
        <div
          className={`border-b transition-colors duration-300 ${
            compacto
              ? "border-white/10 bg-black/95 backdrop-blur-md"
              : "border-transparent bg-black"
          }`}
        >
          <div className="mx-auto flex h-16 w-[94%] max-w-7xl items-center justify-between gap-3">
            {/* Menú móvil + navegación de escritorio */}
            <div className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => setMenuMovil(true)}
                aria-label="Abrir menú"
                aria-expanded={menuMovil}
                className="-ml-2 flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-brand-500 lg:hidden"
              >
                <Icon name="menu" className="h-6 w-6" />
              </button>

              <nav className="hidden items-center lg:flex" aria-label="Principal">
                {ENLACES.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={claseEnlace}
                    end={link.to === "/"}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Logo centrado */}
            <Link
              to="/"
              className="shrink-0 transition-transform duration-200 hover:scale-105"
              aria-label="PhoneStore, ir al inicio"
            >
              <img
                src={logo}
                alt="PhoneStore"
                className={`w-auto object-contain transition-all duration-300 ${
                  compacto ? "h-11" : "h-14"
                }`}
              />
            </Link>

            {/* Acciones */}
            <div className="flex flex-1 items-center justify-end gap-1">
              <div ref={refBuscador} className="relative hidden sm:block">
                <form onSubmit={handleBuscar} className="flex items-center">
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar..."
                    aria-label="Buscar productos"
                    onFocus={() => setBuscadorAbierto(true)}
                    className={`h-9 border border-white/15 bg-white/5 pl-3 pr-9 text-sm text-white placeholder:text-white/35 outline-none transition-all duration-300 focus:border-brand-500 ${
                      buscadorAbierto ? "w-52 xl:w-60" : "w-32 xl:w-40"
                    }`}
                  />
                  <button
                    type="submit"
                    aria-label="Buscar"
                    className="absolute right-0 flex h-9 w-9 items-center justify-center text-white/60 transition-colors hover:text-brand-500"
                  >
                    <Icon name="buscar" className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Usuario */}
              {isAuthenticated ? (
                <div ref={refUsuario} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuUsuario((v) => !v)}
                    aria-expanded={menuUsuario}
                    aria-haspopup="menu"
                    className="flex h-10 items-center gap-2 px-2 text-white transition-colors hover:text-brand-500"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                      {(usuario?.nombre || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden max-w-[6rem] truncate text-[13px] font-medium xl:inline">
                      {usuario?.nombre}
                    </span>
                  </button>

                  {menuUsuario && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-2 w-60 border border-white/10 bg-dark-900 shadow-2xl animate-[fadeIn_.18s_ease-out]"
                    >
                      <div className="border-b border-white/10 px-4 py-3">
                        <p className="truncate text-sm font-bold text-white">
                          {usuario?.nombre} {usuario?.apellido}
                        </p>
                        <p className="truncate text-xs text-white/50">{usuario?.email}</p>
                        <span className="mt-1.5 inline-block bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-500">
                          {rol}
                        </span>
                      </div>

                      <div className="p-1">
                        <Link
                          to={RUTA_PANEL_POR_ROL[rol] || "/"}
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-brand-500/10 hover:text-white"
                        >
                          <Icon name="panel" className="h-4 w-4" />
                          {ETIQUETA_PANEL[rol] || "Mi panel"}
                        </Link>
                        <Link
                          to="/cliente/pedidos"
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-brand-500/10 hover:text-white"
                        >
                          <Icon name="recibo" className="h-4 w-4" />
                          Mis pedidos
                        </Link>
                        <Link
                          to="/cliente/perfil"
                          role="menuitem"
                          className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-brand-500/10 hover:text-white"
                        >
                          <Icon name="usuario" className="h-4 w-4" />
                          Mi perfil
                        </Link>
                        <button
                          onClick={handleLogout}
                          role="menuitem"
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-brand-500 transition-colors hover:bg-brand-500/10"
                        >
                          <Icon name="salir" className="h-4 w-4" />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  aria-label="Iniciar sesión"
                  className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-brand-500"
                >
                  <Icon name="usuario" className="h-5 w-5" />
                </Link>
              )}

              {/* Carrito */}
              <button
                type="button"
                onClick={alternarCarrito}
                aria-label={`Abrir carrito (${totalUnidades} artículos)`}
                className="relative flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-brand-500"
              >
                <Icon name="carrito" className="h-5 w-5" />
                {totalUnidades > 0 && (
                  <span
                    key={totalUnidades}
                    className="absolute right-0 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white animate-[pulseBadge_.35s_ease]"
                  >
                    {totalUnidades > 99 ? "99+" : totalUnidades}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Menú móvil ---------- */}
      <div
        onClick={() => setMenuMovil(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          menuMovil ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal={menuMovil}
        aria-label="Menú de navegación"
        className={`fixed left-0 top-0 z-[66] flex h-full w-[86%] max-w-xs flex-col border-r border-white/10 bg-black transition-transform duration-300 ease-out lg:hidden ${
          menuMovil ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <img src={logo} alt="PhoneStore" className="h-10 w-auto object-contain" />
          <button
            onClick={() => setMenuMovil(false)}
            aria-label="Cerrar menú"
            className="p-2 text-white/60 transition-all hover:rotate-90 hover:text-brand-500"
          >
            <Icon name="cerrar" className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <form onSubmit={handleBuscar} className="relative">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              className="h-11 w-full border border-white/15 bg-white/5 pl-3 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white/60 hover:text-brand-500"
            >
              <Icon name="buscar" className="h-4 w-4" />
            </button>
          </form>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Menú móvil">
          {ENLACES.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-between border-l-2 px-5 py-3.5 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  isActive
                    ? "border-brand-500 bg-brand-500/10 text-white"
                    : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {link.label}
              <Icon name="chevronDerecha" className="h-4 w-4 opacity-40" />
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-white/5 px-3 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
                  {(usuario?.nombre || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {usuario?.nombre} {usuario?.apellido}
                  </p>
                  <p className="truncate text-xs capitalize text-white/45">{rol}</p>
                </div>
              </div>

              <Link
                to={RUTA_PANEL_POR_ROL[rol] || "/"}
                className="flex items-center justify-center gap-2.5 bg-brand-500 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white"
              >
                <Icon name="panel" className="h-4 w-4" />
                {ETIQUETA_PANEL[rol] || "Mi panel"}
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2.5 border border-white/20 px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:border-brand-500 hover:text-brand-500"
              >
                <Icon name="salir" className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 bg-brand-500 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white"
            >
              <Icon name="usuario" className="h-4 w-4" />
              Iniciar sesión
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

export default Header;
