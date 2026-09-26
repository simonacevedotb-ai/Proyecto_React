import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useForm } from "../hooks/useForm";
import { ventaService } from "../services/ventaService";
import { formatoPrecio, METODOS_PAGO } from "../utils/formato";
import {
  validateDireccion,
  validateEmail,
  validateTelefono,
} from "../utils/validations";

const METODOS = [
  {
    value: "contraentrega",
    titulo: "Pago contra entrega",
    texto: "Pagas en efectivo cuando recibas el pedido en tu dirección.",
    icono: "billete",
  },
  {
    value: "transferencia",
    titulo: "Transferencia bancaria",
    texto: "Te enviamos los datos de la cuenta al confirmar el pedido.",
    icono: "tarjeta",
  },
  {
    value: "efectivo",
    titulo: "Efectivo en tienda",
    texto: "Reservas en línea y pagas al recoger en nuestro punto de Medellín.",
    icono: "caja",
  },
];

function validarNombreCompleto(valor) {
  if (!valor || !valor.trim()) return "Escribe el nombre de quien recibe.";
  if (valor.trim().length < 3) return "Debe tener al menos 3 caracteres.";
  if (valor.length > 90) return "Máximo 90 caracteres.";
  return "";
}

function validarCiudad(valor) {
  if (!valor || !valor.trim()) return "La ciudad es obligatoria.";
  if (valor.trim().length < 3) return "Escribe una ciudad válida.";
  if (valor.length > 60) return "Máximo 60 caracteres.";
  return "";
}

function validarDocumento(valor) {
  if (!valor) return "";
  if (!/^[0-9]+$/.test(valor)) return "El documento solo debe contener números.";
  if (valor.length < 6 || valor.length > 12) return "Debe tener entre 6 y 12 dígitos.";
  return "";
}

/**
 * Confirmación de la compra.
 *
 * Antes de mostrar el formulario se sincroniza el carrito con el
 * backend, para que el usuario no intente comprar algo que se agotó
 * mientras navegaba. El total definitivo lo calcula el servidor.
 */
