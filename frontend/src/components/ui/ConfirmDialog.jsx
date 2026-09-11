import Button from "./Button";
import Icon from "./Icon";
import Modal from "./Modal";

/**
 * Diálogo de confirmación para acciones que no se pueden deshacer.
 *
 * Sustituye a window.confirm(): explica la consecuencia con el mismo
 * lenguaje del resto de la aplicación y permite marcar el botón como
 * peligroso cuando corresponde.
 */
function ConfirmDialog({
  isOpen,
  onClose,
  onConfirmar,
  titulo = "¿Confirmas la acción?",
  mensaje,
  detalle,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  peligroso = false,
  cargando = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} size="sm">
      <div className="flex gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            peligroso ? "bg-rose-500/12 text-rose-400" : "bg-amber-500/12 text-amber-400"
          }`}
        >
          <Icon name="alerta" className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-white/60">{mensaje}</p>
          {detalle && (
            <p className="mt-2 rounded-lg bg-dark-900 px-3 py-2 text-xs text-white/50">
              {detalle}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={cargando}>
          {textoCancelar}
        </Button>
        <Button
          variant={peligroso ? "danger" : "primary"}
          onClick={onConfirmar}
          cargando={cargando}
        >
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
