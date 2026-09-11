import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Sistema de notificaciones de toda la aplicación.
 *
 * Cualquier pantalla puede avisar al usuario del resultado de una
 * acción con una sola línea:
 *
 *   const toast = useToast();
 *   toast.exito("Producto agregado al carrito");
 *   toast.error("No se pudo guardar el pedido");
 */
const ToastContext = createContext(null);

const DURACION = { exito: 3200, info: 3200, error: 5000, alerta: 4200 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const contador = useRef(0);

  const cerrar = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensaje, tipo = "info", { titulo } = {}) => {
      if (!mensaje) return null;
      contador.current += 1;
      const id = contador.current;

      setToasts((prev) => {
        // Evita apilar el mismo aviso repetido y limita a 4 visibles.
        const sinRepetidos = prev.filter((t) => t.mensaje !== mensaje);
        return [...sinRepetidos, { id, mensaje, tipo, titulo }].slice(-4);
      });

      setTimeout(() => cerrar(id), DURACION[tipo] || 3200);
      return id;
    },
    [cerrar]
  );

  const valor = useMemo(
    () => ({
      toasts,
      cerrar,
      mostrar,
      exito: (mensaje, opciones) => mostrar(mensaje, "exito", opciones),
      error: (mensaje, opciones) => mostrar(mensaje, "error", opciones),
      info: (mensaje, opciones) => mostrar(mensaje, "info", opciones),
      alerta: (mensaje, opciones) => mostrar(mensaje, "alerta", opciones),
    }),
    [toasts, cerrar, mostrar]
  );

  return <ToastContext.Provider value={valor}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
