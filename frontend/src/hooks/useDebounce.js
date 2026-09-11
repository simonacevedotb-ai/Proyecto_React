import { useEffect, useState } from "react";

/**
 * Retrasa la actualización de un valor.
 *
 * Se usa en los buscadores: en vez de llamar a la API con cada tecla,
 * se espera a que el usuario deje de escribir. Menos peticiones y una
 * experiencia más fluida.
 */
export function useDebounce(valor, retraso = 400) {
  const [valorRetrasado, setValorRetrasado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setValorRetrasado(valor), retraso);
    return () => clearTimeout(temporizador);
  }, [valor, retraso]);

  return valorRetrasado;
}
