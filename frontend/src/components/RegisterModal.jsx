import { useState } from "react";

import Alert from "./ui/Alert";
import Button from "./ui/Button";
import Icon from "./ui/Icon";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import Select from "./ui/Select";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useForm } from "../hooks/useForm";
import {
  required,
  validateNombre,
  validateDocumento,
  validateTelefono,
  validateDireccion,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "../utils/validations";

const TIPOS_DOCUMENTO = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
];

const initialValues = {
  nombre: "",
  apellido: "",
  tipoDocumento: "",
  numeroDocumento: "",
  direccion: "",
  telefono: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function RegisterModal({ isOpen, onClose, onRegistered }) {
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [usuarioCreado, setUsuarioCreado] = useState(null);
  const { register } = useAuth();
  const toast = useToast();

  const { values, errors, handleChange, handleBlur, validateAll, reset, setErrors } =
    useForm(initialValues, {
      nombre: validateNombre,
      apellido: validateNombre,
      tipoDocumento: required,
      numeroDocumento: validateDocumento,
      direccion: validateDireccion,
      telefono: validateTelefono,
      email: validateEmail,
      password: validatePassword,
      confirmPassword: (value, allValues) =>
        validateConfirmPassword(allValues.password)(value),
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    const isValid = validateAll();
    if (!isValid) return;

    setEnviando(true);
    try {
      // Envía los datos validados al backend, que los valida de nuevo,
      // hashea la contraseña y los guarda en la base de datos.
      // El backend devuelve el token, así que la sesión queda iniciada.
      const usuario = await register(values);
      setUsuarioCreado(usuario);
      setExito(true);
      toast.exito(`¡Bienvenido a PhoneStore, ${usuario.nombre}!`);
    } catch (error) {
      if (error.errors) {
        // Errores de validación devueltos por el backend (ej: correo duplicado)
        setErrors((prev) => ({ ...prev, ...error.errors }));
      }
      const mensaje =
        error.status === 429
          ? "Se registraron varias cuentas desde este equipo. Intenta de nuevo en unos minutos."
          : error.message || "No se pudo completar el registro.";
      setErrorServidor(mensaje);
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const handleClose = () => {
    reset();
    setExito(false);
    setErrorServidor("");
    setUsuarioCreado(null);
    onClose();
  };

  const handleContinuar = () => {
    const usuario = usuarioCreado;
    handleClose();
    onRegistered?.(usuario);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear cuenta"
      descripcion={exito ? undefined : "Todos los campos marcados con * son obligatorios."}
      size="lg"
    >
      {exito ? (
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-400">
            <Icon name="checkCirculo" className="h-8 w-8" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-white">
              ¡Cuenta creada, {usuarioCreado?.nombre}!
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-white/50">
              Tu sesión ya está iniciada. Ahora puedes comprar, agendar servicios y
              seguir tus pedidos desde tu cuenta.
            </p>
          </div>

          <div className="flex items-start gap-3 border border-white/10 bg-white/[0.03] p-4 text-left">
            <Icon name="sobre" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <p className="text-xs leading-relaxed text-white/60">
              Te enviamos un correo a{" "}
              <span className="font-semibold text-white">{usuarioCreado?.email}</span>{" "}
              para confirmar tu cuenta. Ábrelo y pulsa el enlace: hasta entonces no
              podrás activar la verificación en dos pasos.
            </p>
          </div>
          <Button fullWidth onClick={handleContinuar} iconoDerecha="flechaDerecha">
            Continuar
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              name="nombre"
              required
              maxLength={40}
              hint="Entre 2 y 40 caracteres, solo letras."
              value={values.nombre}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.nombre}
            />
            <Input
              label="Apellido"
              name="apellido"
              required
              maxLength={40}
              hint="Entre 2 y 40 caracteres, solo letras."
              value={values.apellido}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.apellido}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de documento"
              name="tipoDocumento"
              required
              options={TIPOS_DOCUMENTO}
              value={values.tipoDocumento}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.tipoDocumento}
            />
            <Input
              label="Número de documento"
              name="numeroDocumento"
              required
              maxLength={12}
              hint="Entre 6 y 12 dígitos, sin puntos ni espacios."
              value={values.numeroDocumento}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.numeroDocumento}
            />
          </div>

          <Input
            label="Dirección"
            name="direccion"
            required
            maxLength={150}
            hint="Entre 10 y 150 caracteres (ej: Calle 45 # 12-34, Barrio Centro)."
            value={values.direccion}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.direccion}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono"
              name="telefono"
              required
              maxLength={15}
              hint="Entre 7 y 15 dígitos."
              value={values.telefono}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.telefono}
            />
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              required
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contraseña"
              name="password"
              type="password"
              required
              maxLength={20}
              hint="Entre 8 y 20 caracteres, con mayúscula, minúscula y número."
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              autoComplete="new-password"
            />
            <Input
              label="Confirmar contraseña"
              name="confirmPassword"
              type="password"
              required
              maxLength={20}
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          {errorServidor && <Alert tipo="error">{errorServidor}</Alert>}

          <p className="text-xs leading-relaxed text-white/40">
            Tu contraseña se guarda cifrada con bcrypt: nadie, ni siquiera el
            administrador, puede verla en texto plano.
          </p>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Button type="button" variant="ghost" fullWidth onClick={handleClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth cargando={enviando}>
              Crear mi cuenta
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default RegisterModal;
