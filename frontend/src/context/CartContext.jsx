import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { productoService } from "../services/productoService";
import { useToast } from "./ToastContext";

/**
 * Carrito de compras.
 *
 * - Persiste en localStorage: el usuario no lo pierde al navegar ni al
 *   recargar la página.
 * - Valida el stock disponible antes de agregar o aumentar cantidades.
 * - Se sincroniza con el backend (`sincronizar`) para detectar cambios
 *   de precio, productos agotados o retirados del catálogo mientras el
 *   carrito estaba guardado.
 *
 * El total mostrado aquí es informativo: quien manda es el backend, que
 * recalcula todo al registrar la venta.
 */
const CartContext = createContext(null);

const STORAGE_KEY = "phonestore_cart";

// Mismas reglas de envío que aplica el backend en app/routes/ventas.py
export const UMBRAL_ENVIO_GRATIS = 1500000;
export const COSTO_ENVIO = 15000;

function leerCarritoGuardado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return [];
    // Descarta entradas corruptas de versiones anteriores
    return items.filter(
      (it) => it && it.id_producto && Number(it.cantidad) > 0 && it.nombre
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(leerCarritoGuardado);
  const [isOpen, setIsOpen] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage lleno o no disponible: el carrito sigue en memoria.
    }
  }, [items]);

  const abrirCarrito = useCallback(() => setIsOpen(true), []);
  const cerrarCarrito = useCallback(() => setIsOpen(false), []);
  const alternarCarrito = useCallback(() => setIsOpen((prev) => !prev), []);

  // ---------------------------------------------------------------
  // Operaciones sobre el carrito
  // ---------------------------------------------------------------
  const agregarProducto = useCallback(
    (producto, cantidad = 1) => {
      const stock = Number(producto.stock ?? 0);

      if (producto.estado && producto.estado !== "activo") {
        toast.error(`"${producto.nombre}" no está disponible.`);
        return false;
      }
      if (stock <= 0) {
        toast.error(`"${producto.nombre}" está agotado.`);
        return false;
      }

      let resultado = true;

      setItems((prev) => {
        const existente = prev.find((it) => it.id_producto === producto.id_producto);
        const enCarrito = existente ? existente.cantidad : 0;
        const deseada = enCarrito + cantidad;

        if (deseada > stock) {
          if (enCarrito >= stock) {
            toast.alerta(
              `Ya tienes las ${stock} unidad(es) disponibles de "${producto.nombre}".`
            );
            resultado = false;
            return prev;
          }
          toast.alerta(
            `Solo quedan ${stock} unidad(es) de "${producto.nombre}". Ajustamos la cantidad.`
          );
        }

        const cantidadFinal = Math.min(deseada, stock);

        if (existente) {
          return prev.map((it) =>
            it.id_producto === producto.id_producto
              ? { ...it, cantidad: cantidadFinal, stock, precio: Number(producto.precio) }
              : it
          );
        }

        return [
          ...prev,
          {
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            marca: producto.marca,
            precio: Number(producto.precio) || 0,
            imagen_url: producto.imagen_url || null,
            stock,
            cantidad: cantidadFinal,
          },
        ];
      });

      if (resultado) {
        toast.exito(`"${producto.nombre}" se agregó al carrito.`);
      }
      return resultado;
    },
    [toast]
  );

  const incrementar = useCallback(
    (id_producto) => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id_producto !== id_producto) return it;
          if (it.stock && it.cantidad >= it.stock) {
            toast.alerta(`Solo hay ${it.stock} unidad(es) disponibles.`);
            return it;
          }
          return { ...it, cantidad: it.cantidad + 1 };
        })
      );
    },
    [toast]
  );

  const decrementar = useCallback((id_producto) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id_producto === id_producto
          ? { ...it, cantidad: Math.max(1, it.cantidad - 1) }
          : it
      )
    );
  }, []);

  const cambiarCantidad = useCallback(
    (id_producto, cantidad) => {
      const numero = Math.floor(Number(cantidad));
      if (!Number.isFinite(numero)) return;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id_producto !== id_producto) return it;
          const maximo = it.stock || numero;
          if (numero > maximo) {
            toast.alerta(`Solo hay ${maximo} unidad(es) disponibles.`);
            return { ...it, cantidad: maximo };
          }
          return { ...it, cantidad: Math.max(1, numero) };
        })
      );
    },
    [toast]
  );

  const eliminarProducto = useCallback(
    (id_producto, nombre) => {
      setItems((prev) => prev.filter((it) => it.id_producto !== id_producto));
      if (nombre) toast.info(`"${nombre}" se quitó del carrito.`);
    },
    [toast]
  );

  const vaciarCarrito = useCallback(
    ({ silencioso = false } = {}) => {
      setItems([]);
      if (!silencioso) toast.info("Carrito vaciado.");
    },
    [toast]
  );

  /**
   * Vuelve a consultar cada producto del carrito en el backend.
   * Corrige precios, ajusta cantidades al stock real y quita lo que ya
   * no está disponible. Se ejecuta antes de ir al checkout.
   */
  const sincronizar = useCallback(async () => {
    if (items.length === 0) return { cambios: [], items: [] };

    setSincronizando(true);
    const cambios = [];

    try {
      const respuestas = await Promise.all(
        items.map(async (it) => {
          try {
            const data = await productoService.obtener(it.id_producto);
            return { item: it, producto: data.producto };
          } catch (error) {
            return { item: it, producto: null, noDisponible: error.status === 404 };
          }
        })
      );

      const actualizados = [];

      respuestas.forEach(({ item, producto, noDisponible }) => {
        if (!producto) {
          if (noDisponible) {
            cambios.push(`"${item.nombre}" ya no está disponible y se quitó del carrito.`);
            return;
          }
          actualizados.push(item); // error de red: se conserva tal cual
          return;
        }

        if (producto.estado !== "activo" || producto.stock <= 0) {
          cambios.push(`"${producto.nombre}" está agotado y se quitó del carrito.`);
          return;
        }

        let cantidad = item.cantidad;
        if (cantidad > producto.stock) {
          cantidad = producto.stock;
          cambios.push(
            `Ajustamos "${producto.nombre}" a ${producto.stock} unidad(es), que es lo que queda.`
          );
        }
        if (Number(producto.precio) !== Number(item.precio)) {
          cambios.push(`El precio de "${producto.nombre}" se actualizó.`);
        }

        actualizados.push({
          ...item,
          nombre: producto.nombre,
          marca: producto.marca,
          precio: Number(producto.precio),
          imagen_url: producto.imagen_url,
          stock: producto.stock,
          cantidad,
        });
      });

      setItems(actualizados);
      return { cambios, items: actualizados };
    } finally {
      setSincronizando(false);
    }
  }, [items]);

  // ---------------------------------------------------------------
  // Totales
  // ---------------------------------------------------------------
  const totalUnidades = useMemo(
    () => items.reduce((acc, it) => acc + it.cantidad, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.precio * it.cantidad, 0),
    [items]
  );

  const costoEnvio = useMemo(() => {
    if (items.length === 0) return 0;
    return subtotal >= UMBRAL_ENVIO_GRATIS ? 0 : COSTO_ENVIO;
  }, [items.length, subtotal]);

  const total = subtotal + costoEnvio;

  const faltaParaEnvioGratis = Math.max(0, UMBRAL_ENVIO_GRATIS - subtotal);

  const cantidadEnCarrito = useCallback(
    (id_producto) =>
      items.find((it) => it.id_producto === id_producto)?.cantidad || 0,
    [items]
  );

  const value = {
    items,
    isOpen,
    sincronizando,
    totalUnidades,
    subtotal,
    costoEnvio,
    total,
    faltaParaEnvioGratis,
    umbralEnvioGratis: UMBRAL_ENVIO_GRATIS,
    abrirCarrito,
    cerrarCarrito,
    alternarCarrito,
    agregarProducto,
    incrementar,
    decrementar,
    cambiarCantidad,
    eliminarProducto,
    vaciarCarrito,
    sincronizar,
    cantidadEnCarrito,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
