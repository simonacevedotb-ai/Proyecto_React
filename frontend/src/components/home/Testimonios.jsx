import Icon from "../ui/Icon";

const TESTIMONIOS = [
  {
    nombre: "Laura Gómez",
    ciudad: "Medellín",
    estrellas: 5,
    texto:
      "Pedí un iPhone 15 Pro un martes y llegó el miércoles en la mañana. Venía sellado y con la factura. La asesoría por WhatsApp fue rapidísima.",
    inicial: "L",
  },
  {
    nombre: "Andrés Ramírez",
    ciudad: "Bogotá",
    estrellas: 5,
    texto:
      "Les llevé el celular con la pantalla rota y me lo entregaron el mismo día. Me mostraron el repuesto antes de instalarlo y quedó como nuevo.",
    inicial: "A",
  },
  {
    nombre: "Valentina Ospina",
    ciudad: "Cali",
    estrellas: 4,
    texto:
      "Compré unos audífonos en oferta y el precio fue el mejor que encontré. Pagué contra entrega sin problema y me llegó bien empacado.",
    inicial: "V",
  },
];

/** Reseñas de clientes con calificación. */
function Testimonios() {
  return (
    <section className="bg-dark-900 py-14 sm:py-16">
      <div className="mx-auto w-[94%] max-w-7xl">
        <header className="reveal mb-10 text-center">
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-500">
            Lo que dicen nuestros clientes
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Miles de compras <span className="text-brand-500">bien hechas</span>
          </h2>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-4 py-2">
            <span className="flex gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} name="estrella" className="h-4 w-4 text-amber-500" strokeWidth={2} />
              ))}
            </span>
            <span className="text-sm font-bold text-amber-400">4.8 de 5</span>
            <span className="text-xs text-amber-400">· 1.240 reseñas</span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIOS.map((t, i) => (
            <figure
              key={t.nombre}
              className={`reveal reveal-d${i + 1} flex flex-col rounded-2xl border border-white/10 bg-dark-800 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/30 hover:bg-dark-700 hover:shadow-xl hover:shadow-brand-500/10`}
            >
              <div className="mb-3 flex gap-0.5" aria-label={`${t.estrellas} de 5 estrellas`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Icon
                    key={n}
                    name="estrella"
                    className={`h-4 w-4 ${n <= t.estrellas ? "text-amber-500" : "text-white/30"}`}
                    strokeWidth={2}
                  />
                ))}
              </div>

              <blockquote className="mb-5 flex-1 text-sm leading-relaxed text-white/60">
                “{t.texto}”
              </blockquote>

              <figcaption className="flex items-center gap-3 border-t border-white/10 pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white">
                  {t.inicial}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{t.nombre}</p>
                  <p className="text-xs text-white/50">Compra verificada · {t.ciudad}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonios;
