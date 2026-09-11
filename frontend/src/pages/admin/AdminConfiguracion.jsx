import { useEffect, useState } from "react";

import { PanelHeader, Tarjeta } from "../../components/admin/PanelUI";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";
import Input from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useForm } from "../../hooks/useForm";
import { API_URL } from "../../services/api";
import { authService } from "../../services/authService";
import { UMBRAL_ENVIO_GRATIS, COSTO_ENVIO } from "../../context/CartContext";
import { formatoPrecio } from "../../utils/formato";
import {
  required,
  validateConfirmPassword,
  validateDireccion,
  validateNombre,
  validatePassword,
  validateTelefono,
} from "../../utils/validations";

const PERMISOS = {
  administrador: [
    "Gestión completa de usuarios, roles y estados",
    "Crear, editar y eliminar productos, categorías y servicios",
    "Ver y cambiar el estado de todos los pedidos",
    "Registrar movimientos de inventario",
    "Atender solicitudes de servicio y mensajes de contacto",
    "Ver el dashboard y generar reportes",
  ],
  empleado: [
    "Consultar el listado de usuarios (sin editarlos)",
    "Crear y editar productos, categorías y servicios (sin eliminarlos)",
    "Ver y cambiar el estado de los pedidos",
    "Registrar movimientos de inventario",
    "Atender solicitudes de servicio y mensajes de contacto",
    "Ver el dashboard y generar reportes",
  ],
};

/**
 * Cuenta del administrador y referencia de configuración del sistema.
 *
 * Los parámetros técnicos (base de datos, JWT, correo saliente) viven en
 * backend-fastapi/.env y no se editan desde el navegador: exponerlos
 * sería una puerta abierta. Aquí se documenta dónde están.
 */
