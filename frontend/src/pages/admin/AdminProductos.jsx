import { useCallback, useEffect, useState } from "react";

import {
  AccionFila,
  BarraFiltros,
  PanelHeader,
  SelectorFiltro,
  TablaAdmin,
  Tarjeta,
} from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import { SkeletonFila } from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDebounce } from "../../hooks/useDebounce";
import { useForm } from "../../hooks/useForm";
import { categoriaService } from "../../services/categoriaService";
import { productoService } from "../../services/productoService";
import { formatoPrecio } from "../../utils/formato";

const POR_PAGINA = 10;

const initialValues = {
  nombre: "",
  marca: "",
  id_categoria: "",
  descripcion: "",
  precio: "",
  precio_anterior: "",
  stock: "",
  stock_minimo: "5",
  imagen_url: "",
  destacado: false,
};

function validarTexto(min, max, etiqueta) {
  return (valor) => {
    const v = (valor || "").trim();
    if (!v) return `${etiqueta} es obligatorio.`;
    if (v.length < min) return `Debe tener al menos ${min} caracteres.`;
    if (v.length > max) return `Máximo ${max} caracteres.`;
    return "";
  };
}

function validarPrecio(valor) {
  if (valor === "" || valor === null) return "El precio es obligatorio.";
  if (Number.isNaN(Number(valor)) || Number(valor) < 0)
    return "Debe ser un número mayor o igual a 0.";
  return "";
}

function validarOpcionalNumero(valor) {
  if (valor === "" || valor === null) return "";
  if (Number.isNaN(Number(valor)) || Number(valor) < 0)
    return "Debe ser un número mayor o igual a 0.";
  return "";
}

