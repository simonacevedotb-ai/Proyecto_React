import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Beneficios from "../components/home/Beneficios";
import Categorias from "../components/home/Categorias";
import EnviosYPagos from "../components/home/EnviosYPagos";
import Hero from "../components/home/Hero";
import Newsletter from "../components/home/Newsletter";
import ServiciosDestacados from "../components/home/ServiciosDestacados";
import Testimonios from "../components/home/Testimonios";
import SeccionProductos from "../components/tienda/SeccionProductos";
import Icon from "../components/ui/Icon";
import { useReveal } from "../hooks/useReveal";
import { categoriaService } from "../services/categoriaService";
import { productoService } from "../services/productoService";
import { servicioService } from "../services/servicioService";

/**
 * Página de inicio de la tienda.
 *
 * Todo lo que se ve aquí sale de la base de datos: categorías con su
 * número real de productos, destacados, ofertas vigentes, novedades y
 * servicios activos. Si el backend no responde, cada bloque muestra su
 * propio mensaje sin romper el resto de la página.
 */
function Index() {
  const [datos, setDatos] = useState({
    categorias: [],
    destacados: [],
    ofertas: [],
    nuevos: [],
    servicios: [],
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const [categorias, destacados, ofertas, nuevos, servicios] = await Promise.all([
          categoriaService.listar().catch(() => []),
          productoService.listar({ destacado: true, limite: 4 }).catch(() => null),
          productoService.listar({ oferta: true, limite: 4 }).catch(() => null),
          productoService.listar({ orden: "recientes", limite: 4 }).catch(() => null),
          servicioService.listar().catch(() => []),
        ]);

        if (!activo) return;

        setDatos({
          categorias,
          destacados: destacados?.productos || [],
          ofertas: ofertas?.productos || [],
          nuevos: nuevos?.productos || [],
          servicios,
        });

        if (!destacados && !nuevos) {
          setError(
            "No pudimos conectar con el servidor. Verifica que el backend esté encendido."
          );
        }
      } catch (err) {
        if (activo) setError(err.message);
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, []);

  useReveal([cargando, datos]);

  // Evita repetir en "Novedades" lo que ya se mostró arriba
  const idsMostrados = new Set([
    ...datos.destacados.map((p) => p.id_producto),
    ...datos.ofertas.map((p) => p.id_producto),
  ]);
  const nuevosFiltrados = datos.nuevos.filter((p) => !idsMostrados.has(p.id_producto));

  return (
    <>
      <Hero />

      <Categorias categorias={datos.categorias} cargando={cargando} />

      <SeccionProductos
        titulo="Productos"
        resaltado="destacados"
        descripcion="Los equipos que más recomiendan nuestros asesores este mes."
        icono="estrella"
        productos={datos.destacados}
        cargando={cargando}
        error={error}
        enlaceVerMas="/productos"
        textoVerMas="Ver todo el catálogo"
        vacioTitulo="Todavía no hay destacados"
        vacioDescripcion="Marca productos como destacados desde el panel administrativo para que aparezcan aquí."
      />

      {(cargando || datos.ofertas.length > 0) && (
        <SeccionProductos
          titulo="Ofertas"
          resaltado="de la semana"
          descripcion="Precios rebajados de verdad, con el precio anterior a la vista."
          icono="etiqueta"
          productos={datos.ofertas}
          cargando={cargando}
          enlaceVerMas="/productos?oferta=true"
          textoVerMas="Ver todas las ofertas"
          fondo="bg-dark-900"
          vacioTitulo=""
        />
      )}

      <Beneficios />

      {(cargando || nuevosFiltrados.length > 0) && (
        <SeccionProductos
          titulo="Recién"
          resaltado="llegados"
          descripcion="Lo último que entró a bodega y ya está listo para despachar."
          icono="caja"
          productos={nuevosFiltrados.slice(0, 4)}
          cargando={cargando}
          enlaceVerMas="/productos?orden=recientes"
          fondo="bg-dark-900"
          vacioTitulo=""
        />
      )}

      <ServiciosDestacados servicios={datos.servicios} cargando={cargando} />

      <EnviosYPagos />

      {/* Sobre la empresa */}
      <section className="bg-dark-900 py-14 sm:py-16">
        <div className="mx-auto grid w-[94%] max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div className="reveal reveal-izq">
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-500">
              Sobre PhoneStore
            </span>
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Una tienda de tecnología con{" "}
              <span className="text-brand-500">gente detrás</span>
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-white/60 sm:text-base">
              Nacimos en Medellín en 2019 con una idea sencilla: que comprar tecnología
              no tenga letra pequeña. Hoy atendemos a todo el país con catálogo propio,
              taller de servicio técnico y un equipo que responde de verdad.
            </p>
            <p className="mb-6 text-sm leading-relaxed text-white/60 sm:text-base">
              Cada equipo que publicamos pasa por revisión antes de salir a la venta, y
              cada compra queda registrada con su factura y su garantía.
            </p>

            <div className="mb-6 grid grid-cols-3 gap-4">
              {[
                { valor: "2019", texto: "Año de fundación" },
                { valor: "5.000+", texto: "Pedidos entregados" },
                { valor: "98%", texto: "Clientes satisfechos" },
              ].map((dato) => (
                <div key={dato.texto} className="rounded-xl bg-dark-900 p-4 text-center">
                  <p className="text-xl font-bold text-brand-500 sm:text-2xl">
                    {dato.valor}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-white/50">
                    {dato.texto}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/quienes-somos"
                className="inline-flex items-center gap-2 rounded-xl bg-dark-900 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-dark-700"
              >
                Conoce nuestra historia
                <Icon name="flechaDerecha" className="h-4 w-4" />
              </Link>
              <Link
                to="/contacto"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:text-brand-500"
              >
                Escríbenos
              </Link>
            </div>
          </div>

          <div className="reveal reveal-der relative">
            <img
              src="/img/vitrina-tienda.jpg"
              alt="Equipo de PhoneStore atendiendo la tienda"
              loading="lazy"
              className="h-72 w-full rounded-3xl object-cover shadow-xl sm:h-96"
            />
            <div className="absolute -bottom-5 left-5 right-5 rounded-2xl bg-dark-900 p-4 shadow-xl ring-1 ring-slate-900/5 sm:left-8 sm:right-auto sm:w-64">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
                  <Icon name="escudo" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Garantía por escrito</p>
                  <p className="text-xs text-white/50">12 meses en todos los equipos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Testimonios />

      <Newsletter />
    </>
  );
}

export default Index;
