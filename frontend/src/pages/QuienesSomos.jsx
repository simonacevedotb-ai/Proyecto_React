import { Link } from "react-router-dom";

import Icon from "../components/ui/Icon";
import { useReveal } from "../hooks/useReveal";

const RAZONES = [
  {
    icono: "escudo",
    titulo: "Equipos 100% originales",
    descripcion:
      "Todos nuestros celulares y accesorios son originales, con IMEI verificable, garantía escrita y soporte postventa real.",
  },
  {
    icono: "billete",
    titulo: "Precios justos y transparentes",
    descripcion:
      "Sin letras pequeñas ni sorpresas: el precio que ves en el catálogo es el precio que pagas al final del pedido.",
  },
  {
    icono: "chat",
    titulo: "Atención cercana y humana",
    descripcion:
      "Un equipo real, dispuesto a asesorarte antes, durante y después de tu compra por el canal que prefieras.",
  },
  {
    icono: "candado",
    titulo: "Compra 100% segura",
    descripcion:
      "Tus datos viajan cifrados, tu contraseña se guarda con hash y cada pedido se valida en el servidor.",
  },
];

const HITOS = [
  {
    anio: "2019",
    titulo: "Abrimos la primera tienda",
    texto: "Un local pequeño en Medellín y la idea de vender tecnología sin letra pequeña.",
  },
  {
    anio: "2021",
    titulo: "Nace el taller propio",
    texto: "Dejamos de tercerizar las reparaciones para responder por cada equipo que tocamos.",
  },
  {
    anio: "2023",
    titulo: "Envíos a todo el país",
    texto: "Sumamos operadores logísticos y pago contra entrega en todo el territorio nacional.",
  },
  {
    anio: "2026",
    titulo: "Tienda en línea completa",
    texto: "Catálogo, carrito, pedidos e inventario conectados en una sola plataforma.",
  },
];

const VALORES = [
  { icono: "check", titulo: "Honestidad", texto: "Si un equipo no te sirve, te lo decimos." },
  { icono: "rayo", titulo: "Rapidez", texto: "Respondemos y despachamos el mismo día." },
  { icono: "herramienta", titulo: "Oficio", texto: "Técnicos certificados, no improvisados." },
  { icono: "estrella", titulo: "Cuidado", texto: "Cada pedido se revisa antes de salir." },
];

