import { Link, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";

const SUGERENCIAS = [
  { to: "/productos", icono: "caja", label: "Ver el catálogo" },
  { to: "/servicios", icono: "herramienta", label: "Servicios técnicos" },
  { to: "/contacto", icono: "chat", label: "Escríbenos" },
];

/** Página 404 con salidas útiles en lugar de un callejón sin salida. */
function NoEncontrada() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-[70vh] w-[94%] max-w-2xl flex-col items-center justify-center py-16 text-center">
      <span className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-500">
        <Icon name="buscar" className="h-12 w-12" strokeWidth={1.2} />
      </span>

      <p className="mb-2 text-6xl font-bold tracking-tight text-white/70">404</p>
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        No encontramos esta página
      </h1>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-white/50 sm:text-base">
        Puede que el enlace esté mal escrito o que el contenido ya no exista. Te dejamos
        algunos atajos para seguir navegando.
      </p>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <Button to="/" icono="flechaIzquierda">
          Ir al inicio
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Volver atrás
        </Button>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {SUGERENCIAS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-dark-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-lg"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-dark-800 text-white/50 transition-colors group-hover:bg-brand-500 group-hover:text-white">
              <Icon name={s.icono} className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-white/80">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default NoEncontrada;
