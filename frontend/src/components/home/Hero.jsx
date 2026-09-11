import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "../ui/Icon";

const DIAPOSITIVAS = [
  {
    etiqueta: "Nuevo ingreso",
    titulo: "iPhone 17",
    resaltado: "ya disponible",
    texto:
      "Chip A19, pantalla Super Retina XDR y la mejor cámara que Apple ha puesto en un iPhone. Llévalo hoy con garantía de 12 meses.",
    imagen: "/img/iphone-17.webp",
    cta: { texto: "Ver el iPhone 17", to: "/productos?buscar=iPhone%2017" },
  },
  {
    etiqueta: "Hasta 20% de descuento",
    titulo: "Ofertas de",
    resaltado: "temporada",
    texto:
      "Smartphones, audio y accesorios seleccionados con precios rebajados. Stock limitado y envío gratis desde $1.500.000.",
    imagen: "/img/vitrina-equipos.jpg",
    cta: { texto: "Ver ofertas", to: "/productos?orden=precio_asc" },
  },
  {
    etiqueta: "Servicio técnico propio",
    titulo: "Reparamos tu equipo",
    resaltado: "en el día",
    texto:
      "Cambio de pantalla, batería, liberación y diagnóstico con repuestos certificados. Agenda en línea y sigue tu orden.",
    imagen: "/img/vitrina-tienda.jpg",
    cta: { texto: "Agendar un servicio", to: "/servicios" },
  },
];

const INTERVALO = 6000;

const CIFRAS = [
  { valor: "5.000+", texto: "Clientes felices" },
  { valor: "12 meses", texto: "De garantía" },
  { valor: "24-48 h", texto: "Entrega nacional" },
];

const MARCAS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Motorola",
  "Huawei",
  "Ugreen",
  "Google",
  "OnePlus",
];

/**
 * Portada de la tienda: escenario negro con la promoción destacada.
 *
 * El color vive solo en el resplandor rojo detrás del producto y en los
 * acentos, nunca en el fondo: es lo que da la lectura de "vitrina de
 * equipos" en vez de un degradado de color plano.
 *
 * El slider se reproduce solo, se pausa al pasar el mouse y se puede
 * mover con las flechas o los puntos.
 */
function Hero() {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const temporizador = useRef(null);

  const siguiente = useCallback(() => {
    setActual((prev) => (prev + 1) % DIAPOSITIVAS.length);
  }, []);

  const anterior = useCallback(() => {
    setActual((prev) => (prev - 1 + DIAPOSITIVAS.length) % DIAPOSITIVAS.length);
  }, []);

  useEffect(() => {
    if (pausado) return undefined;
    temporizador.current = setInterval(siguiente, INTERVALO);
    return () => clearInterval(temporizador.current);
  }, [pausado, siguiente]);

  const slide = DIAPOSITIVAS[actual];

  return (
    <section
      aria-label="Promociones destacadas"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className="relative overflow-hidden bg-black"
    >
      <div className="relative">
        {/* Capas de fondo: retícula técnica y un halo rojo muy contenido */}
        <div
          className="malla-tecnica pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-brand-500/15 blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid w-[94%] max-w-7xl items-center gap-8 py-16 lg:grid-cols-2 lg:gap-12 lg:py-24">
          {/* Texto */}
          <div key={`texto-${actual}`} className="animate-[fadeInUp_.6s_ease-out]">
            <span className="mb-5 inline-flex items-center gap-2 border-l-2 border-brand-500 pl-3 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-500">
              <Icon name="rayo" className="h-3.5 w-3.5" />
              {slide.etiqueta}
            </span>

            <h1 className="mb-5 text-4xl font-normal leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {slide.titulo}{" "}
              <span className="block font-bold text-brand-500">{slide.resaltado}</span>
            </h1>

            <p className="mb-8 max-w-lg text-base leading-relaxed text-white/55">
              {slide.texto}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to={slide.cta.to}
                className="inline-flex items-center gap-2 bg-brand-500 px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-glow"
              >
                {slide.cta.texto}
                <Icon name="flechaDerecha" className="h-4 w-4" />
              </Link>
              <Link
                to="/productos"
                className="inline-flex items-center gap-2 border border-white/25 px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-500"
              >
                Ver catálogo
              </Link>
            </div>

            {/* Cifras de confianza */}
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {CIFRAS.map((dato) => (
                <div key={dato.texto}>
                  <dt className="text-xl font-bold text-white sm:text-2xl">{dato.valor}</dt>
                  <dd className="mt-0.5 text-[11px] uppercase tracking-wider leading-tight text-white/35">
                    {dato.texto}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Imagen */}
          <div className="relative hidden lg:block">
            <div
              className="absolute inset-0 bg-brand-500/10 blur-[90px]"
              aria-hidden="true"
            />
            <img
              key={`img-${actual}`}
              src={slide.imagen}
              alt={`${slide.titulo} ${slide.resaltado}`}
              className="relative mx-auto max-h-[28rem] w-full object-cover animate-[fadeIn_.7s_ease-out]"
            />
            {/* Difumina el borde inferior de la foto contra el negro */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Controles */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <button
            onClick={anterior}
            aria-label="Promoción anterior"
            className="flex h-9 w-9 items-center justify-center border border-white/20 text-white/70 transition-all hover:border-brand-500 hover:text-brand-500"
          >
            <Icon name="chevronIzquierda" className="h-4 w-4" />
          </button>

          <div className="flex gap-2">
            {DIAPOSITIVAS.map((d, i) => (
              <button
                key={d.titulo}
                onClick={() => setActual(i)}
                aria-label={`Ir a la promoción ${i + 1}`}
                aria-current={i === actual}
                className={`h-[3px] transition-all duration-300 ${
                  i === actual ? "w-10 bg-brand-500" : "w-4 bg-white/25 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          <button
            onClick={siguiente}
            aria-label="Siguiente promoción"
            className="flex h-9 w-9 items-center justify-center border border-white/20 text-white/70 transition-all hover:border-brand-500 hover:text-brand-500"
          >
            <Icon name="chevronDerecha" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cinta de marcas */}
      <div className="overflow-hidden border-y border-white/10 bg-dark-900 py-4">
        <div className="marquesina flex w-max items-center gap-12 px-6">
          {[...Array(2)].map((_, repeticion) =>
            MARCAS.map((marca) => (
              <span
                key={`${repeticion}-${marca}`}
                className="whitespace-nowrap text-lg font-bold uppercase tracking-wider text-white/25 transition-colors hover:text-brand-500"
              >
                {marca}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default Hero;
