/** Bloque gris animado que se muestra mientras llegan los datos. */
export function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Esqueleto con la forma de una tarjeta de producto. */
export function SkeletonProducto() {
  return (
    <div className="tarjeta overflow-hidden p-4">
      <Skeleton className="mb-4 h-44 w-full rounded-xl" />
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-4 h-3 w-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

/** Esqueleto de una fila de tabla administrativa. */
export function SkeletonFila({ columnas = 5 }) {
  return (
    <tr>
      {Array.from({ length: columnas }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default Skeleton;
