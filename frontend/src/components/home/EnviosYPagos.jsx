import { Link } from "react-router-dom";

import { formatoPrecio } from "../../utils/formato";
import { COSTO_ENVIO, UMBRAL_ENVIO_GRATIS } from "../../context/CartContext";
import Icon from "../ui/Icon";

const PASOS_ENVIO = [
  {
    icono: "carrito",
    titulo: "1. Haces tu pedido",
    texto: "Eliges tus productos y confirmas la compra con tus datos de entrega.",
  },
  {
    icono: "caja",
    titulo: "2. Lo preparamos",
    texto: "Verificamos el equipo, lo empacamos y te confirmamos por correo.",
  },
  {
    icono: "camion",
    titulo: "3. Sale a ruta",
    texto: "Despachamos el mismo día si compras antes de las 2:00 p. m.",
  },
  {
    icono: "checkCirculo",
    titulo: "4. Recibes y pagas",
    texto: "Revisas tu equipo al recibirlo y pagas al mensajero si lo prefieres.",
  },
];

const METODOS = [
  {
    icono: "billete",
    titulo: "Pago contra entrega",
    texto: "Paga en efectivo cuando recibas el pedido en tu dirección.",
  },
  {
    icono: "tarjeta",
    titulo: "Transferencia bancaria",
    texto: "Te enviamos los datos de la cuenta al confirmar el pedido.",
  },
  {
    icono: "caja",
    titulo: "Efectivo en tienda",
    texto: "Reserva en línea y paga al recoger en nuestro punto de Medellín.",
  },
];

/** Cómo llega el pedido y cómo se puede pagar. */
function EnviosYPagos() {
  return (
    <section className="bg-dark-900 py-14 sm:py-16">
      <div className="mx-auto w-[94%] max-w-7xl">
        {/* Envíos */}
        <div className="reveal mb-10 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white shadow-xl sm:p-10">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Icon name="camion" className="h-3.5 w-3.5" />
                Envíos
              </span>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Así llega tu pedido
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-brand-50">
                Envío gratis en compras desde {formatoPrecio(UMBRAL_ENVIO_GRATIS)}. Por
                debajo de ese monto, la tarifa plana es de {formatoPrecio(COSTO_ENVIO)} a
                todo el país.
              </p>
            </div>
            <Link
              to="/politicas/envios"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-white/25"
            >
              Ver política de envíos
              <Icon name="flechaDerecha" className="h-4 w-4" />
            </Link>
          </div>

          <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS_ENVIO.map((paso) => (
              <li key={paso.titulo} className="relative">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <Icon name={paso.icono} className="h-5 w-5" />
                </span>
                <h3 className="mb-1 text-sm font-bold">{paso.titulo}</h3>
                <p className="text-xs leading-relaxed text-brand-50">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Métodos de pago */}
        <div className="reveal">
          <header className="mb-6 text-center">
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-500">
              Métodos de pago
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Paga como te quede <span className="text-brand-500">más cómodo</span>
            </h2>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {METODOS.map((metodo) => (
              <div
                key={metodo.titulo}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-dark-900 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-lg"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <Icon name={metodo.icono} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">{metodo.titulo}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                    {metodo.texto}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
            <Icon name="candado" className="h-3.5 w-3.5" />
            Nunca pedimos claves ni datos de tarjetas por teléfono, correo o WhatsApp.
          </p>
        </div>
      </div>
    </section>
  );
}

export default EnviosYPagos;
