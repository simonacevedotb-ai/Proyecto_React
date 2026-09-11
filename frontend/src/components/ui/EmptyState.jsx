import Button from "./Button";
import Icon from "./Icon";

/**
 * Estado vacío reutilizable.
 *
 * Se usa cuando una lista no tiene resultados, para explicar qué pasó y
 * ofrecer la acción siguiente en lugar de dejar la pantalla en blanco.
 */
function EmptyState({
  icono = "caja",
  titulo,
  descripcion,
  accion,
  onAccion,
  accionTo,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center ${className}`}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800 text-white/40">
        <Icon name={icono} className="h-8 w-8" strokeWidth={1.4} />
      </span>
      <h3 className="text-base font-bold text-white/80">{titulo}</h3>
      {descripcion && (
        <p className="max-w-md text-sm leading-relaxed text-white/50">{descripcion}</p>
      )}
      {accion && (
        <div className="mt-2">
          <Button onClick={onAccion} to={accionTo} variant="secondary" size="sm">
            {accion}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
