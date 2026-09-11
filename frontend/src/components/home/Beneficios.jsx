import Icon from "../ui/Icon";

const BENEFICIOS = [
  {
    icono: "escudo",
    titulo: "Equipos 100% originales",
    texto:
      "Cada equipo llega sellado, con IMEI verificable y garantía escrita de 12 meses respaldada por la tienda.",
  },
  {
    icono: "camion",
    titulo: "Envío a todo el país",
    texto:
      "Despachamos el mismo día si compras antes de las 2:00 p. m. Entrega en 24 a 48 horas en ciudades principales.",
  },
  {
    icono: "herramienta",
    titulo: "Servicio técnico propio",
    texto:
      "Taller especializado con repuestos certificados. Reparaciones con garantía y seguimiento en línea de tu orden.",
  },
  {
    icono: "billete",
    titulo: "Paga como prefieras",
    texto:
      "Contra entrega, transferencia bancaria o efectivo en tienda. Sin recargos ocultos ni letras pequeñas.",
  },
  {
    icono: "refrescar",
    titulo: "Cambios sin enredos",
    texto:
      "Tienes 5 días hábiles para cambiar tu equipo si no es lo que esperabas, conservando empaque y accesorios.",
  },
  {
    icono: "chat",
    titulo: "Asesoría real",
    texto:
      "Un equipo humano te ayuda a elegir por WhatsApp, teléfono o correo antes, durante y después de tu compra.",
  },
];

/** Razones para comprar en la tienda. */
function Beneficios() {
  return (
    <section className="bg-dark-900 py-14 sm:py-16">
      <div className="mx-auto w-[94%] max-w-7xl">
        <header className="reveal mb-10 text-center">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-500">
            Por qué elegirnos
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Comprar aquí es <span className="text-brand-500">tranquilo</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/50 sm:text-base">
            No vendemos solo teléfonos: acompañamos todo el proceso, desde que eliges
            el modelo hasta el soporte posterior.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICIOS.map((beneficio, i) => (
            <article
              key={beneficio.titulo}
              className={`reveal reveal-d${Math.min(i + 1, 5)} group rounded-2xl border border-white/10 bg-dark-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/30 hover:shadow-xl hover:shadow-brand-500/10`}
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-white">
                <Icon name={beneficio.icono} className="h-6 w-6" />
              </span>
              <h3 className="mb-2 text-base font-bold text-white">{beneficio.titulo}</h3>
              <p className="text-sm leading-relaxed text-white/50">{beneficio.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Beneficios;
