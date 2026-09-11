import Icon from "./Icon";

function Select({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  hint,
  options = [],
  required = false,
  disabled = false,
  placeholder = "Selecciona una opción",
  className = "",
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-white/80">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={!!error}
          className={`
            w-full appearance-none rounded-xl border bg-dark-900 px-4 py-3 pr-10 text-sm
            text-white outline-none transition-all duration-200
            focus:ring-4 disabled:cursor-not-allowed disabled:bg-dark-900
            ${
              error
                ? "border-rose-500/40 focus:border-rose-500 focus:ring-rose-500/25"
                : "border-white/10 hover:border-white/20 focus:border-brand-500 focus:ring-brand-500/25"
            }
          `}
        >
          {placeholder !== null && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <Icon
          name="chevronAbajo"
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
        />
      </div>

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

export default Select;
