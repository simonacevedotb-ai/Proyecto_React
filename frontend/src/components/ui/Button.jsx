import { Link } from "react-router-dom";

import Icon from "./Icon";

const variantes = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 hover:shadow-glow focus-visible:ring-brand-500 disabled:bg-brand-800",
  secondary:
    "bg-transparent text-white border border-white/25 hover:border-brand-500 hover:text-brand-500 focus-visible:ring-brand-500",
  oscuro:
    "bg-dark-800 text-white border border-white/10 hover:border-brand-500 hover:bg-dark-700 focus-visible:ring-brand-500",
  acento:
    "bg-white text-black hover:bg-white/85 focus-visible:ring-white",
  ghost:
    "bg-transparent text-white/65 hover:bg-white/5 hover:text-white focus-visible:ring-white/40",
  outline:
    "bg-transparent text-white border border-white/40 hover:bg-white/10 hover:border-white focus-visible:ring-white",
  danger:
    "bg-brand-700 text-white hover:bg-brand-600 focus-visible:ring-brand-500 disabled:bg-brand-900",
};

const tamanos = {
  sm: "px-3.5 py-2 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-7 py-3.5 text-base gap-2.5",
};

/**
 * Botón de la aplicación.
 *
 * - `cargando` muestra un spinner y bloquea el clic, para que el usuario
 *   sepa que la acción está en curso y no la dispare dos veces.
 * - `to` / `href` lo convierten en enlace conservando el mismo estilo.
 */
function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  cargando = false,
  icono,
  iconoDerecha,
  onClick,
  to,
  href,
  className = "",
  ...props
}) {
  const bloqueado = disabled || cargando;

  const clases = `
    inline-flex items-center justify-center font-bold uppercase tracking-wide
    transition-all duration-200 ease-out
    hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black
    disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0
    ${fullWidth ? "w-full" : ""}
    ${tamanos[size] || tamanos.md}
    ${variantes[variant] || variantes.primary}
    ${className}
  `;

  const contenido = (
    <>
      {cargando ? (
        <span
          className="h-4 w-4 shrink-0 animate-[girar_.7s_linear_infinite] rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        icono && <Icon name={icono} className="h-4 w-4 shrink-0" />
      )}
      <span>{children}</span>
      {iconoDerecha && !cargando && (
        <Icon name={iconoDerecha} className="h-4 w-4 shrink-0" />
      )}
    </>
  );

  if (to && !bloqueado) {
    return (
      <Link to={to} className={clases} {...props}>
        {contenido}
      </Link>
    );
  }

  if (href && !bloqueado) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={clases}
        {...props}
      >
        {contenido}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={bloqueado}
      aria-busy={cargando}
      className={clases}
      {...props}
    >
      {contenido}
    </button>
  );
}

export default Button;
