import { useCallback, useEffect, useState } from "react";

import {
  PanelHeader,
  SelectorFiltro,
  StatCard,
  TablaAdmin,
  Tarjeta,
} from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import { SkeletonFila } from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { useToast } from "../../context/ToastContext";
import { useForm } from "../../hooks/useForm";
import { inventarioService } from "../../services/inventarioService";
import { productoService } from "../../services/productoService";
import { formatoFecha, formatoNumero, formatoPrecio } from "../../utils/formato";

const POR_PAGINA = 15;

const TIPOS = [
  { value: "entrada", label: "Entrada (ingreso de mercancía)" },
  { value: "salida", label: "Salida (baja, daño, préstamo)" },
  { value: "ajuste", label: "Ajuste (fijar el total real)" },
];

const TONO_TIPO = { entrada: "exito", salida: "error", ajuste: "alerta" };

function validarCantidad(valor) {
  if (valor === "" || valor === null) return "La cantidad es obligatoria.";
  const n = Number(valor);
  if (Number.isNaN(n) || n < 0) return "Debe ser un número mayor o igual a 0.";
  if (!Number.isInteger(n)) return "Debe ser un número entero.";
  return "";
}

/**
 * Control de inventario.
 *
 * Muestra las alertas de reposición, permite registrar movimientos
 * (entradas, salidas y ajustes) y consultar el kardex completo. Cada
 * movimiento guarda el stock anterior, el nuevo, el motivo y quién lo
 * hizo, así que siempre se puede reconstruir la historia de un producto.
 */