function Checkout() {
  const { usuario } = useAuth();
  const {
    items,
    subtotal,
    costoEnvio,
    total,
    totalUnidades,
    vaciarCarrito,
    sincronizar,
    sincronizando,
  } = useCart();
  const toast = useToast();

  const [metodoPago, setMetodoPago] = useState("contraentrega");
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [avisos, setAvisos] = useState([]);
  const [pedido, setPedido] = useState(null);
  const [listo, setListo] = useState(false);

  const { values, errors, handleChange, handleBlur, validateAll, setValues, setErrors } =
    useForm(
      {
        cliente_nombre: "",
        cliente_email: "",
        cliente_telefono: "",
        cliente_documento: "",
        direccion_envio: "",
        ciudad: "",
        notas: "",
      },
      {
        cliente_nombre: validarNombreCompleto,
        cliente_email: validateEmail,
        cliente_telefono: validateTelefono,
        cliente_documento: validarDocumento,
        direccion_envio: validateDireccion,
        ciudad: validarCiudad,
      }
    );

  // Precarga los datos del usuario autenticado
  useEffect(() => {
    if (!usuario) return;
    setValues((prev) => ({
      ...prev,
      cliente_nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
      cliente_email: usuario.email || "",
      cliente_telefono: usuario.telefono || "",
      cliente_documento: usuario.numero_documento || "",
      direccion_envio: usuario.direccion || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // Revalida el carrito contra la base de datos al entrar
  useEffect(() => {
    let activo = true;

    async function revisar() {
      if (items.length === 0) {
        setListo(true);
        return;
      }
      try {
        const { cambios } = await sincronizar();
        if (!activo) return;
        if (cambios.length > 0) {
          setAvisos(cambios);
          toast.alerta("Actualizamos tu carrito con la disponibilidad real.");
        }
      } catch {
        // Si falla la sincronización, el backend igual valida al comprar.
      } finally {
        if (activo) setListo(true);
      }
    }

    revisar();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");

    if (!validateAll()) {
      toast.error("Revisa los campos marcados en rojo.");
      return;
    }
    if (items.length === 0) {
      setErrorServidor("Tu carrito está vacío.");
      return;
    }

    setEnviando(true);
    try {
      const data = await ventaService.crear({
        items,
        datosEnvio: {
          cliente_nombre: values.cliente_nombre.trim(),
          cliente_email: values.cliente_email.trim(),
          cliente_telefono: values.cliente_telefono.trim(),
          cliente_documento: values.cliente_documento.trim() || null,
          direccion_envio: values.direccion_envio.trim(),
          ciudad: values.ciudad.trim(),
          notas: values.notas.trim() || null,
          metodo_pago: metodoPago,
        },
      });

      setPedido(data.venta);
      vaciarCarrito({ silencioso: true });
      toast.exito(data.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (error.status === 409) {
        // Algún producto se agotó entre la sincronización y el envío
        const detalles = error.errors ? Object.values(error.errors) : [];
        setAvisos(detalles);
        await sincronizar();
      }
      // 400 son las reglas de negocio y 422 las del esquema; en los dos
      // casos el backend manda { campo: mensaje } para pintar debajo.
      if (error.errors && (error.status === 400 || error.status === 422)) {
        setErrors((prev) => ({ ...prev, ...error.errors }));
      }
      setErrorServidor(error.message || "No pudimos registrar tu pedido.");
      toast.error(error.message || "No pudimos registrar tu pedido.");
    } finally {
      setEnviando(false);
    }
  };

  // ---------- Confirmación ----------
  if (pedido) {
    return (
      <div className="mx-auto w-[94%] max-w-3xl py-12 sm:py-16">
        <div className="rounded-3xl border border-white/10 bg-dark-900 p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-400 animate-[fadeIn_.4s_ease-out]">
            <Icon name="checkCirculo" className="h-10 w-10" />
          </span>

          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            ¡Gracias por tu pedido!
          </h1>
          <p className="mb-1 text-sm text-white/50">Tu número de pedido es</p>
          <p className="mb-6 text-3xl font-bold tracking-wide text-brand-500">
            {pedido.codigo}
          </p>

          <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 text-left">
            <div className="border-b border-white/10 bg-dark-900 px-5 py-3">
              <h2 className="text-sm font-bold text-white/80">Resumen del pedido</h2>
            </div>
            <ul className="divide-y divide-white/10">
              {pedido.detalles?.map((d) => (
                <li key={d.id_detalle} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{d.nombre_producto}</p>
                    <p className="text-xs text-white/50">
                      {d.cantidad} × {formatoPrecio(d.precio_unitario)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-white">
                    {formatoPrecio(d.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-white/10 bg-dark-900 px-5 py-4 text-sm">
              <div className="flex justify-between text-white/60">
                <dt>Subtotal</dt>
                <dd>{formatoPrecio(pedido.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-white/60">
                <dt>Envío</dt>
                <dd>
                  {pedido.costo_envio === 0 ? (
                    <span className="font-semibold text-emerald-400">Gratis</span>
                  ) : (
                    formatoPrecio(pedido.costo_envio)
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
                <dt>Total</dt>
                <dd className="text-brand-500">{formatoPrecio(pedido.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            <div className="rounded-xl bg-dark-900 p-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">
                Envío a
              </p>
              <p className="text-sm font-semibold text-white">{pedido.cliente_nombre}</p>
              <p className="text-xs text-white/50">{pedido.direccion_envio}</p>
              <p className="text-xs text-white/50">{pedido.ciudad}</p>
            </div>
            <div className="rounded-xl bg-dark-900 p-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">
                Método de pago
              </p>
              <p className="text-sm font-semibold text-white">
                {METODOS_PAGO[pedido.metodo_pago] || pedido.metodo_pago}
              </p>
              <p className="mt-1 text-xs text-white/50">
                Estado: <span className="font-semibold text-amber-400">Pendiente</span>
              </p>
            </div>
          </div>

          <Alert tipo="info" className="mb-6 text-left">
            Te confirmaremos el pedido al correo{" "}
            <strong>{pedido.cliente_email}</strong>. Puedes seguir su estado en cualquier
            momento desde <strong>Mis pedidos</strong>.
          </Alert>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button fullWidth to="/cliente/pedidos" icono="recibo">
              Ver mis pedidos
            </Button>
            <Button fullWidth variant="secondary" to="/productos">
              Seguir comprando
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Carrito vacío ----------
  if (listo && items.length === 0) {
    return (
      <div className="mx-auto w-[94%] max-w-2xl py-16">
        <EmptyState
          icono="carrito"
          titulo="No hay nada para pagar"
          descripcion="Tu carrito está vacío. Agrega productos y vuelve a este paso."
          accion="Ir al catálogo"
          accionTo="/productos"
        />
      </div>
    );
  }

  // ---------- Formulario ----------
  return (
    <div className="bg-dark-900 pb-16">
      <div className="border-b border-white/10 bg-dark-900">
        <div className="mx-auto w-[94%] max-w-7xl py-8">
          <nav aria-label="Ruta" className="mb-2 flex items-center gap-1.5 text-xs text-white/40">
            <Link to="/productos" className="transition-colors hover:text-brand-500">
              Productos
            </Link>
            <Icon name="chevronDerecha" className="h-3 w-3" />
            <span className="font-medium text-white/60">Confirmar compra</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Confirmar <span className="text-brand-500">compra</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Revisa tus datos de entrega y elige cómo quieres pagar.
          </p>
        </div>
      </div>

      <div className="mx-auto w-[94%] max-w-7xl py-8">
        {sincronizando && !listo && (
          <Alert tipo="info" className="mb-5">
            Verificando la disponibilidad de tus productos...
          </Alert>
        )}

        {avisos.length > 0 && (
          <Alert tipo="alerta" titulo="Actualizamos tu carrito" className="mb-5">
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {avisos.map((aviso, i) => (
                <li key={i}>{aviso}</li>
              ))}
            </ul>
          </Alert>
        )}

        {errorServidor && (
          <Alert tipo="error" className="mb-5">
            {errorServidor}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
          {/* Datos de entrega */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-white/10 bg-dark-900 p-6">
              <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                  <Icon name="camion" className="h-4 w-4" />
                </span>
                Datos de entrega
              </h2>

              <div className="space-y-4">
                <Input
                  label="Nombre de quien recibe"
                  name="cliente_nombre"
                  value={values.cliente_nombre}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.cliente_nombre}
                  maxLength={90}
                  required
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Correo electrónico"
                    name="cliente_email"
                    type="email"
                    value={values.cliente_email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.cliente_email}
                    required
                  />
                  <Input
                    label="Teléfono de contacto"
                    name="cliente_telefono"
                    value={values.cliente_telefono}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.cliente_telefono}
                    maxLength={15}
                    hint="Entre 7 y 15 dígitos"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Documento (opcional)"
                    name="cliente_documento"
                    value={values.cliente_documento}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.cliente_documento}
                    maxLength={12}
                    hint="Para la factura de tu compra"
                  />
                  <Input
                    label="Ciudad"
                    name="ciudad"
                    value={values.ciudad}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.ciudad}
                    placeholder="Medellín"
                    maxLength={60}
                    required
                  />
                </div>

                <Input
                  label="Dirección de envío"
                  name="direccion_envio"
                  value={values.direccion_envio}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.direccion_envio}
                  placeholder="Calle 45 # 12-34, apto 301, barrio Laureles"
                  maxLength={150}
                  hint="Entre 10 y 150 caracteres. Incluye barrio y puntos de referencia."
                  required
                />

                <Textarea
                  label="Notas para el mensajero (opcional)"
                  name="notas"
                  value={values.notas}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  rows={3}
                  maxLength={300}
                  placeholder="Ej: llamar antes de subir, dejar en portería..."
                />
              </div>
            </section>

            {/* Método de pago */}
            <section className="rounded-2xl border border-white/10 bg-dark-900 p-6">
              <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                  <Icon name="billete" className="h-4 w-4" />
                </span>
                Método de pago
              </h2>

              <div className="space-y-3">
                {METODOS.map((metodo) => (
                  <label
                    key={metodo.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-200 ${
                      metodoPago === metodo.value
                        ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/25"
                        : "border-white/10 hover:border-brand-500/40 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="metodo_pago"
                      value={metodo.value}
                      checked={metodoPago === metodo.value}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="mt-1 h-4 w-4 shrink-0 border-white/20 text-brand-500 focus:ring-brand-500"
                    />
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        metodoPago === metodo.value
                          ? "bg-brand-500 text-white"
                          : "bg-dark-800 text-white/50"
                      }`}
                    >
                      <Icon name={metodo.icono} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">
                        {metodo.titulo}
                      </span>
                      <span className="block text-xs leading-relaxed text-white/50">
                        {metodo.texto}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <p className="mt-4 flex items-start gap-2 rounded-xl bg-dark-900 p-3 text-xs leading-relaxed text-white/50">
                <Icon name="candado" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                Nunca pedimos claves ni datos de tarjetas por teléfono, correo o WhatsApp.
                El pedido se confirma con nuestro equipo antes del despacho.
              </p>
            </section>
          </div>

          {/* Resumen */}
          <aside className="lg:col-span-1">
            <div className="sticky top-[calc(var(--altura-header)+16px)] rounded-2xl border border-white/10 bg-dark-900 p-6">
              <h2 className="mb-4 text-base font-bold text-white">
                Resumen ({totalUnidades} {totalUnidades === 1 ? "artículo" : "artículos"})
              </h2>

              <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                {items.map((it) => (
                  <li key={it.id_producto} className="flex gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-dark-800">
                      {it.imagen_url ? (
                        <img
                          src={it.imagen_url}
                          alt={it.nombre}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Icon name="telefono" className="h-6 w-6 text-white/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="lineas-2 text-xs font-semibold leading-snug text-white">
                        {it.nombre}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/50">
                        {it.cantidad} × {formatoPrecio(it.precio)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-white">
                      {formatoPrecio(it.precio * it.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="space-y-2 border-t border-white/10 pt-4 text-sm">
                <div className="flex justify-between text-white/60">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold">{formatoPrecio(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-white/60">
                  <dt>Envío</dt>
                  <dd className={costoEnvio === 0 ? "font-semibold text-emerald-400" : "font-semibold"}>
                    {costoEnvio === 0 ? "Gratis" : formatoPrecio(costoEnvio)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-bold text-white">
                  <dt>Total</dt>
                  <dd className="text-brand-500">{formatoPrecio(total)}</dd>
                </div>
              </dl>

              <Button
                type="submit"
                fullWidth
                size="lg"
                className="mt-5"
                cargando={enviando}
                disabled={items.length === 0}
                icono="checkCirculo"
              >
                Confirmar pedido
              </Button>

              <Link
                to="/productos"
                className="mt-3 block text-center text-xs font-semibold text-white/50 transition-colors hover:text-brand-500"
              >
                Seguir comprando
              </Link>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-white/40">
                Los precios y el stock se validan de nuevo en el servidor al confirmar.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

export default Checkout;
