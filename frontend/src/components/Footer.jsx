import { Link } from "react-router-dom";

import logo from "../assets/images/logo.png";
import Icon from "./ui/Icon";

const NAVEGACION = [
  { to: "/", label: "Inicio" },
  { to: "/productos", label: "Productos" },
  { to: "/servicios", label: "Servicios técnicos" },
  { to: "/quienes-somos", label: "¿Quiénes somos?" },
  { to: "/contacto", label: "Contacto" },
];

const CATEGORIAS = [
  { to: "/productos?categoria=1", label: "Smartphones" },
  { to: "/productos?categoria=2", label: "Accesorios" },
  { to: "/productos?categoria=3", label: "Audio" },
  { to: "/productos?categoria=4", label: "Smartwatch" },
  { to: "/productos?categoria=5", label: "Tablets" },
];

const POLITICAS = [
  { to: "/politicas/garantias", label: "Política de garantías" },
  { to: "/politicas/envios", label: "Envíos y entregas" },
  { to: "/politicas/terminos", label: "Términos y condiciones" },
  { to: "/politicas/privacidad", label: "Política de privacidad" },
  { to: "/politicas/soporte", label: "Centro de soporte" },
];

const REDES = [
  {
    nombre: "Facebook",
    href: "https://facebook.com",
    d: "M13.5 9H15V6.5h-1.5C11.6 6.5 10.5 7.6 10.5 9.5V11H9v2.5h1.5V19H13v-5.5h1.8l.3-2.5H13V9.7c0-.5.1-.7.7-.7Z",
  },
  {
    nombre: "Instagram",
    href: "https://instagram.com",
    d: "M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm0 6.27a2.47 2.47 0 1 1 0-4.94 2.47 2.47 0 0 1 0 4.94ZM16.9 5H7.1A2.1 2.1 0 0 0 5 7.1v9.8A2.1 2.1 0 0 0 7.1 19h9.8a2.1 2.1 0 0 0 2.1-2.1V7.1A2.1 2.1 0 0 0 16.9 5Zm.86 11.9c0 .48-.39.86-.86.86H7.1a.86.86 0 0 1-.86-.86V7.1c0-.47.39-.86.86-.86h9.8c.47 0 .86.39.86.86v9.8ZM16.94 7.6a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0Z",
  },
  {
    nombre: "X (Twitter)",
    href: "https://x.com",
    d: "M13.6 10.6 19.9 4h-1.5l-5.5 5.7L8.5 4H4l6.6 8.9L4 20h1.5l5.8-6 4.6 6H20l-6.4-9.4Zm-2.1 2.4-.7-.9L6 5.3h2.1l4.3 5.8.7.9 5.6 7.6h-2.1l-4.6-6.6Z",
  },
  {
    nombre: "TikTok",
    href: "https://tiktok.com",
    d: "M16.5 4c.3 2 1.7 3.5 3.7 3.8v2.5c-1.3 0-2.6-.4-3.7-1.1v6.1a5.7 5.7 0 1 1-5.7-5.7c.2 0 .4 0 .6.02v2.6a3.1 3.1 0 1 0 2.2 3v-11.2h2.9Z",
  },
];

const GARANTIAS = [
  { icono: "camion", titulo: "Envío gratis", texto: "En compras desde $1.500.000" },
  { icono: "escudo", titulo: "Garantía real", texto: "12 meses en todos los equipos" },
  { icono: "refrescar", titulo: "Cambios fáciles", texto: "5 días para cambiar tu equipo" },
  { icono: "candado", titulo: "Compra segura", texto: "Tus datos siempre protegidos" },
];

const MEDIOS_PAGO = [
  { nombre: "Contra entrega", icono: "billete" },
  { nombre: "Transferencia", icono: "tarjeta" },
  { nombre: "Efectivo en tienda", icono: "caja" },
];

function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-black text-white/70">
      {/* Franja de garantías */}
      <div className="border-b border-white/10 bg-dark-900">
        <div className="mx-auto grid w-[94%] max-w-7xl grid-cols-2 gap-4 py-8 lg:grid-cols-4">
          {GARANTIAS.map((item) => (
            <div key={item.titulo} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-brand-500/12 text-brand-500">
                <Icon name={item.icono} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{item.titulo}</p>
                <p className="text-xs leading-snug text-white/50">{item.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columnas principales */}
      <div className="mx-auto grid w-[94%] max-w-7xl grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link to="/" className="mb-5 inline-block" aria-label="PhoneStore, ir al inicio">
            <img src={logo} alt="PhoneStore" className="h-14 w-auto object-contain" />
          </Link>
          <p className="mb-5 max-w-sm text-sm leading-relaxed text-white/50">
            Tu tienda de confianza para celulares, accesorios y servicio técnico
            especializado. Equipos originales, garantía escrita y atención cercana
            en cada compra desde 2019.
          </p>

          <div className="mb-5 flex gap-2">
            {REDES.map((red) => (
              <a
                key={red.nombre}
                href={red.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={red.nombre}
                className="flex h-9 w-9 items-center justify-center border border-white/15 text-white/80 transition-all duration-200 hover:-translate-y-1 hover:border-brand-500 hover:bg-brand-500 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d={red.d} />
                </svg>
              </a>
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/35">
              Medios de pago
            </p>
            <div className="flex flex-wrap gap-2">
              {MEDIOS_PAGO.map((medio) => (
                <span
                  key={medio.nombre}
                  className="flex items-center gap-1.5 border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70"
                >
                  <Icon name={medio.icono} className="h-3.5 w-3.5 text-brand-500" />
                  {medio.nombre}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
            Navegación
          </h4>
          <ul className="space-y-2.5 text-sm">
            {NAVEGACION.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="inline-flex items-center text-white/50 transition-all duration-200 hover:translate-x-1 hover:text-brand-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
            Categorías
          </h4>
          <ul className="space-y-2.5 text-sm">
            {CATEGORIAS.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="inline-flex items-center text-white/50 transition-all duration-200 hover:translate-x-1 hover:text-brand-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <h4 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wider text-white">
            Legal
          </h4>
          <ul className="space-y-2.5 text-sm">
            {POLITICAS.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="inline-flex items-center text-white/50 transition-all duration-200 hover:translate-x-1 hover:text-brand-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
            Contáctanos
          </h4>
          <ul className="space-y-3 text-sm text-white/50">
            <li className="flex items-start gap-2.5">
              <Icon name="ubicacion" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>Calle 45 #12-34, Medellín, Antioquia, Colombia</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="llamada" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <a href="tel:+573147728502" className="transition-colors hover:text-brand-500">
                +57 314 772 8502
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="sobre" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <a
                href="mailto:contacto@phonestore.com"
                className="break-all transition-colors hover:text-brand-500"
              >
                contacto@phonestore.com
              </a>
            </li>
          </ul>

          <h4 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-white">
            Horario
          </h4>
          <p className="text-sm text-white/50">Lunes a viernes: 8:00 a.m. – 6:00 p.m.</p>
          <p className="text-sm text-white/50">Sábados: 9:00 a.m. – 2:00 p.m.</p>
          <p className="text-sm text-white/35">Domingos y festivos: cerrado</p>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-[94%] max-w-7xl flex-col items-center justify-between gap-3 py-5 text-center text-sm text-white/50 sm:flex-row sm:text-left">
          <p>
            © {anio} Phone<span className="text-brand-500">Store</span>. Todos los derechos
            reservados.
          </p>
          <p className="text-xs text-white/35">
            Proyecto académico SENA · Ficha 3406211 · React + Vite + FastAPI + MySQL
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
