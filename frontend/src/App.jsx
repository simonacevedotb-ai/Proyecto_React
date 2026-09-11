import { useEffect, useState } from "react";

import PantallaCarga from "./components/PantallaCarga";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import AppRouter from "./router/AppRouter";

/**
 * Decide cuándo se puede quitar la pantalla de carga.
 *
 * Espera dos cosas: que AuthContext termine de validar la sesión contra
 * el backend y que el navegador haya terminado de cargar la página
 * (tipografía e imágenes iniciales incluidas).
 *
 * Vive dentro de AuthProvider porque necesita leer su estado.
 */
function Contenido() {
  const { cargando } = useAuth();
  const [paginaLista, setPaginaLista] = useState(
    () => typeof document !== "undefined" && document.readyState === "complete"
  );

  useEffect(() => {
    if (paginaLista) return undefined;
    const marcarLista = () => setPaginaLista(true);
    window.addEventListener("load", marcarLista);
    return () => window.removeEventListener("load", marcarLista);
  }, [paginaLista]);

  return (
    <>
      <PantallaCarga listo={!cargando && paginaLista} />
      <AppRouter />
    </>
  );
}

/**
 * Orden de los proveedores:
 *   ToastProvider  -> lo usan Auth y Cart para avisar al usuario
 *   AuthProvider   -> sesión y rol
 *   CartProvider   -> carrito (necesita avisos y saber si hay sesión)
 */
function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <Contenido />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
