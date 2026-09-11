import { useEffect, useState } from "react";

import SeguridadCuenta from "../../components/SeguridadCuenta";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";
import Input from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useForm } from "../../hooks/useForm";
import { authService } from "../../services/authService";
import {
  required,
  validateConfirmPassword,
  validateDireccion,
  validateNombre,
  validatePassword,
  validateTelefono,
} from "../../utils/validations";

/**
 * Edición del perfil propio y cambio de contraseña.
 *
 * El backend identifica al usuario por el token, no por un id enviado
 * desde el navegador: nadie puede editar el perfil de otra persona.
 * El correo y el documento no se editan aquí porque identifican la
 * cuenta y las facturas; para cambiarlos hay que contactar al soporte.
 */
function MiPerfil() {
  const { usuario, actualizarUsuario } = useAuth();
  const toast = useToast();

  const [guardando, setGuardando] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [errorPassword, setErrorPassword] = useState("");
  const [passwordOk, setPasswordOk] = useState(false);

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
    } catch (error) {
      if (error.errors) perfil.setErrors((prev) => ({ ...prev, ...error.errors }));
      setErrorPerfil(error.message || "No pudimos guardar los cambios.");
      toast.error(error.message || "No pudimos guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    setErrorPassword("");
    setPasswordOk(false);
    if (!clave.validateAll()) return;

    setCambiando(true);
    try {
      await authService.cambiarPassword({
        passwordActual: clave.values.passwordActual,
        passwordNueva: clave.values.passwordNueva,
      });
      clave.reset();
      setPasswordOk(true);
      toast.exito("Contraseña actualizada.");
    } catch (error) {
      if (error.errors) clave.setErrors((prev) => ({ ...prev, ...error.errors }));
      setErrorPassword(error.message || "No pudimos cambiar la contraseña.");
      toast.error(error.message || "No pudimos cambiar la contraseña.");
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Mi perfil</h1>
        <p className="text-sm text-white/50">
          Mantén tus datos al día para que tus pedidos lleguen sin contratiempos.
        </p>
      </div>

      {/* Datos personales */}
      <section className="rounded-2xl border border-white/10 bg-dark-900 p-6">
        <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <Icon name="usuario" className="h-4 w-4" />
          </span>
          Datos personales
        </h2>

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
            hint="Entre 10 y 150 caracteres. Se usará como dirección de envío por defecto."
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
            hint="Entre 7 y 15 dígitos."
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Correo electrónico"
              name="email_solo_lectura"
              value={usuario?.email || ""}
              disabled
              hint="Para cambiarlo, escríbenos desde la página de contacto."
            />
            <Input
              label="Documento"
              name="documento_solo_lectura"
              value={`${usuario?.tipo_documento || ""} ${usuario?.numero_documento || ""}`.trim()}
              disabled
              hint="Identifica tu cuenta y tus facturas."
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" cargando={guardando} icono="check">
              Guardar cambios
            </Button>
          </div>
        </form>
      </section>

      {/* Seguridad: correo verificado y segundo paso */}
      <SeguridadCuenta />

      {/* Contraseña */}
      <section className="rounded-2xl border border-white/10 bg-dark-900 p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <Icon name="candado" className="h-4 w-4" />
          </span>
          Cambiar contraseña
        </h2>
        <p className="mb-5 ml-10 text-sm text-white/50">
          Se guarda cifrada con bcrypt. Nadie puede verla en texto plano.
        </p>

        <form onSubmit={cambiarPassword} className="space-y-4" noValidate>
          {errorPassword && <Alert tipo="error">{errorPassword}</Alert>}
          {passwordOk && (
            <Alert tipo="exito">
              Tu contraseña se cambió correctamente. Úsala la próxima vez que inicies
              sesión.
            </Alert>
          )}

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" variant="oscuro" cargando={cambiando} icono="candado">
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default MiPerfil;