function AdminConfiguracion() {
  const { usuario, rol, esAdmin, actualizarUsuario } = useAuth();
  const toast = useToast();

  const [guardando, setGuardando] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [errorPassword, setErrorPassword] = useState("");

  const perfil = useForm(
    { nombre: "", apellido: "", direccion: "", telefono: "" },
    {
      nombre: validateNombre,
      apellido: validateNombre,
      direccion: validateDireccion,
      telefono: validateTelefono,
    }
  );

  const clave = useForm(
    { passwordActual: "", passwordNueva: "", confirmPassword: "" },
    {
      passwordActual: required,
      passwordNueva: validatePassword,
      confirmPassword: (valor, todos) =>
        validateConfirmPassword(todos.passwordNueva)(valor),
    }
  );

  useEffect(() => {
    if (!usuario) return;
    perfil.setValues({
      nombre: usuario.nombre || "",
      apellido: usuario.apellido || "",
      direccion: usuario.direccion || "",
      telefono: usuario.telefono || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setErrorPerfil("");
    if (!perfil.validateAll()) return;

    setGuardando(true);
    try {
      const actualizado = await authService.actualizarPerfil({
        nombre: perfil.values.nombre.trim(),
        apellido: perfil.values.apellido.trim(),
        direccion: perfil.values.direccion.trim(),
        telefono: perfil.values.telefono.trim(),
      });
      actualizarUsuario(actualizado);
      toast.exito("Tus datos se actualizaron correctamente.");
    } catch (err) {
      if (err.errors) perfil.setErrors((prev) => ({ ...prev, ...err.errors }));
      setErrorPerfil(err.message || "No pudimos guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    setErrorPassword("");
    if (!clave.validateAll()) return;

    setCambiando(true);
    try {
      await authService.cambiarPassword({
        passwordActual: clave.values.passwordActual,
        passwordNueva: clave.values.passwordNueva,
      });
      clave.reset();
      toast.exito("Contraseña actualizada correctamente.");
    } catch (err) {
      if (err.errors) clave.setErrors((prev) => ({ ...prev, ...err.errors }));
      setErrorPassword(err.message || "No pudimos cambiar la contraseña.");
    } finally {
      setCambiando(false);
    }
  };

  return (
    <>
      <PanelHeader
        titulo="Configuración"
        descripcion="Tu cuenta, tus permisos y los parámetros del sistema."
        icono="engranaje"
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Datos de la cuenta */}
        <Tarjeta titulo="Mi cuenta" descripcion="Datos de la persona que administra la tienda">
          <div className="mb-5 flex items-center gap-4 rounded-xl bg-dark-900 p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white">
              {(usuario?.nombre || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white">
                {usuario?.nombre} {usuario?.apellido}
              </p>
              <p className="truncate text-sm text-white/50">{usuario?.email}</p>
              <Badge tono={esAdmin ? "error" : "alerta"} className="mt-1.5">
                {rol}
              </Badge>
            </div>
          </div>

          <form onSubmit={guardarPerfil} className="space-y-4" noValidate>
            {errorPerfil && <Alert tipo="error">{errorPerfil}</Alert>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre"
                name="nombre"
                value={perfil.values.nombre}
                onChange={perfil.handleChange}
                onBlur={perfil.handleBlur}
                error={perfil.errors.nombre}
                maxLength={40}
                required
              />
              <Input
                label="Apellido"
                name="apellido"
                value={perfil.values.apellido}
                onChange={perfil.handleChange}
                onBlur={perfil.handleBlur}
                error={perfil.errors.apellido}
                maxLength={40}
                required
              />
            </div>

            <Input
              label="Dirección"
              name="direccion"
              value={perfil.values.direccion}
              onChange={perfil.handleChange}
              onBlur={perfil.handleBlur}
              error={perfil.errors.direccion}
              maxLength={150}
              required
            />

            <Input
              label="Teléfono"
              name="telefono"
              value={perfil.values.telefono}
              onChange={perfil.handleChange}
              onBlur={perfil.handleBlur}
              error={perfil.errors.telefono}
              maxLength={15}
              required
            />

            <div className="flex justify-end">
              <Button type="submit" cargando={guardando} icono="check">
                Guardar cambios
              </Button>
            </div>
          </form>
        </Tarjeta>

        {/* Contraseña */}
        <Tarjeta
          titulo="Seguridad de la cuenta"
          descripcion="La contraseña se guarda cifrada con bcrypt"
        >
          <form onSubmit={cambiarPassword} className="space-y-4" noValidate>
            {errorPassword && <Alert tipo="error">{errorPassword}</Alert>}

            <Input
              label="Contraseña actual"
              name="passwordActual"
              type="password"
              value={clave.values.passwordActual}
              onChange={clave.handleChange}
              onBlur={clave.handleBlur}
              error={clave.errors.passwordActual}
              autoComplete="current-password"
              required
            />
            <Input
              label="Contraseña nueva"
              name="passwordNueva"
              type="password"
              value={clave.values.passwordNueva}
              onChange={clave.handleChange}
              onBlur={clave.handleBlur}
              error={clave.errors.passwordNueva}
              hint="8 a 20 caracteres, con mayúscula, minúscula y número."
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirmar contraseña nueva"
              name="confirmPassword"
              type="password"
              value={clave.values.confirmPassword}
              onChange={clave.handleChange}
              onBlur={clave.handleBlur}
              error={clave.errors.confirmPassword}
              autoComplete="new-password"
              required
            />

            <div className="flex justify-end">
              <Button type="submit" variant="oscuro" cargando={cambiando} icono="candado">
                Cambiar contraseña
              </Button>
            </div>
          </form>

          <Alert tipo="info" className="mt-5">
            Si olvidas la contraseña, usa “¿Olvidaste tu contraseña?” en el inicio de
            sesión. El enlace de recuperación caduca en 30 minutos y solo sirve una vez.
          </Alert>
        </Tarjeta>

        {/* Permisos del rol */}
        <Tarjeta
          titulo={`Permisos del rol: ${rol}`}
          descripcion="Lo que el backend te autoriza a hacer"
        >
          <ul className="space-y-2.5">
            {(PERMISOS[rol] || []).map((permiso) => (
              <li key={permiso} className="flex items-start gap-2.5 text-sm text-white/60">
                <Icon
                  name="checkCirculo"
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                />
                {permiso}
              </li>
            ))}
          </ul>

          <Alert tipo="info" className="mt-5">
            Estos permisos se verifican en el servidor en cada petición. Aunque alguien
            escriba una URL administrativa a mano o llame a la API directamente, sin el
            rol correcto la respuesta es 403.
          </Alert>
        </Tarjeta>

        {/* Parámetros del sistema */}
        <Tarjeta
          titulo="Parámetros del sistema"
          descripcion="Valores vigentes de la tienda y dónde se configuran"
        >
          <dl className="divide-y divide-white/10 text-sm">
            {[
              {
                label: "API del backend",
                valor: API_URL,
                nota: "frontend/.env → VITE_API_URL",
              },
              {
                label: "Documentación de la API",
                valor: `${API_URL.replace(/\/api$/, "")}/docs`,
                nota: "Swagger UI generado por FastAPI",
                enlace: `${API_URL.replace(/\/api$/, "")}/docs`,
              },
              {
                label: "Envío gratis desde",
                valor: formatoPrecio(UMBRAL_ENVIO_GRATIS),
                nota: "backend-fastapi/app/routes/ventas.py",
              },
              {
                label: "Costo de envío",
                valor: formatoPrecio(COSTO_ENVIO),
                nota: "Tarifa plana a todo el país",
              },
              {
                label: "Base de datos",
                valor: "MySQL / MariaDB · phonestore",
                nota: "backend-fastapi/.env → DB_HOST, DB_NAME…",
              },
              {
                label: "Duración de la sesión",
                valor: "1 día",
                nota: "backend-fastapi/.env → JWT_EXPIRES_IN",
              },
              {
                label: "Correo saliente",
                valor: "Opcional (SMTP)",
                nota: "Sin SMTP, los correos quedan en correos_enviados.log",
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
                <dt className="w-full shrink-0 font-semibold text-white/80 sm:w-48">
                  {item.label}
                </dt>
                <dd className="min-w-0 flex-1">
                  {item.enlace ? (
                    <a
                      href={item.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all font-medium text-brand-500 hover:underline"
                    >
                      {item.valor}
                    </a>
                  ) : (
                    <span className="break-all text-white">{item.valor}</span>
                  )}
                  <p className="mt-0.5 text-xs text-white/40">{item.nota}</p>
                </dd>
              </div>
            ))}
          </dl>

          <Alert tipo="alerta" className="mt-5">
            Los datos sensibles (contraseña de la base de datos, clave del JWT,
            credenciales de correo) viven solo en el archivo <code>.env</code> del
            servidor. No se muestran ni se editan desde el navegador.
          </Alert>
        </Tarjeta>
      </div>
    </>
  );
}

export default AdminConfiguracion;