/** Gestión completa del catálogo de productos. */
function AdminProductos() {
  const { esAdmin } = useAuth();
  const toast = useToast();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const busquedaRetrasada = useDebounce(busqueda, 400);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroStock, setFiltroStock] = useState("");
  const [pagina, setPagina] = useState(1);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [confirmacion, setConfirmacion] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const { values, errors, handleChange, handleBlur, validateAll, setValues, setErrors, reset } =
    useForm(initialValues, {
      nombre: validarTexto(2, 80, "El nombre"),
      marca: validarTexto(2, 40, "La marca"),
      precio: validarPrecio,
      precio_anterior: validarOpcionalNumero,
      stock: validarOpcionalNumero,
      stock_minimo: validarOpcionalNumero,
    });

  // Contador que fuerza una recarga tras crear, editar o eliminar.
  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirProductos() {
      setCargando(true);
      setError("");
      try {
        const data = await productoService.listar(
          {
            buscar: busquedaRetrasada,
            categoria: filtroCategoria,
            estado: filtroEstado,
            stock: filtroStock,
            pagina,
            limite: POR_PAGINA,
          },
          { auth: true }
        );
        if (!vivo) return;
        setProductos(data.productos);
        setPaginacion(data.paginacion);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirProductos();
    return () => {
      vivo = false;
    };
  }, [busquedaRetrasada, filtroCategoria, filtroEstado, filtroStock, pagina, recarga]);

  useEffect(() => {
    let vivo = true;

    async function pedirCategorias() {
      try {
        const lista = await categoriaService.listar({ auth: true });
        if (vivo) setCategorias(lista);
      } catch {
        if (vivo) setCategorias([]);
      }
    }

    pedirCategorias();
    return () => {
      vivo = false;
    };
  }, []);

  // Al cambiar un filtro se vuelve a la primera página (ajuste en render).
  const [filtrosPrevios, setFiltrosPrevios] = useState("");
  const filtrosActuales = `${busquedaRetrasada}|${filtroCategoria}|${filtroEstado}|${filtroStock}`;
  if (filtrosPrevios !== filtrosActuales) {
    setFiltrosPrevios(filtrosActuales);
    setPagina(1);
  }

  // ---------------- Formulario ----------------
  const abrirCrear = () => {
    setEditando(null);
    reset();
    setValues(initialValues);
    setErrorFormulario("");
    setModalAbierto(true);
  };

  const abrirEditar = (producto) => {
    setEditando(producto);
    setValues({
      nombre: producto.nombre,
      marca: producto.marca,
      id_categoria: producto.id_categoria ? String(producto.id_categoria) : "",
      descripcion: producto.descripcion || "",
      precio: String(producto.precio ?? ""),
      precio_anterior: producto.precio_anterior ? String(producto.precio_anterior) : "",
      stock: String(producto.stock ?? 0),
      stock_minimo: String(producto.stock_minimo ?? 5),
      imagen_url: producto.imagen_url || "",
      destacado: !!producto.destacado,
    });
    setErrors({});
    setErrorFormulario("");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    reset();
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorFormulario("");
    if (!validateAll()) return;

    const payload = {
      nombre: values.nombre.trim(),
      marca: values.marca.trim(),
      id_categoria: values.id_categoria ? Number(values.id_categoria) : null,
      descripcion: values.descripcion.trim() || null,
      precio: Number(values.precio),
      precio_anterior: values.precio_anterior ? Number(values.precio_anterior) : null,
      stock: values.stock === "" ? 0 : Number(values.stock),
      stock_minimo: values.stock_minimo === "" ? 0 : Number(values.stock_minimo),
      destacado: !!values.destacado,
      imagen_url: values.imagen_url.trim() || null,
    };

    setGuardando(true);
    try {
      if (editando) {
        await productoService.actualizar(editando.id_producto, payload);
        toast.exito(`"${payload.nombre}" se actualizó correctamente.`);
      } else {
        await productoService.crear(payload);
        toast.exito(`"${payload.nombre}" se agregó al catálogo.`);
      }
      cerrarModal();
      cargar();
    } catch (err) {
      if (err.errors) setErrors((prev) => ({ ...prev, ...err.errors }));
      setErrorFormulario(err.message || "No se pudo guardar el producto.");
    } finally {
      setGuardando(false);
    }
  };

  // ---------------- Acciones de fila ----------------
  const alternarEstado = async (producto) => {
    const nuevo = producto.estado === "activo" ? "inactivo" : "activo";
    try {
      await productoService.cambiarEstado(producto.id_producto, nuevo);
      toast.exito(`"${producto.nombre}" quedó ${nuevo}.`);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const alternarDestacado = async (producto) => {
    try {
      await productoService.actualizar(producto.id_producto, {
        nombre: producto.nombre,
        marca: producto.marca,
        id_categoria: producto.id_categoria,
        descripcion: producto.descripcion,
        precio: producto.precio,
        precio_anterior: producto.precio_anterior,
        stock: producto.stock,
        stock_minimo: producto.stock_minimo,
        destacado: !producto.destacado,
        imagen_url: producto.imagen_url,
      });
      toast.exito(
        producto.destacado
          ? `"${producto.nombre}" ya no es destacado.`
          : `"${producto.nombre}" ahora es destacado.`
      );
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmarEliminar = async () => {
    if (!confirmacion) return;
    setProcesando(true);
    try {
      const respuesta = await productoService.eliminar(confirmacion.id_producto);
      toast.exito(respuesta.message);
      setConfirmacion(null);
      cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const columnas = [
    { label: "Producto" },
    { label: "Categoría" },
    { label: "Precio" },
    { label: "Stock" },
    { label: "Estado" },
    { label: "Acciones", className: "text-right" },
  ];

  return (
    <>
      <PanelHeader
        titulo="Productos"
        descripcion="Crea, edita y controla la disponibilidad del catálogo."
        icono="caja"
      >
        <Button onClick={abrirCrear} icono="mas">
          Nuevo producto
        </Button>
      </PanelHeader>

      <Tarjeta sinPadding>
        <div className="p-5 pb-0">
          <BarraFiltros
            busqueda={busqueda}
            onBuscar={setBusqueda}
            placeholder="Buscar por nombre, marca o descripción..."
          >
            <SelectorFiltro
              value={filtroCategoria}
              onChange={setFiltroCategoria}
              ariaLabel="Filtrar por categoría"
              options={[
                { value: "", label: "Todas las categorías" },
                ...categorias.map((c) => ({
                  value: String(c.id_categoria),
                  label: c.nombre,
                })),
              ]}
            />
            <SelectorFiltro
              value={filtroEstado}
              onChange={setFiltroEstado}
              ariaLabel="Filtrar por estado"
              options={[
                { value: "", label: "Todos los estados" },
                { value: "activo", label: "Activos" },
                { value: "inactivo", label: "Inactivos" },
              ]}
            />
            <SelectorFiltro
              value={filtroStock}
              onChange={setFiltroStock}
              ariaLabel="Filtrar por stock"
              options={[
                { value: "", label: "Todo el stock" },
                { value: "disponible", label: "Con existencias" },
                { value: "bajo", label: "Stock bajo" },
                { value: "agotado", label: "Agotados" },
              ]}
            />
          </BarraFiltros>
        </div>

        {error ? (
          <div className="p-5">
            <Alert tipo="error">{error}</Alert>
          </div>
        ) : (
          <>
            <TablaAdmin columnas={columnas}>
              {cargando ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} columnas={6} />)
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <EmptyState
                      icono="caja"
                      titulo="No hay productos con estos filtros"
                      descripcion="Cambia los filtros o crea un producto nuevo."
                      accion="Nuevo producto"
                      onAccion={abrirCrear}
                      className="border-0 bg-transparent py-0"
                    />
                  </td>
                </tr>
              ) : (
                productos.map((p) => (
                  <tr key={p.id_producto} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-dark-800">
                          {p.imagen_url ? (
                            <img
                              src={p.imagen_url}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Icon name="telefono" className="h-5 w-5 text-white/30" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-semibold text-white">
                            {p.nombre}
                            {p.destacado && (
                              <Icon
                                name="estrella"
                                className="h-3.5 w-3.5 shrink-0 text-accent-500"
                                strokeWidth={2.2}
                              />
                            )}
                          </p>
                          <p className="truncate text-xs text-white/50">{p.marca}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {p.categoria || <span className="text-white/30">Sin categoría</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{formatoPrecio(p.precio)}</p>
                      {p.precio_anterior > p.precio && (
                        <p className="text-xs text-white/40 line-through">
                          {formatoPrecio(p.precio_anterior)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tono={
                          p.estado_stock === "agotado"
                            ? "error"
                            : p.estado_stock === "bajo"
                              ? "alerta"
                              : "exito"
                        }
                      >
                        {p.stock} u.
                      </Badge>
                      <p className="mt-0.5 text-[11px] text-white/40">mín. {p.stock_minimo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => alternarEstado(p)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          p.estado === "activo"
                            ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/18"
                            : "border-white/10 bg-dark-800 text-white/50 hover:bg-white/15"
                        }`}
                      >
                        {p.estado === "activo" ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-0.5">
                        <AccionFila
                          icono="estrella"
                          etiqueta={p.destacado ? "Quitar de destacados" : "Marcar como destacado"}
                          tono={p.destacado ? "marca" : "neutro"}
                          onClick={() => alternarDestacado(p)}
                        />
                        <AccionFila
                          icono="editar"
                          etiqueta="Editar producto"
                          tono="marca"
                          onClick={() => abrirEditar(p)}
                        />
                        {esAdmin && (
                          <AccionFila
                            icono="eliminar"
                            etiqueta="Eliminar producto"
                            tono="error"
                            onClick={() => setConfirmacion(p)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </TablaAdmin>

            <div className="px-5">
              <Pagination
                pagina={paginacion.pagina}
                totalPaginas={paginacion.total_paginas}
                total={paginacion.total}
                onCambiar={setPagina}
                etiqueta="productos"
              />
            </div>
          </>
        )}
      </Tarjeta>

      {/* Modal de creación / edición */}
      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title={editando ? "Editar producto" : "Nuevo producto"}
        descripcion={
          editando
            ? "Si cambias el stock, el movimiento queda registrado en el inventario."
            : "El stock inicial se registra como una entrada de inventario."
        }
        size="lg"
      >
        <form onSubmit={guardar} className="space-y-4" noValidate>
          {errorFormulario && <Alert tipo="error">{errorFormulario}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre del producto"
              name="nombre"
              value={values.nombre}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.nombre}
              maxLength={80}
              required
            />
            <Input
              label="Marca"
              name="marca"
              value={values.marca}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.marca}
              maxLength={40}
              required
            />
          </div>

          <Select
            label="Categoría"
            name="id_categoria"
            value={values.id_categoria}
            onChange={handleChange}
            options={categorias.map((c) => ({
              value: String(c.id_categoria),
              label: c.nombre,
            }))}
            placeholder="Sin categoría"
            hint="Las categorías se administran en su propia sección."
          />

          <Textarea
            label="Descripción"
            name="descripcion"
            value={values.descripcion}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={3}
            maxLength={500}
            placeholder="Características principales que verá el cliente en la tienda."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Precio de venta"
              name="precio"
              type="number"
              min="0"
              step="1"
              value={values.precio}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.precio}
              required
            />
            <Input
              label="Precio anterior (opcional)"
              name="precio_anterior"
              type="number"
              min="0"
              step="1"
              value={values.precio_anterior}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.precio_anterior}
              hint="Si es mayor al precio actual, se muestra como oferta."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Stock disponible"
              name="stock"
              type="number"
              min="0"
              step="1"
              value={values.stock}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.stock}
            />
            <Input
              label="Stock mínimo"
              name="stock_minimo"
              type="number"
              min="0"
              step="1"
              value={values.stock_minimo}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.stock_minimo}
              hint="Por debajo de este número se muestra alerta."
            />
          </div>

          <Input
            label="URL de la imagen"
            name="imagen_url"
            value={values.imagen_url}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.imagen_url}
            placeholder="/img/iphone-17.webp o https://..."
            hint="Puedes usar una imagen de la carpeta public/img o una dirección externa."
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4 transition-colors hover:bg-white/5">
            <input
              type="checkbox"
              name="destacado"
              checked={values.destacado}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-white/20 text-brand-500 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-semibold text-white">
                Producto destacado
              </span>
              <span className="block text-xs text-white/50">
                Aparece en la sección de destacados de la página de inicio.
              </span>
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando} icono="check">
              {editando ? "Guardar cambios" : "Crear producto"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmacion}
        onClose={() => setConfirmacion(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar producto"
        mensaje={`¿Seguro que quieres eliminar "${confirmacion?.nombre}"?`}
        detalle="Si el producto ya tiene ventas registradas, se desactivará en lugar de borrarse para no perder el histórico."
        textoConfirmar="Eliminar"
        peligroso
        cargando={procesando}
      />
    </>
  );
}

export default AdminProductos;
