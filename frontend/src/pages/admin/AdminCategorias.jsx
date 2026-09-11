import { useCallback, useEffect, useState } from "react";

import { AccionFila, PanelHeader, TablaAdmin, Tarjeta } from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { ICONOS_CATEGORIA } from "../../utils/iconos";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import { SkeletonFila } from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useForm } from "../../hooks/useForm";
import { categoriaService } from "../../services/categoriaService";

const ICONOS = [
  { value: "phone", label: "Teléfono" },
  { value: "plug", label: "Accesorios / cargador" },
  { value: "headphones", label: "Audio" },
  { value: "watch", label: "Reloj" },
  { value: "tablet", label: "Tableta" },
];

function validarNombre(valor) {
  const v = (valor || "").trim();
  if (!v) return "El nombre es obligatorio.";
  if (v.length < 2) return "Debe tener al menos 2 caracteres.";
  if (v.length > 60) return "Máximo 60 caracteres.";
  return "";
}

/** Gestión de las categorías del catálogo. */
function AdminCategorias() {
  const { esAdmin } = useAuth();
  const toast = useToast();

  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [confirmacion, setConfirmacion] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const { values, errors, handleChange, handleBlur, validateAll, setValues, setErrors, reset } =
    useForm(
      { nombre: "", descripcion: "", icono: "" },
      { nombre: validarNombre }
    );

  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirCategorias() {
      setCargando(true);
      setError("");
      try {
        const lista = await categoriaService.listar({ auth: true });
        if (vivo) setCategorias(lista);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirCategorias();
    return () => {
      vivo = false;
    };
  }, [recarga]);

  const abrirCrear = () => {
    setEditando(null);
    reset();
    setErrorFormulario("");
    setModalAbierto(true);
  };

  const abrirEditar = (categoria) => {
    setEditando(categoria);
    setValues({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || "",
      icono: categoria.icono || "",
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
      descripcion: values.descripcion.trim() || null,
      icono: values.icono || null,
    };

    setGuardando(true);
    try {
      if (editando) {
        await categoriaService.actualizar(editando.id_categoria, payload);
        toast.exito("Categoría actualizada.");
      } else {
        await categoriaService.crear(payload);
        toast.exito("Categoría creada.");
      }
      cerrarModal();
      cargar();
    } catch (err) {
      if (err.errors) setErrors((prev) => ({ ...prev, ...err.errors }));
      setErrorFormulario(err.message || "No se pudo guardar la categoría.");
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = async (categoria) => {
    const nuevo = categoria.estado === "activo" ? "inactivo" : "activo";
    try {
      await categoriaService.cambiarEstado(categoria.id_categoria, nuevo);
      toast.exito(`"${categoria.nombre}" quedó ${nuevo}.`);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmarEliminar = async () => {
    if (!confirmacion) return;
    setProcesando(true);
    try {
      await categoriaService.eliminar(confirmacion.id_categoria);
      toast.exito("Categoría eliminada.");
      setConfirmacion(null);
      cargar();
    } catch (err) {
      toast.error(err.message);
      setConfirmacion(null);
    } finally {
      setProcesando(false);
    }
  };

  const columnas = [
    { label: "Categoría" },
    { label: "Identificador" },
    { label: "Productos" },
    { label: "Estado" },
    { label: "Acciones", className: "text-right" },
  ];

  return (
    <>
      <PanelHeader
        titulo="Categorías"
        descripcion="Organizan el catálogo y los filtros de la tienda."
        icono="cuadricula"
      >
        <Button onClick={abrirCrear} icono="mas">
          Nueva categoría
        </Button>
      </PanelHeader>

      <Tarjeta sinPadding>
        {error ? (
          <div className="p-5">
            <Alert tipo="error">{error}</Alert>
          </div>
        ) : (
          <TablaAdmin columnas={columnas}>
            {cargando ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonFila key={i} columnas={5} />)
            ) : categorias.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10">
                  <EmptyState
                    icono="cuadricula"
                    titulo="Todavía no hay categorías"
                    descripcion="Crea la primera para poder clasificar tus productos."
                    accion="Nueva categoría"
                    onAccion={abrirCrear}
                    className="border-0 bg-transparent py-0"
                  />
                </td>
              </tr>
            ) : (
              categorias.map((c) => (
                <tr key={c.id_categoria} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                        <Icon name={ICONOS_CATEGORIA[c.icono] || "caja"} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{c.nombre}</p>
                        <p className="lineas-2 max-w-xs text-xs text-white/50">
                          {c.descripcion || "Sin descripción"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-dark-800 px-2 py-1 text-xs text-white/60">
                      {c.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tono={c.total_productos > 0 ? "marca" : "slate"}>
                      {c.total_productos ?? 0}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => alternarEstado(c)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        c.estado === "activo"
                          ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/18"
                          : "border-white/10 bg-dark-800 text-white/50 hover:bg-white/15"
                      }`}
                    >
                      {c.estado === "activo" ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-0.5">
                      <AccionFila
                        icono="editar"
                        etiqueta="Editar categoría"
                        tono="marca"
                        onClick={() => abrirEditar(c)}
                      />
                      {esAdmin && (
                        <AccionFila
                          icono="eliminar"
                          etiqueta="Eliminar categoría"
                          tono="error"
                          onClick={() => setConfirmacion(c)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </TablaAdmin>
        )}
      </Tarjeta>

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        title={editando ? "Editar categoría" : "Nueva categoría"}
        descripcion="El identificador para la URL se genera automáticamente a partir del nombre."
      >
        <form onSubmit={guardar} className="space-y-4" noValidate>
          {errorFormulario && <Alert tipo="error">{errorFormulario}</Alert>}

          <Input
            label="Nombre"
            name="nombre"
            value={values.nombre}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.nombre}
            maxLength={60}
            required
          />

          <Textarea
            label="Descripción"
            name="descripcion"
            value={values.descripcion}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={3}
            maxLength={255}
            placeholder="Se muestra en la cabecera del catálogo al filtrar por esta categoría."
          />

          <Select
            label="Icono"
            name="icono"
            value={values.icono}
            onChange={handleChange}
            options={ICONOS}
            placeholder="Sin icono"
            hint="Se muestra en la sección de categorías de la página de inicio."
          />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando} icono="check">
              {editando ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmacion}
        onClose={() => setConfirmacion(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar categoría"
        mensaje={`¿Eliminar la categoría "${confirmacion?.nombre}"?`}
        detalle="Solo se puede eliminar si no tiene productos asociados. Si los tiene, muévelos primero o desactiva la categoría."
        textoConfirmar="Eliminar"
        peligroso
        cargando={procesando}
      />
    </>
  );
}

export default AdminCategorias;
