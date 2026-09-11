import { useCallback, useEffect, useState } from "react";

import { AccionFila, PanelHeader, TablaAdmin, Tarjeta } from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import Icon from "../../components/ui/Icon";
import { ICONOS_SERVICIO } from "../../utils/iconos";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import { SkeletonFila } from "../../components/ui/Skeleton";
import Textarea from "../../components/ui/Textarea";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useForm } from "../../hooks/useForm";
import { servicioService } from "../../services/servicioService";
import { formatoPrecio } from "../../utils/formato";

const ICONOS = [
  { value: "screen", label: "Pantalla" },
  { value: "battery", label: "Batería" },
  { value: "shield", label: "Garantía" },
  { value: "search", label: "Diagnóstico" },
  { value: "unlock", label: "Liberación" },
  { value: "cloud", label: "Respaldo de datos" },
];

function validarNombre(valor) {
  const v = (valor || "").trim();
  if (!v) return "El nombre es obligatorio.";
  if (v.length < 2) return "Debe tener al menos 2 caracteres.";
  if (v.length > 80) return "Máximo 80 caracteres.";
  return "";
}

function validarPrecio(valor) {
  if (valor === "" || valor === null) return "El precio es obligatorio.";
  if (Number.isNaN(Number(valor)) || Number(valor) < 0)
    return "Debe ser un número mayor o igual a 0.";
  return "";
}

/** Gestión de los servicios técnicos publicados en la tienda. */
function AdminServicios() {
  const { esAdmin } = useAuth();
  const toast = useToast();

  const [servicios, setServicios] = useState([]);
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
      { nombre: "", descripcion: "", precio: "", duracion: "", icono: "", imagen_url: "" },
      { nombre: validarNombre, precio: validarPrecio }
    );

  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirServicios() {
      setCargando(true);
      setError("");
      try {
        const lista = await servicioService.listar({ auth: true });
        if (vivo) setServicios(lista);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirServicios();
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

  const abrirEditar = (servicio) => {
    setEditando(servicio);
    setValues({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || "",
      precio: String(servicio.precio ?? ""),
      duracion: servicio.duracion || "",
      icono: servicio.icono || "",
      imagen_url: servicio.imagen_url || "",
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
      precio: Number(values.precio),
      duracion: values.duracion.trim() || null,
      icono: values.icono || null,
      imagen_url: values.imagen_url.trim() || null,
    };

    setGuardando(true);
    try {
      if (editando) {
        await servicioService.actualizar(editando.id_servicio, payload);
        toast.exito("Servicio actualizado.");
      } else {
        await servicioService.crear(payload);
        toast.exito("Servicio creado.");
      }
      cerrarModal();
      cargar();
    } catch (err) {
      if (err.errors) setErrors((prev) => ({ ...prev, ...err.errors }));
      setErrorFormulario(err.message || "No se pudo guardar el servicio.");
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = async (servicio) => {
    const nuevo = servicio.estado === "activo" ? "inactivo" : "activo";
    try {
      await servicioService.cambiarEstado(servicio.id_servicio, nuevo);
      toast.exito(`"${servicio.nombre}" quedó ${nuevo}.`);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmarEliminar = async () => {
    if (!confirmacion) return;
    setProcesando(true);
    try {
      const respuesta = await servicioService.eliminar(confirmacion.id_servicio);
      toast.exito(respuesta.message);
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
    { label: "Servicio" },
    { label: "Precio" },
    { label: "Duración" },
    { label: "Estado" },
    { label: "Acciones", className: "text-right" },
  ];

  return (
    <>
      <PanelHeader
        titulo="Servicios técnicos"
        descripcion="Los servicios activos son los que los clientes pueden agendar."
        icono="herramienta"
      >
        <Button onClick={abrirCrear} icono="mas">
          Nuevo servicio
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
            ) : servicios.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10">
                  <EmptyState
                    icono="herramienta"
                    titulo="Todavía no hay servicios"
                    descripcion="Crea el primero para que aparezca en la página de servicios."
                    accion="Nuevo servicio"
                    onAccion={abrirCrear}
                    className="border-0 bg-transparent py-0"
                  />
                </td>
              </tr>
            ) : (
              servicios.map((s) => (
                <tr key={s.id_servicio} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                        <Icon
                          name={ICONOS_SERVICIO[s.icono] || "herramienta"}
                          className="h-5 w-5"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{s.nombre}</p>
                        <p className="lineas-2 max-w-md text-xs text-white/50">
                          {s.descripcion || "Sin descripción"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
                    {formatoPrecio(s.precio)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">
                    {s.duracion || <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => alternarEstado(s)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        s.estado === "activo"
                          ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/18"
                          : "border-white/10 bg-dark-800 text-white/50 hover:bg-white/15"
                      }`}
                    >
                      {s.estado === "activo" ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-0.5">
                      <AccionFila
                        icono="editar"
                        etiqueta="Editar servicio"
                        tono="marca"
                        onClick={() => abrirEditar(s)}
                      />
                      {esAdmin && (
                        <AccionFila
                          icono="eliminar"
                          etiqueta="Eliminar servicio"
                          tono="error"
                          onClick={() => setConfirmacion(s)}
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
        title={editando ? "Editar servicio" : "Nuevo servicio"}
        size="lg"
      >
        <form onSubmit={guardar} className="space-y-4" noValidate>
          {errorFormulario && <Alert tipo="error">{errorFormulario}</Alert>}

          <Input
            label="Nombre del servicio"
            name="nombre"
            value={values.nombre}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.nombre}
            maxLength={80}
            required
          />

          <Textarea
            label="Descripción"
            name="descripcion"
            value={values.descripcion}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={3}
            maxLength={500}
            placeholder="Qué incluye el servicio y qué garantía tiene."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Precio base"
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
              label="Duración estimada"
              name="duracion"
              value={values.duracion}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={40}
              placeholder="2 a 4 horas"
            />
          </div>

          <Select
            label="Icono"
            name="icono"
            value={values.icono}
            onChange={handleChange}
            options={ICONOS}
            placeholder="Icono por defecto"
          />

          <Input
            label="URL de imagen (opcional)"
            name="imagen_url"
            value={values.imagen_url}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.imagen_url}
            placeholder="/img/vitrina-tienda.jpg o https://..."
          />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando} icono="check">
              {editando ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmacion}
        onClose={() => setConfirmacion(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar servicio"
        mensaje={`¿Eliminar el servicio "${confirmacion?.nombre}"?`}
        detalle="Si ya tiene solicitudes registradas, se desactivará en lugar de borrarse para conservar el histórico."
        textoConfirmar="Eliminar"
        peligroso
        cargando={procesando}
      />
    </>
  );
}

export default AdminServicios;
