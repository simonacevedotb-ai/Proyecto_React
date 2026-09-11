import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ProductCard from "../components/tienda/ProductCard";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Pagination from "../components/ui/Pagination";
import { SkeletonProducto } from "../components/ui/Skeleton";
import { useDebounce } from "../hooks/useDebounce";
import { useReveal } from "../hooks/useReveal";
import { categoriaService } from "../services/categoriaService";
import { productoService } from "../services/productoService";

const ORDENES = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre (A-Z)" },
];

const POR_PAGINA = 12;

/**
 * Catálogo público con búsqueda, filtros, ordenamiento y paginación.
 *
 * El estado de los filtros vive en la URL: así el usuario puede
 * compartir o guardar un enlace con los filtros aplicados, y el botón
 * "atrás" del navegador funciona como se espera.
 */
function Productos() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtros = useMemo(
    () => ({
      buscar: searchParams.get("buscar") || "",
      categoria: searchParams.get("categoria") || "",
      marca: searchParams.get("marca") || "",
      oferta: searchParams.get("oferta") || "",
      orden: searchParams.get("orden") || "recientes",
      pagina: Number(searchParams.get("pagina")) || 1,
    }),
    [searchParams]
  );

  const [textoBusqueda, setTextoBusqueda] = useState(filtros.buscar);
  const busquedaRetrasada = useDebounce(textoBusqueda, 450);

  const [productos, setProductos] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtrosMovil, setFiltrosMovil] = useState(false);

  // Actualiza la URL conservando el resto de filtros
  const aplicarFiltro = useCallback(
    (cambios) => {
      const nuevos = new URLSearchParams(searchParams);
      Object.entries(cambios).forEach(([clave, valor]) => {
        if (valor === "" || valor === null || valor === undefined) nuevos.delete(clave);
        else nuevos.set(clave, String(valor));
      });
      if (!("pagina" in cambios)) nuevos.delete("pagina");
      setSearchParams(nuevos, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // El texto escrito (ya retrasado) pasa a la URL, que es la fuente de
  // verdad de los filtros. Se hace en un efecto porque navegar es un
  // efecto externo, no un cambio de estado local.
  useEffect(() => {
    if (busquedaRetrasada !== filtros.buscar) {
      aplicarFiltro({ buscar: busquedaRetrasada });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaRetrasada]);

  // Si la URL cambia desde fuera (por ejemplo, el buscador del encabezado),
  // se refleja en el campo de texto ajustando el estado durante el render.
  const [busquedaUrlPrevia, setBusquedaUrlPrevia] = useState(filtros.buscar);
  if (busquedaUrlPrevia !== filtros.buscar) {
    setBusquedaUrlPrevia(filtros.buscar);
    setTextoBusqueda(filtros.buscar);
  }

  // Catálogos de apoyo (categorías y marcas para los filtros)
  useEffect(() => {
    let vivo = true;

    async function pedirApoyo() {
      const [cats, mrcs] = await Promise.all([
        categoriaService.listar().catch(() => []),
        productoService.listarMarcas().catch(() => []),
      ]);
      if (!vivo) return;
      setCategorias(cats);
      setMarcas(mrcs);
    }

    pedirApoyo();
    return () => {
      vivo = false;
    };
  }, []);

  // Productos del catálogo
  useEffect(() => {
    const controlador = new AbortController();
    let vivo = true;

    async function pedirProductos() {
      setCargando(true);
      setError("");
      try {
        const data = await productoService.listar(
          {
            buscar: filtros.buscar,
            categoria: filtros.categoria,
            marca: filtros.marca,
            oferta: filtros.oferta || undefined,
            orden: filtros.orden,
            pagina: filtros.pagina,
            limite: POR_PAGINA,
          },
          { signal: controlador.signal }
        );
        if (!vivo) return;
        setProductos(data.productos);
        setPaginacion(data.paginacion);
      } catch (err) {
        if (err.name === "AbortError" || !vivo) return;
        setError(err.message);
        setProductos([]);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirProductos();
    return () => {
      vivo = false;
      controlador.abort();
    };
  }, [filtros]);

  useReveal([productos]);

  const cambiarPagina = (nueva) => {
    aplicarFiltro({ pagina: nueva });
    window.scrollTo({ top: 220, behavior: "smooth" });
  };

  const limpiarFiltros = () => {
    setTextoBusqueda("");
    setSearchParams({}, { replace: true });
  };

  const hayFiltros =
    !!filtros.buscar || !!filtros.categoria || !!filtros.marca || !!filtros.oferta;

  const categoriaActiva = categorias.find(
    (c) => String(c.id_categoria) === String(filtros.categoria)
  );

  // Panel de filtros compartido entre escritorio y móvil
  const panelFiltros = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">
          Categorías
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => {
                aplicarFiltro({ categoria: "" });
                setFiltrosMovil(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                !filtros.categoria
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-white/60 hover:bg-white/10"
              }`}
            >
              Todas las categorías
            </button>
          </li>
          {categorias.map((categoria) => (
            <li key={categoria.id_categoria}>
              <button
                onClick={() => {
                  aplicarFiltro({ categoria: categoria.id_categoria });
                  setFiltrosMovil(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  String(filtros.categoria) === String(categoria.id_categoria)
                    ? "bg-brand-500/10 text-brand-500"
                    : "text-white/60 hover:bg-white/10"
                }`}
              >
                <span className="truncate">{categoria.nombre}</span>
                <span className="ml-2 shrink-0 rounded-full bg-dark-800 px-2 py-0.5 text-[11px] text-white/50">
                  {categoria.total_productos ?? 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {marcas.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">
            Marcas
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                aplicarFiltro({ marca: "" });
                setFiltrosMovil(false);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                !filtros.marca
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-white/10 text-white/60 hover:border-brand-500/40 hover:text-brand-500"
              }`}
            >
              Todas
            </button>
            {marcas.map((m) => (
              <button
                key={m.marca}
                onClick={() => {
                  aplicarFiltro({ marca: m.marca });
                  setFiltrosMovil(false);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filtros.marca === m.marca
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-white/10 text-white/60 hover:border-brand-500/40 hover:text-brand-500"
                }`}
              >
                {m.marca}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/50">
          Promociones
        </h3>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/10">
          <input
            type="checkbox"
            checked={!!filtros.oferta}
            onChange={(e) => aplicarFiltro({ oferta: e.target.checked ? "true" : "" })}
            className="h-4 w-4 rounded border-white/20 text-brand-500 focus:ring-brand-500"
          />
          Solo productos en oferta
        </label>
      </div>

      {hayFiltros && (
        <Button variant="ghost" size="sm" fullWidth onClick={limpiarFiltros} icono="refrescar">
          Limpiar filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="bg-dark-900">
      {/* Cabecera */}
      <div className="border-b border-white/10 bg-dark-900">
        <div className="mx-auto w-[94%] max-w-7xl py-8 sm:py-10">
          <nav aria-label="Ruta" className="mb-3 flex items-center gap-1.5 text-xs text-white/40">
            <a href="/" className="transition-colors hover:text-brand-500">
              Inicio
            </a>
            <Icon name="chevronDerecha" className="h-3 w-3" />
            <span className="font-medium text-white/60">Productos</span>
            {categoriaActiva && (
              <>
                <Icon name="chevronDerecha" className="h-3 w-3" />
                <span className="font-medium text-brand-500">{categoriaActiva.nombre}</span>
              </>
            )}
          </nav>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {categoriaActiva ? categoriaActiva.nombre : "Nuestros"}{" "}
            {!categoriaActiva && <span className="text-brand-500">productos</span>}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/50 sm:text-base">
            {categoriaActiva?.descripcion ||
              "Equipos originales con garantía de 12 meses, envío a todo el país y soporte técnico propio."}
          </p>
        </div>
      </div>

      <div className="mx-auto w-[94%] max-w-7xl py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Filtros (escritorio) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-[calc(var(--altura-header)+16px)] rounded-2xl border border-white/10 bg-dark-900 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                <Icon name="filtro" className="h-4 w-4 text-brand-500" />
                Filtrar
              </h2>
              {panelFiltros}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* Barra de búsqueda y orden */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Icon
                  name="buscar"
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                />
                <input
                  type="search"
                  value={textoBusqueda}
                  onChange={(e) => setTextoBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, marca o descripción..."
                  aria-label="Buscar productos"
                  className="h-12 w-full rounded-xl border border-white/10 bg-dark-900 pl-11 pr-4 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/25"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFiltrosMovil(true)}
                  className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-dark-900 px-4 text-sm font-semibold text-white/80 transition-colors hover:border-brand-400 lg:hidden"
                >
                  <Icon name="filtro" className="h-4 w-4" />
                  Filtros
                  {hayFiltros && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                      !
                    </span>
                  )}
                </button>

                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={filtros.orden}
                    onChange={(e) => aplicarFiltro({ orden: e.target.value })}
                    aria-label="Ordenar productos"
                    className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-dark-900 pl-4 pr-10 text-sm font-medium outline-none transition-colors focus:border-brand-500 sm:w-56"
                  >
                    {ORDENES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="chevronAbajo"
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  />
                </div>
              </div>
            </div>

            {/* Filtros activos */}
            {hayFiltros && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-white/50">Filtros activos:</span>
                {filtros.buscar && (
                  <button
                    onClick={() => setTextoBusqueda("")}
                    className="flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-500 transition-colors hover:bg-brand-500/15"
                  >
                    “{filtros.buscar}”
                    <Icon name="cerrar" className="h-3 w-3" />
                  </button>
                )}
                {categoriaActiva && (
                  <button
                    onClick={() => aplicarFiltro({ categoria: "" })}
                    className="flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-500 transition-colors hover:bg-brand-500/15"
                  >
                    {categoriaActiva.nombre}
                    <Icon name="cerrar" className="h-3 w-3" />
                  </button>
                )}
                {filtros.marca && (
                  <button
                    onClick={() => aplicarFiltro({ marca: "" })}
                    className="flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-500 transition-colors hover:bg-brand-500/15"
                  >
                    {filtros.marca}
                    <Icon name="cerrar" className="h-3 w-3" />
                  </button>
                )}
                {filtros.oferta && (
                  <button
                    onClick={() => aplicarFiltro({ oferta: "" })}
                    className="flex items-center gap-1.5 rounded-full bg-rose-500/12 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/18"
                  >
                    En oferta
                    <Icon name="cerrar" className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={limpiarFiltros}
                  className="text-xs font-semibold text-white/50 underline transition-colors hover:text-white/80"
                >
                  Limpiar todo
                </button>
              </div>
            )}

            {/* Resultados */}
            {!cargando && !error && (
              <p className="mb-4 text-sm text-white/50">
                {paginacion.total === 0
                  ? "Sin resultados"
                  : `${paginacion.total} ${
                      paginacion.total === 1 ? "producto encontrado" : "productos encontrados"
                    }`}
              </p>
            )}

            {error ? (
              <EmptyState
                icono="error"
                titulo="No se pudieron cargar los productos"
                descripcion={error}
                accion="Reintentar"
                onAccion={() => window.location.reload()}
              />
            ) : cargando ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonProducto key={i} />
                ))}
              </div>
            ) : productos.length === 0 ? (
              <EmptyState
                icono="buscar"
                titulo="No encontramos productos con esos filtros"
                descripcion="Prueba con otras palabras, cambia de categoría o quita algún filtro."
                accion={hayFiltros ? "Limpiar filtros" : "Ver todo el catálogo"}
                onAccion={limpiarFiltros}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {productos.map((producto, i) => (
                    <ProductCard
                      key={producto.id_producto}
                      producto={producto}
                      className={`reveal reveal-d${Math.min((i % 3) + 1, 5)}`}
                    />
                  ))}
                </div>

                <Pagination
                  pagina={paginacion.pagina}
                  totalPaginas={paginacion.total_paginas}
                  total={paginacion.total}
                  onCambiar={cambiarPagina}
                  etiqueta="productos"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filtros (móvil) */}
      <div
        onClick={() => setFiltrosMovil(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-[68] bg-dark-950/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          filtrosMovil ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal={filtrosMovil}
        aria-label="Filtros del catálogo"
        className={`fixed bottom-0 left-0 right-0 z-[69] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-dark-900 p-6 shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          filtrosMovil ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <Icon name="filtro" className="h-4 w-4 text-brand-500" />
            Filtrar productos
          </h2>
          <button
            onClick={() => setFiltrosMovil(false)}
            aria-label="Cerrar filtros"
            className="rounded-full p-2 text-white/40 transition-all hover:bg-white/10 hover:text-white/80"
          >
            <Icon name="cerrar" className="h-5 w-5" />
          </button>
        </div>
        {panelFiltros}
        <Button fullWidth className="mt-6" onClick={() => setFiltrosMovil(false)}>
          Ver {paginacion.total} resultados
        </Button>
      </aside>
    </div>
  );
}

export default Productos;