function QuienesSomos() {
  useReveal([]);

  return (
    <div className="bg-dark-900 pb-16">
      {/* Encabezado */}
      <section className="relative overflow-hidden bg-dark-900 py-16 text-white sm:py-20">
        <div className="malla-hero pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto w-[94%] max-w-4xl text-center">
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
            Tu tienda de confianza en tecnología móvil
          </span>
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Somos Phone<span className="text-brand-400">Store</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/30">
            Un equipo apasionado por la tecnología que nació para acercar a las personas
            los mejores equipos móviles con la confianza, la calidad y el respaldo que
            toda compra importante merece.
          </p>
        </div>
      </section>

      <div className="mx-auto w-[94%] max-w-6xl py-12">
        {/* Historia */}
        <section className="reveal mb-14 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Más que una tienda de <span className="text-brand-500">celulares</span>
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-white/60 sm:text-base">
              Desde nuestros inicios nos enfocamos en construir relaciones duraderas con
              cada cliente, entendiendo que detrás de cada compra hay una necesidad real:
              comunicarte, trabajar, estudiar o simplemente disfrutar de la mejor
              tecnología.
            </p>
            <p className="text-sm leading-relaxed text-white/60 sm:text-base">
              Contamos con un catálogo cuidadosamente seleccionado de teléfonos
              inteligentes de las mejores marcas, accesorios originales y servicios
              técnicos especializados. Cada producto que publicamos pasa por un proceso de
              verificación antes de llegar a tus manos.
            </p>
          </div>

          <div className="relative">
            <img
              src="/img/vitrina-equipos.jpg"
              alt="Equipos disponibles en PhoneStore"
              loading="lazy"
              className="h-72 w-full rounded-3xl object-cover shadow-xl sm:h-80"
            />
            <div className="absolute -bottom-5 left-5 right-5 grid grid-cols-3 gap-2 rounded-2xl bg-dark-900 p-4 shadow-xl ring-1 ring-slate-900/5">
              {[
                { valor: "5.000+", texto: "Clientes" },
                { valor: "7 años", texto: "De trayectoria" },
                { valor: "98%", texto: "Satisfacción" },
              ].map((d) => (
                <div key={d.texto} className="text-center">
                  <p className="text-lg font-bold text-brand-500">{d.valor}</p>
                  <p className="text-[11px] leading-tight text-white/50">{d.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Misión y visión */}
        <section className="mb-14 grid gap-5 sm:grid-cols-2">
          <article className="reveal reveal-izq rounded-2xl border border-brand-500/25 bg-dark-900 p-6 sm:p-8">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Icon name="rayo" className="h-6 w-6" />
            </span>
            <h3 className="mb-2 text-lg font-bold text-white">Nuestra misión</h3>
            <p className="text-sm leading-relaxed text-white/60">
              Ofrecer equipos móviles y accesorios de alta calidad, a precios justos y con
              un servicio cercano y honesto, garantizando una experiencia de compra
              rápida, segura y satisfactoria en cada pedido.
            </p>
          </article>

          <article className="reveal reveal-der rounded-2xl border border-brand-500/25 bg-dark-900 p-6 sm:p-8">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Icon name="estrella" className="h-6 w-6" />
            </span>
            <h3 className="mb-2 text-lg font-bold text-white">Nuestra visión</h3>
            <p className="text-sm leading-relaxed text-white/60">
              Ser reconocidos como la tienda de tecnología móvil de referencia en la
              región, destacándonos por la confianza de nuestros clientes, la calidad de
              nuestros productos y la capacidad de innovar en servicio y atención.
            </p>
          </article>
        </section>

        {/* Nuestra historia en hitos */}
        <section className="mb-14">
          <h2 className="reveal mb-8 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Nuestro <span className="text-brand-500">recorrido</span>
          </h2>

          <ol className="relative space-y-6 border-l-2 border-white/10 pl-8 sm:pl-10">
            {HITOS.map((hito, i) => (
              <li key={hito.anio} className={`reveal reveal-d${i + 1} relative`}>
                <span className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-[10px] font-bold text-white sm:-left-[49px]">
                  {i + 1}
                </span>
                <div className="rounded-2xl border border-white/10 bg-dark-900 p-5">
                  <span className="mb-1 inline-block rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-bold text-brand-500">
                    {hito.anio}
                  </span>
                  <h3 className="text-base font-bold text-white">{hito.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/50">{hito.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Valores */}
        <section className="mb-14">
          <h2 className="reveal mb-8 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Lo que nos <span className="text-brand-500">mueve</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {VALORES.map((valor, i) => (
              <div
                key={valor.titulo}
                className={`reveal reveal-d${i + 1} rounded-2xl border border-white/10 bg-dark-900 p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-lg`}
              >
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <Icon name={valor.icono} className="h-5 w-5" />
                </span>
                <h3 className="text-sm font-bold text-white">{valor.titulo}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/50">{valor.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Por qué elegirnos */}
        <section className="mb-14">
          <h2 className="reveal mb-8 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
            ¿Por qué <span className="text-brand-500">elegirnos</span>?
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {RAZONES.map((razon, i) => (
              <article
                key={razon.titulo}
                className={`reveal reveal-d${i + 1} flex gap-4 rounded-2xl border border-white/10 bg-dark-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-lg`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                  <Icon name={razon.icono} className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="mb-1 text-base font-bold text-white">{razon.titulo}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{razon.descripcion}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Cierre */}
        <section className="reveal rounded-3xl bg-dark-900 p-8 text-center text-white sm:p-12">
          <p className="mx-auto mb-6 max-w-2xl text-lg font-semibold leading-relaxed sm:text-xl">
            En Phone<span className="text-brand-400">Store</span> tu confianza es nuestro
            mayor logro. Por eso trabajamos cada día para que comprar tecnología sea una
            experiencia simple, transparente y segura.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-600"
            >
              Ver el catálogo
              <Icon name="flechaDerecha" className="h-4 w-4" />
            </Link>
            <Link
              to="/contacto"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
            >
              Hablar con el equipo
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default QuienesSomos;
