import Icon from "./Icon";

/** Área de texto con contador de caracteres y mensajes de validación. */
function Textarea({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder,
  rows = 4,
  maxLength,
  required = false,
  disabled = false,
  className = "",
}) {
  const longitud = (value || "").length;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={name} className="block text-sm font-semibold text-white/80">
            {label}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
          </label>
          {maxLength && (
            <span
              className={`text-xs tabular-nums ${
                longitud > maxLength * 0.9 ? "text-amber-400" : "text-white/40"
              }`}
            >
              {longitud}/{maxLength}
            </span>
          )}
        </div>
      )}

      <textarea
        id={name}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={!!error}
        className={`
          w-full resize-y rounded-xl border bg-dark-900 px-4 py-3 text-sm text-white
          outline-none transition-all duration-200 placeholder:text-white/40
          focus:ring-4 disabled:cursor-not-allowed disabled:bg-dark-900
          ${
            error
              ? "border-rose-500/40 focus:border-rose-500 focus:ring-rose-500/25"
              : "border-white/10 hover:border-white/20 focus:border-brand-500 focus:ring-brand-500/25"
          }
        `}
      />

      {error ? (
        <p role="alert" className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-400">
          <Icon name="error" className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-white/40">{hint}</p>
      )}
    </div>
  );
}

export default Textarea;