function AdminInventario() {
  const toast = useToast();

  const [alertas, setAlertas] = useState({ agotados: [], stock_bajo: [], totales: {} });
  const [movimientos, setMovimientos] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true);
  const [error, setError] = useState("");

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroProducto, setFiltroProducto] = useState("");
  const [pagina, setPagina] = useState(1);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");

  const { values, errors, handleChange, handleBlur, validateAll, setValues, setErrors, reset } =
    useForm(
      { id_producto: "", tipo: "entrada", cantidad: "", motivo: "" },
      { id_producto: (v) => (!v ? "Selecciona un producto." : ""), cantidad: validarCantidad }
    );

  // Un solo contador recarga alertas, productos y kardex tras un movimiento.
  const [recarga, setRecarga] = useState(0);
  const recargarTodo = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirAlertas() {
      setCargando(true);
      setError("");
      try {
        const data = await inventarioService.alertas();
        if (vivo) setAlertas(data);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    async function pedirProductos() {
      try {
        const data = await productoService.listar(
          { limite: 100, orden: "nombre" },
          { auth: true }
        );
        if (vivo) setProductos(data.productos);
      } catch {
        if (vivo) setProductos([]);
      }
    }

    pedirAlertas();
    pedirProductos();
    return () => {
      vivo = false;
    };
  }, [recarga]);

  useEffect(() => {
    let vivo = true;

    async function pedirMovimientos() {
      setCargandoMovimientos(true);
      try {
        const data = await inventarioService.listarMovimientos({
          tipo: filtroTipo,
          id_producto: filtroProducto,
          pagina,
          limite: POR_PAGINA,
        });
        if (!vivo) return;
        setMovimientos(data.movimientos);
        setPaginacion(data.paginacion);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargandoMovimientos(false);
      }
    }

    pedirMovimientos();
    return () => {
      vivo = false;
    };
  }, [filtroTipo, filtroProducto, pagina, recarga]);

  const [filtrosPrevios, setFiltrosPrevios] = useState("");
  const filtrosActuales = `${filtroTipo}|${filtroProducto}`;
  if (filtrosPrevios !== filtrosActuales) {
    setFiltrosPrevios(filtrosActuales);
    setPagina(1);
  }

  const abrirMovimiento = (idProducto = "") => {
    reset();
    setValues({
      id_producto: idProducto ? String(idProducto) : "",
      tipo: "entrada",
      cantidad: "",
      motivo: "",
    });
    setErrors({});
    setErrorFormulario("");
    setModalAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorFormulario("");
    if (!validateAll()) return;

    setGuardando(true);
    try {
      const data = await inventarioService.registrarMovimiento({
        id_producto: Number(values.id_producto),
        tipo: values.tipo,
        cantidad: Number(values.cantidad),
        motivo: values.motivo.trim() || null,
      });
      toast.exito(data.message);
      setModalAbierto(false);
      reset();
      recargarTodo();
    } catch (err) {
      if (err.errors) setErrors((prev) => ({ ...prev, ...err.errors }));
      setErrorFormulario(err.message || "No se pudo registrar el movimiento.");
    } finally {
      setGuardando(false);
    }
  };

  const productoSeleccionado = productos.find(
    (p) => String(p.id_producto) === String(values.id_producto)
  );

  const valorInventario = productos.reduce(
    (acc, p) => acc + Number(p.precio || 0) * Number(p.stock || 0),
    0
  );

  const columnasMovimientos = [
    { label: "Fecha" },
    { label: "Producto" },
    { label: "Tipo" },
    { label: "Cantidad" },
    { label: "Stock" },
    { label: "Motivo" },
    { label: "Responsable" },
  ];

  const listaAlertas = [...(alertas.agotados || []), ...(alertas.stock_bajo || [])];

  return (
    <>
      <PanelHeader
        titulo="Inventario"
        descripcion="Entradas, salidas y ajustes de stock, con historial completo."
        icono="almacen"
      >
        <Button onClick={() => abrirMovimiento()} icono="mas">
          Registrar movimiento
        </Button>
      </PanelHeader>

      {error && (
        <Alert tipo="error" className="mb-5">
          {error}
        </Alert>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          etiqueta="Productos agotados"
          valor={formatoNumero(alertas.totales?.agotados || 0)}
          detalle="Sin unidades disponibles"
          icono="alerta"
          tono={alertas.totales?.agotados > 0 ? "error" : "exito"}
          alerta={alertas.totales?.agotados > 0}
          cargando={cargando}
        />
        <StatCard
          etiqueta="Con stock bajo"
          valor={formatoNumero(alertas.totales?.stock_bajo || 0)}
          detalle="Por debajo del mínimo definido"
          icono="almacen"
          tono={alertas.totales?.stock_bajo > 0 ? "alerta" : "exito"}
          cargando={cargando}
        />
        <StatCard
          etiqueta="Valor del inventario"
          valor={formatoPrecio(valorInventario)}
          detalle="Precio de venta × existencias"
          icono="billete"
          tono="marca"
          cargando={cargando}
        />
      </div>

      {/* Alertas de reposición */}
      <Tarjeta
        titulo="Productos por reponer"
        descripcion="Agotados y con stock por debajo del mínimo"
        className="mb-5"
        sinPadding
      >
        {cargando ? (
          <div className="space-y-3 p-5">
            <div className="skeleton h-12 w-full rounded-lg" />
            <div className="skeleton h-12 w-full rounded-lg" />
          </div>
        ) : listaAlertas.length === 0 ? (
          <div className="p-8 text-center">
            <Icon name="checkCirculo" className="mx-auto mb-2 h-9 w-9 text-emerald-500" />
            <p className="text-sm font-semibold text-white/80">Inventario saludable</p>
            <p className="text-xs text-white/50">
              Ningún producto activo está agotado ni por debajo de su mínimo.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {listaAlertas.map((p) => (
              <li
                key={p.id_producto}
                className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-dark-800">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Icon name="telefono" className="h-5 w-5 text-white/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{p.nombre}</p>
                    <p className="text-xs text-white/50">
                      {p.marca} · mínimo {p.stock_minimo} u.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Badge tono={p.stock <= 0 ? "error" : "alerta"}>
                    {p.stock <= 0 ? "Agotado" : `Quedan ${p.stock}`}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    icono="mas"
                    onClick={() => abrirMovimiento(p.id_producto)}
                  >
                    Reponer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {/* Kardex */}
      <Tarjeta
        titulo="Historial de movimientos"
        descripcion="Cada cambio de stock queda registrado aquí (kardex)"
        acciones={
          <div className="flex flex-wrap gap-2">
            <SelectorFiltro
              value={filtroTipo}
              onChange={setFiltroTipo}
              ariaLabel="Filtrar por tipo de movimiento"
              options={[
                { value: "", label: "Todos los tipos" },
                { value: "entrada", label: "Entradas" },
                { value: "salida", label: "Salidas" },
                { value: "ajuste", label: "Ajustes" },
              ]}
            />
            <SelectorFiltro
              value={filtroProducto}
              onChange={setFiltroProducto}
              ariaLabel="Filtrar por producto"
              options={[
                { value: "", label: "Todos los productos" },
                ...productos.map((p) => ({
                  value: String(p.id_producto),
                  label: p.nombre,
                })),
              ]}
            />
          </div>
        }
        sinPadding
      >
        <TablaAdmin columnas={columnasMovimientos}>
          {cargandoMovimientos ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} columnas={7} />)
          ) : movimientos.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10">
                <EmptyState
                  icono="almacen"
                  titulo="Sin movimientos registrados"
                  descripcion="Los movimientos aparecen al crear productos, registrar entradas o vender."
                  accion="Registrar movimiento"
                  onAccion={() => abrirMovimiento()}
                  className="border-0 bg-transparent py-0"
                />
              </td>
            </tr>
          ) : (
            movimientos.map((m) => (
              <tr key={m.id_movimiento} className="transition-colors hover:bg-white/5">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-white/50">
                  {formatoFecha(m.creado_en)}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {m.producto || <span className="text-white/30">Producto eliminado</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge tono={TONO_TIPO[m.tipo]}>
                    {m.tipo === "entrada" ? "Entrada" : m.tipo === "salida" ? "Salida" : "Ajuste"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-bold ${
                      m.stock_nuevo >= m.stock_anterior ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {m.stock_nuevo >= m.stock_anterior ? "+" : "−"}
                    {m.cantidad}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-white/60">
                  {m.stock_anterior} → <strong className="text-white">{m.stock_nuevo}</strong>
                </td>
                <td className="px-4 py-3">
                  <p className="lineas-2 max-w-xs text-xs text-white/50">{m.motivo || "—"}</p>
                </td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {m.usuario || <span className="text-white/30">Sistema</span>}
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
            etiqueta="movimientos"
          />
        </div>
      </Tarjeta>

      {/* Modal de movimiento */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Registrar movimiento de inventario"
        descripcion="Queda guardado con el stock anterior, el nuevo y tu nombre."
      >
        <form onSubmit={guardar} className="space-y-4" noValidate>
          {errorFormulario && <Alert tipo="error">{errorFormulario}</Alert>}

          <Select
            label="Producto"
            name="id_producto"
            value={values.id_producto}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.id_producto}
            options={productos.map((p) => ({
              value: String(p.id_producto),
              label: `${p.nombre} (${p.stock} u.)`,
            }))}
            placeholder="Selecciona un producto"
            required
          />

          <Select
            label="Tipo de movimiento"
            name="tipo"
            value={values.tipo}
            onChange={handleChange}
            options={TIPOS}
            placeholder={null}
            hint={
              values.tipo === "ajuste"
                ? "En un ajuste, la cantidad es el total real que quedará en bodega."
                : values.tipo === "entrada"
                  ? "La cantidad se suma al stock actual."
                  : "La cantidad se resta del stock actual."
            }
          />

          <Input
            label={values.tipo === "ajuste" ? "Existencias reales" : "Cantidad"}
            name="cantidad"
            type="number"
            min="0"
            step="1"
            value={values.cantidad}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.cantidad}
            required
          />

          {productoSeleccionado && values.cantidad !== "" && (
            <Alert tipo="info">
              <strong>{productoSeleccionado.nombre}</strong> pasará de{" "}
              <strong>{productoSeleccionado.stock}</strong> a{" "}
              <strong>
                {values.tipo === "entrada"
                  ? productoSeleccionado.stock + Number(values.cantidad || 0)
                  : values.tipo === "salida"
                    ? Math.max(0, productoSeleccionado.stock - Number(values.cantidad || 0))
                    : Number(values.cantidad || 0)}
              </strong>{" "}
              unidades.
            </Alert>
          )}

          <Textarea
            label="Motivo"
            name="motivo"
            value={values.motivo}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={2}
            maxLength={150}
            placeholder="Ej: compra al proveedor, equipo dañado, conteo físico..."
          />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando} icono="check">
              Registrar movimiento
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default AdminInventario;
