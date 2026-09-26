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
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import { SkeletonFila } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDebounce } from "../../hooks/useDebounce";
import { useForm } from "../../hooks/useForm";
import { usuarioService } from "../../services/usuarioService";
import { formatoFecha } from "../../utils/formato";
import {
  required,
  validateDireccion,
  validateDocumento,
  validateEmail,
  validateNombre,
  validatePassword,
  validateTelefono,
} from "../../utils/validations";

const POR_PAGINA = 10;

const ROLES = [
  { value: "1", label: "Administrador" },
  { value: "2", label: "Empleado" },
  { value: "3", label: "Cliente" },
];

const TIPOS_DOCUMENTO = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
];

const TONO_ROL = { 1: "error", 2: "alerta", 3: "marca" };

const valoresCrear = {
  nombre: "",
  apellido: "",
  tipoDocumento: "",
  numeroDocumento: "",
  direccion: "",
  telefono: "",
  email: "",
  password: "",
  id_rol: "3",
};

/**
 * Gestión de usuarios (solo administrador).
 *
 * El backend impide que un administrador se desactive, se cambie el rol
 * o se elimine a sí mismo, y que el sistema quede sin administradores.
 */
function AdminUsuarios() {
  const { usuario: yo } = useAuth();
  const toast = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [paginacion, setPaginacion] = useState({ pagina: 1, total: 0, total_paginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const busquedaRetrasada = useDebounce(busqueda, 400);
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [pagina, setPagina] = useState(1);

  const [modo, setModo] = useState(null); // "crear" | "editar"
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [confirmacion, setConfirmacion] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const formCrear = useForm(valoresCrear, {
    nombre: validateNombre,
    apellido: validateNombre,
    tipoDocumento: required,
    numeroDocumento: validateDocumento,
    direccion: validateDireccion,
    telefono: validateTelefono,
    email: validateEmail,
    password: validatePassword,
  });

  const formEditar = useForm(
    { nombre: "", apellido: "", direccion: "", telefono: "", email: "" },
    {
      nombre: validateNombre,
      apellido: validateNombre,
      direccion: validateDireccion,
      telefono: validateTelefono,
      email: validateEmail,
    }
  );

  // Contador que fuerza la recarga tras crear, editar o eliminar.
  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;

    async function pedirUsuarios() {
      setCargando(true);
      setError("");
      try {
        const data = await usuarioService.listar({
          buscar: busquedaRetrasada,
          rol: filtroRol,
          estado: filtroEstado,
          pagina,
          limite: POR_PAGINA,
        });
        if (!vivo) return;
        setUsuarios(data.usuarios);
        setPaginacion(data.paginacion);
      } catch (err) {
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    pedirUsuarios();
    return () => {
      vivo = false;
    };
  }, [busquedaRetrasada, filtroRol, filtroEstado, pagina, recarga]);

  // Al cambiar un filtro se vuelve a la primera página (ajuste en render).
  const [filtrosPrevios, setFiltrosPrevios] = useState("");
  const filtrosActuales = `${busquedaRetrasada}|${filtroRol}|${filtroEstado}`;
  if (filtrosPrevios !== filtrosActuales) {
    setFiltrosPrevios(filtrosActuales);
    setPagina(1);
  }

  const abrirCrear = () => {
    formCrear.reset();
    setErrorFormulario("");
    setModo("crear");
  };

  const abrirEditar = (usuario) => {
    setEditando(usuario);
    formEditar.setValues({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      direccion: usuario.direccion,
      telefono: usuario.telefono,
      email: usuario.email,
    });
    formEditar.setErrors({});
    setErrorFormulario("");
    setModo("editar");
  };

  const cerrarModal = () => {
    setModo(null);
    setEditando(null);
    formCrear.reset();
    formEditar.reset();
  };

  const crear = async (e) => {
    e.preventDefault();
    setErrorFormulario("");
    if (!formCrear.validateAll()) return;

    setGuardando(true);
    try {
      await usuarioService.crear({
        ...formCrear.values,
        id_rol: Number(formCrear.values.id_rol),
      });
      toast.exito("Usuario creado correctamente.");
      cerrarModal();
      cargar();
    } catch (err) {
      if (err.errors) formCrear.setErrors((prev) => ({ ...prev, ...err.errors }));
      setErrorFormulario(err.message || "No se pudo crear el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const actualizar = async (e) => {
    e.preventDefault();
    setErrorFormulario("");
    if (!formEditar.validateAll()) return;

    setGuardando(true);
    try {
      await usuarioService.actualizar(editando.id_usuario, formEditar.values);
      toast.exito("Usuario actualizado.");
      cerrarModal();
      cargar();
    } catch (err) {
      if (err.errors) formEditar.setErrors((prev) => ({ ...prev, ...err.errors }));
      setErrorFormulario(err.message || "No se pudo actualizar el usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarRol = async (usuario, id_rol) => {
    try {
      await usuarioService.cambiarRol(usuario.id_usuario, Number(id_rol));
      toast.exito(`Rol de ${usuario.nombre} actualizado.`);
      cargar();
    } catch (err) {
      toast.error(err.message);
      cargar();
    }
  };

  const alternarEstado = async (usuario) => {
    const nuevo = usuario.estado === "activo" ? "inactivo" : "activo";
    try {
      await usuarioService.cambiarEstado(usuario.id_usuario, nuevo);
      toast.exito(`La cuenta de ${usuario.nombre} quedó ${nuevo}.`);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmarEliminar = async () => {
    if (!confirmacion) return;
    setProcesando(true);
    try {
      const respuesta = await usuarioService.eliminar(confirmacion.id_usuario);
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
    { label: "Usuario" },
    { label: "Documento" },
    { label: "Contacto" },
    { label: "Rol" },
    { label: "Estado" },
    { label: "Registro" },
    { label: "Acciones", className: "text-right" },
  ];

  return (
    <>
      <PanelHeader
        titulo="Usuarios"
        descripcion="Cuentas registradas, roles y permisos del sistema."
        icono="usuarios"
      >
        <Button onClick={abrirCrear} icono="mas">
          Nuevo usuario
        </Button>
      </PanelHeader>

      <Alert tipo="info" className="mb-5">
        Por seguridad no puedes desactivar, cambiar de rol ni eliminar tu propia cuenta, y
        el sistema siempre conserva al menos un administrador activo.
      </Alert>

      <Tarjeta sinPadding>
        <div className="p-5 pb-0">
          <BarraFiltros
            busqueda={busqueda}
            onBuscar={setBusqueda}
            placeholder="Buscar por nombre, correo o documento..."
          >
            <SelectorFiltro
              value={filtroRol}
              onChange={setFiltroRol}
              ariaLabel="Filtrar por rol"
              options={[{ value: "", label: "Todos los roles" }, ...ROLES]}
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
                Array.from({ length: 5 }).map((_, i) => <SkeletonFila key={i} columnas={7} />)
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <EmptyState
                      icono="usuarios"
                      titulo="No hay usuarios con estos filtros"
                      descripcion="Prueba con otra búsqueda o cambia los filtros."
                      className="border-0 bg-transparent py-0"
                    />
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const esYo = u.id_usuario === yo?.id_usuario;
                  return (
                    <tr key={u.id_usuario} className="transition-colors hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
                            {u.nombre.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {u.nombre} {u.apellido}
                              {esYo && (
                                <span className="ml-1.5 text-[11px] font-normal text-brand-500">
                                  (tú)
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-white/50">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-white/60">
                        {u.tipo_documento} {u.numero_documento}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/60">{u.telefono}</p>
                        <p className="lineas-2 max-w-[14rem] text-xs text-white/40">
                          {u.direccion}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {esYo ? (
                          <Badge tono={TONO_ROL[u.id_rol]}>{u.rol}</Badge>
                        ) : (
                          <select
                            value={String(u.id_rol)}
                            onChange={(e) => cambiarRol(u, e.target.value)}
                            aria-label={`Rol de ${u.nombre}`}
                            style={{ colorScheme: "dark" }}
                            className="rounded-lg border border-white/10 bg-dark-900 px-2 py-1.5 text-xs font-semibold text-white/80 outline-none transition-colors focus:border-brand-500"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => alternarEstado(u)}
                          disabled={esYo}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            u.estado === "activo"
                              ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/18"
                              : "border-white/10 bg-dark-800 text-white/50 hover:bg-white/15"
                          }`}
                        >
                          {u.estado === "activo" ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-white/50">
                        {formatoFecha(u.creado_en, { conHora: false })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-0.5">
                          <AccionFila
                            icono="editar"
                            etiqueta="Editar usuario"
                            tono="marca"
                            onClick={() => abrirEditar(u)}
                          />
                          <AccionFila
                            icono="eliminar"
                            etiqueta={
                              esYo ? "No puedes eliminar tu cuenta" : "Eliminar usuario"
                            }
                            tono="error"
                            disabled={esYo}
                            onClick={() => setConfirmacion(u)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </TablaAdmin>

            <div className="px-5">
              <Pagination
                pagina={paginacion.pagina}
                totalPaginas={paginacion.total_paginas}
                total={paginacion.total}
                onCambiar={setPagina}
                etiqueta="usuarios"
              />
            </div>
          </>
        )}
      </Tarjeta>

      {/* Crear usuario */}
      <Modal
        isOpen={modo === "crear"}
        onClose={cerrarModal}
        title="Nuevo usuario"
        descripcion="La contraseña se guarda cifrada con bcrypt."
        size="lg"
      >
        <form onSubmit={crear} className="space-y-4" noValidate>
          {errorFormulario && <Alert tipo="error">{errorFormulario}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              name="nombre"
              value={formCrear.values.nombre}
              onChange={formCrear.handleChange}
              onBlur={formCrear.handleBlur}
              error={formCrear.errors.nombre}
              maxLength={40}
              required
            />
            <Input
              label="Apellido"
              name="apellido"
              value={formCrear.values.apellido}
              onChange={formCrear.handleChange}
              onBlur={formCrear.handleBlur}
              error={formCrear.errors.apellido}
              maxLength={40}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de documento"
              name="tipoDocumento"
              value={formCrear.values.tipoDocumento}
              onChange={formCrear.handleChange}
              onBlur={formCrear.handleBlur}
              error={formCrear.errors.tipoDocumento}
              options={TIPOS_DOCUMENTO}
              required
            />
            <Input
              label="Número de documento"
              name="numeroDocumento"
              value={formCrear.values.numeroDocumento}
              onChange={formCrear.handleChange}
              onBlur={formCrear.handleBlur}
              error={formCrear.errors.numeroDocumento}
              maxLength={12}
              hint="Entre 6 y 12 dígitos."
              required
            />
          </div>

          <Input
            label="Dirección"
            name="direccion"
            value={formCrear.values.direccion}
            onChange={formCrear.handleChange}
            onBlur={formCrear.handleBlur}
            error={formCrear.errors.direccion}
            maxLength={150}
            hint="Entre 10 y 150 caracteres."
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono"
              name="telefono"
              value={formCrear.values.telefono}
              onChange={formCrear.handleChange}
              onBlur={formCrear.handleBlur}
              error={formCrear.errors.telefono}
              maxLength={15}
              required
            />
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              value={formCrear.values.email}
              onChange={formCrear.handleChange}
              onBlur={formCrear.handleBlur}
              error={formCrear.errors.email}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={formCrear.values.password}
              onChange={formCrear.handleChange}
              onBlur={formCrear.handleBlur}
              error={formCrear.errors.password}
              maxLength={20}
              hint="8 a 20 caracteres, con mayúscula, minúscula y número."
              required
            />
            <Select
              label="Rol"
              name="id_rol"
              value={formCrear.values.id_rol}
              onChange={formCrear.handleChange}
              options={ROLES}
              placeholder={null}
              hint="Define a qué partes del sistema tendrá acceso."
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando} icono="check">
              Crear usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Editar usuario */}
      <Modal
        isOpen={modo === "editar"}
        onClose={cerrarModal}
        title={`Editar a ${editando?.nombre || ""}`}
        descripcion="El documento y la contraseña no se editan desde aquí."
        size="lg"
      >
        <form onSubmit={actualizar} className="space-y-4" noValidate>
          {errorFormulario && <Alert tipo="error">{errorFormulario}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              name="nombre"
              value={formEditar.values.nombre}
              onChange={formEditar.handleChange}
              onBlur={formEditar.handleBlur}
              error={formEditar.errors.nombre}
              maxLength={40}
              required
            />
            <Input
              label="Apellido"
              name="apellido"
              value={formEditar.values.apellido}
              onChange={formEditar.handleChange}
              onBlur={formEditar.handleBlur}
              error={formEditar.errors.apellido}
              maxLength={40}
              required
            />
          </div>

          <Input
            label="Dirección"
            name="direccion"
            value={formEditar.values.direccion}
            onChange={formEditar.handleChange}
            onBlur={formEditar.handleBlur}
            error={formEditar.errors.direccion}
            maxLength={150}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono"
              name="telefono"
              value={formEditar.values.telefono}
              onChange={formEditar.handleChange}
              onBlur={formEditar.handleBlur}
              error={formEditar.errors.telefono}
              maxLength={15}
              required
            />
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              value={formEditar.values.email}
              onChange={formEditar.handleChange}
              onBlur={formEditar.handleBlur}
              error={formEditar.errors.email}
              required
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" cargando={guardando} icono="check">
              Guardar cambios
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmacion}
        onClose={() => setConfirmacion(null)}
        onConfirmar={confirmarEliminar}
        titulo="Eliminar usuario"
        mensaje={`¿Eliminar la cuenta de ${confirmacion?.nombre} ${confirmacion?.apellido}?`}
        detalle="Si el usuario tiene pedidos registrados, se desactivará en lugar de borrarse para conservar el histórico de ventas."
        textoConfirmar="Eliminar"
        peligroso
        cargando={procesando}
      />
    </>
  );
}

export default AdminUsuarios;
