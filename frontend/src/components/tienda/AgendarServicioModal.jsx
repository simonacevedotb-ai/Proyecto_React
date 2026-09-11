import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useForm } from "../../hooks/useForm";
import { solicitudService } from "../../services/solicitudService";
import { formatoPrecio } from "../../utils/formato";
import { required, validateEmail, validateNombre, validateTelefono } from "../../utils/validations";
import Alert from "../ui/Alert";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Textarea from "../ui/Textarea";

function validarDescripcion(valor) {
  if (!valor || !valor.trim()) return "Cuéntanos qué le pasa a tu equipo.";
  if (valor.trim().length < 10) return "Describe el caso con al menos 10 caracteres.";
  if (valor.length > 500) return "Máximo 500 caracteres.";
  return "";
}

/**
 * Formulario de agendamiento de un servicio técnico.
 *
 * Los datos del usuario autenticado vienen precargados, pero se pueden
 * cambiar (por ejemplo, si el equipo es de un familiar). La solicitud se
 * guarda en la base de datos y devuelve un código de seguimiento.
 */
function AgendarServicioModal({ servicio, isOpen, onClose }) {
  const { usuario } = useAuth();
  const toast = useToast();

  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [solicitudCreada, setSolicitudCreada] = useState(null);

  const { values, errors, handleChange, handleBlur, validateAll, setValues, setErrors, reset } =
    useForm(
      {
        cliente_nombre: "",
        cliente_email: "",
        cliente_telefono: "",
        equipo: "",
        descripcion: "",
      },
      {
        cliente_nombre: validateNombre,
        cliente_email: validateEmail,
        cliente_telefono: validateTelefono,
        equipo: required,
        descripcion: validarDescripcion,
      }
    );

  // Precarga los datos del usuario cada vez que se abre el modal
  useEffect(() => {
    if (!isOpen) return;
    setSolicitudCreada(null);
    setErrorServidor("");
    setValues({
      cliente_nombre: usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : "",
      cliente_email: usuario?.email || "",
      cliente_telefono: usuario?.telefono || "",
      equipo: "",
      descripcion: "",
    });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, servicio?.id_servicio]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor("");
    if (!validateAll()) return;

    setEnviando(true);
    try {
      const data = await solicitudService.crear({
        id_servicio: servicio.id_servicio,
        cliente_nombre: values.cliente_nombre.trim(),
        cliente_email: values.cliente_email.trim(),
        cliente_telefono: values.cliente_telefono.trim(),
        equipo: values.equipo.trim(),
        descripcion: values.descripcion.trim(),
      });
      setSolicitudCreada(data.solicitud);
      toast.exito(data.message);
    } catch (error) {
      if (error.errors) setErrors((prev) => ({ ...prev, ...error.errors }));
      setErrorServidor(error.message || "No pudimos registrar tu solicitud.");
      toast.error(error.message || "No pudimos registrar tu solicitud.");
    } finally {
      setEnviando(false);
    }
  };

  const handleClose = () => {
    reset();
    setSolicitudCreada(null);
    setErrorServidor("");
    onClose();
  };

  if (!servicio) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={solicitudCreada ? "¡Solicitud registrada!" : `Agendar: ${servicio.nombre}`}
      descripcion={
        solicitudCreada
          ? undefined
          : `${formatoPrecio(servicio.precio)}${servicio.duracion ? ` · ${servicio.duracion}` : ""}`
      }
      size="md"
    >
      {solicitudCreada ? (
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-400">
            <Icon name="checkCirculo" className="h-8 w-8" />
          </span>

          <p className="mb-1 text-sm text-white/60">Tu código de seguimiento es</p>
          <p className="mb-4 text-2xl font-bold tracking-wide text-brand-500">
            {solicitudCreada.codigo}
          </p>

          <div className="mb-5 space-y-1.5 rounded-xl bg-dark-900 p-4 text-left text-sm">
            <p className="flex justify-between gap-3">
              <span className="text-white/50">Servicio</span>
              <strong className="text-right text-white">
                {solicitudCreada.nombre_servicio}
              </strong>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-white/50">Equipo</span>
              <strong className="text-right text-white">
                {solicitudCreada.equipo || "—"}
              </strong>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-white/50">Valor estimado</span>
              <strong className="text-right text-white">
                {formatoPrecio(solicitudCreada.precio_servicio)}
              </strong>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-white/50">Estado</span>
              <strong className="text-right text-amber-400">Pendiente</strong>
            </p>
          </div>

          <p className="mb-5 text-sm leading-relaxed text-white/50">
            Nuestro equipo técnico te contactará al{" "}
            <strong className="text-white/80">{solicitudCreada.cliente_telefono}</strong> para
            confirmar la cita.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button fullWidth to="/cliente/solicitudes" onClick={handleClose}>
              Ver mis solicitudes
            </Button>
            <Button fullWidth variant="ghost" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex items-start gap-3 rounded-xl bg-brand-500/10 p-4">
            <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <p className="text-xs leading-relaxed text-white/70">
              El valor mostrado es el precio base del servicio. Si al revisar el equipo se
              necesita algo adicional, te lo informamos <strong>antes</strong> de continuar.
            </p>
          </div>

          {errorServidor && <Alert tipo="error">{errorServidor}</Alert>}

          <Input
            label="Nombre completo"
            name="cliente_nombre"
            value={values.cliente_nombre}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.cliente_nombre}
            maxLength={90}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Correo electrónico"
              name="cliente_email"
              type="email"
              value={values.cliente_email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.cliente_email}
              required
            />
            <Input
              label="Teléfono de contacto"
              name="cliente_telefono"
              value={values.cliente_telefono}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.cliente_telefono}
              maxLength={15}
              hint="Entre 7 y 15 dígitos"
              required
            />
          </div>

          <Input
            label="Equipo (marca y modelo)"
            name="equipo"
            value={values.equipo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.equipo}
            placeholder="Ej: iPhone 13 Pro, Samsung Galaxy A54..."
            maxLength={80}
            required
          />

          <Textarea
            label="¿Qué le pasa a tu equipo?"
            name="descripcion"
            value={values.descripcion}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.descripcion}
            placeholder="Describe la falla con el mayor detalle posible: cuándo empezó, si se cayó, si se mojó..."
            rows={4}
            maxLength={500}
            required
          />

          <p className="text-xs leading-relaxed text-white/40">
            Al enviar aceptas nuestros{" "}
            <Link to="/politicas/terminos" className="font-semibold text-brand-500 hover:underline">
              términos y condiciones
            </Link>{" "}
            y la{" "}
            <Link to="/politicas/privacidad" className="font-semibold text-brand-500 hover:underline">
              política de privacidad
            </Link>
            .
          </p>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
            <Button type="button" variant="ghost" fullWidth onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth cargando={enviando} icono="documento">
              Enviar solicitud
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default AgendarServicioModal;
