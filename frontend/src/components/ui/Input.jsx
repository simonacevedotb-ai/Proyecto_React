import { useState } from "react";

import Icon from "./Icon";

const claseBase = `
  w-full rounded-xl border bg-dark-900 px-4 py-3 text-sm text-white
  outline-none transition-all duration-200 placeholder:text-white/40
  focus:ring-4 disabled:cursor-not-allowed disabled:bg-dark-900 disabled:text-white/40
`;

function clasesEstado(error) {
  return error
    ? "border-rose-500/40 focus:border-rose-500 focus:ring-rose-500/25"
    : "border-white/10 hover:border-white/20 focus:border-brand-500 focus:ring-brand-500/25";
}

/**
 * Campo de formulario con etiqueta, ayuda y mensaje de error.
 *
 * Para las contraseñas incluye un botón de "mostrar/ocultar", que evita
 * errores de escritura sin sacrificar la privacidad.
 */
function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder,
  maxLength,
  min,
  max,
  step,
  required = false,
  disabled = false,
  autoComplete,
  icono,
  className = "",
}) {
  const [verPassword, setVerPassword] = useState(false);
  const esPassword = type === "password";
  const tipoReal = esPassword && verPassword ? "text" : type;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-sm font-semibold text-white/80"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        {icono && (
          <Icon
            name={icono}
            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/40"
          />
        )}

        <input
          id={name}
          name={name}
          type={tipoReal}
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
          className={`${claseBase} ${clasesEstado(error)} ${icono ? "pl-11" : ""} ${
            esPassword ? "pr-11" : ""
          }`}
        />

        {esPassword && (
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/60"
          >
            <Icon name={verPassword ? "ojo" : "candado"} className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {error ? (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-400 animate-[fadeIn_.2s_ease-out]"
        >
          <Icon name="error" className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="mt-1.5 text-xs text-white/40">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export default Input;
