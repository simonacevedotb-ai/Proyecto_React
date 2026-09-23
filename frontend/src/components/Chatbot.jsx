import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { chatbotService } from "../services/chatbotService";
import Icon from "./ui/Icon";

/**
 * Asistente de atención al cliente.
 *
 * Burbuja flotante que abre una conversación con el asistente del sitio.
 * Responde sobre productos, precios, servicios, envíos, garantías y
 * orienta para radicar una PQR.
 *
 * La conversación se identifica con una clave que guarda el navegador, de
 * modo que al recargar la página la charla sigue donde estaba. Quien no
 * tiene cuenta también puede usarlo.
 */
const SUGERENCIAS = [
  "¿Qué celulares tienen?",
  "¿Cuánto cuesta el envío?",
  "¿Qué garantía dan?",
  "Quiero poner una queja",
];

function Chatbot() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [motor, setMotor] = useState("catalogo");
  const [error, setError] = useState("");

  const finRef = useRef(null);
  const campoRef = useRef(null);

  // Recupera la charla anterior la primera vez que se abre
  useEffect(() => {
    if (!abierto || mensajes.length) return undefined;

    let vivo = true;

    async function recuperar() {
      const conversacion = await chatbotService.historial();
      if (!vivo) return;

      if (conversacion?.mensajes?.length) {
        setMensajes(conversacion.mensajes);
        setMotor(conversacion.motor || "catalogo");
      } else {
        setMensajes([{
          id_mensaje: "bienvenida",
          autor: "asistente",
          contenido:
            "¡Hola! Soy el asistente de PhoneStore. Puedo ayudarte con precios " +
            "y disponibilidad, servicios técnicos, envíos, garantías y con " +
            "radicar una PQR. ¿Qué necesitas?",
        }]);
      }
    }

    recuperar();
    return () => {
      vivo = false;
    };
  }, [abierto, mensajes.length]);

  // Consulta una sola vez qué motor está respondiendo
  useEffect(() => {
    let vivo = true;
    async function consultar() {
      try {
        const datos = await chatbotService.motor();
        if (vivo) setMotor(datos.motor);
      } catch {
        // Si no responde, se asume el motor de catálogo.
      }
    }
    consultar();
    return () => {
      vivo = false;
    };
  }, []);

  // Baja al último mensaje cada vez que llega uno
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [mensajes, escribiendo]);

  useEffect(() => {
    if (abierto) campoRef.current?.focus();
  }, [abierto]);

  const enviar = async (contenido) => {
    const limpio = (contenido ?? texto).trim();
    if (!limpio || escribiendo) return;

    setError("");
    setTexto("");
    setMensajes((previos) => [
      ...previos,
      { id_mensaje: `local-${Date.now()}`, autor: "cliente", contenido: limpio },
    ]);
    setEscribiendo(true);

    try {
      const datos = await chatbotService.enviar(limpio);
      setMotor(datos.motor);
      setMensajes((previos) => [...previos, datos.respuesta]);
    } catch (fallo) {
      setError(
        fallo.status === 429
          ? "Vas muy rápido. Espera un momento antes de escribir de nuevo."
          : fallo.message || "No se pudo enviar el mensaje."
      );
    } finally {
      setEscribiendo(false);
      campoRef.current?.focus();
    }
  };

  const reiniciar = () => {
    chatbotService.olvidarClave();
    setMensajes([]);
    setError("");
  };

  return (
    <>
      {/* ---------- Burbuja ---------- */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente"}
        aria-expanded={abierto}
        className={`fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center
          bg-brand-500 text-white shadow-lg transition-all duration-300
          hover:bg-brand-600 hover:shadow-glow ${abierto ? "rotate-90" : ""}`}
      >
        <Icon name={abierto ? "cerrar" : "chat"} className="h-6 w-6" />
      </button>

      {/* ---------- Ventana ---------- */}
      {abierto && (
        <section
          aria-label="Asistente de PhoneStore"
          className="fixed bottom-40 right-5 z-40 flex h-[32rem] w-[92vw] max-w-sm flex-col
            border border-white/10 bg-dark-900 shadow-2xl animate-[fadeInUp_.25s_ease-out]"
        >
          {/* Cabecera */}
          <header className="flex items-center gap-3 border-b border-white/10 bg-black px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-brand-500 text-white">
              <Icon name="chat" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">Asistente PhoneStore</p>
              <p className="truncate text-[11px] text-white/40">
                {motor === "catalogo"
                  ? "Respuestas del catálogo de la tienda"
                  : "Respuestas con Inteligencia Artificial"}
              </p>
            </div>
            <button
              type="button"
              onClick={reiniciar}
              aria-label="Empezar una conversación nueva"
              className="p-1.5 text-white/40 transition-colors hover:text-brand-500"
            >
              <Icon name="refrescar" className="h-4 w-4" />
            </button>
          </header>

          {/* Conversación */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {mensajes.map((m) => (
              <div
                key={m.id_mensaje}
                className={`flex ${m.autor === "cliente" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-line px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.autor === "cliente"
                      ? "bg-brand-500 text-white"
                      : "border border-white/10 bg-white/[0.04] text-white/80"
                  }`}
                >
                  {m.contenido}
                </p>
              </div>
            ))}

            {escribiendo && (
              <div className="flex justify-start">
                <p className="flex gap-1.5 border border-white/10 bg-white/[0.04] px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-[latido_1s_ease-in-out_infinite]"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </p>
              </div>
            )}

            {/* Atajos, solo mientras la charla está en blanco */}
            {mensajes.length <= 1 && !escribiendo && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => enviar(s)}
                    className="border border-white/15 px-2.5 py-1.5 text-[11px] text-white/60
                      transition-colors hover:border-brand-500 hover:text-brand-500"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="text-center text-[11px] font-medium text-brand-500">
                {error}
              </p>
            )}

            <div ref={finRef} />
          </div>

          {/* Escritura */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            className="border-t border-white/10 p-3"
          >
            <div className="flex items-center gap-2">
              <input
                ref={campoRef}
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribe tu pregunta..."
                aria-label="Mensaje para el asistente"
                maxLength={1000}
                className="h-10 flex-1 border border-white/15 bg-white/5 px-3 text-sm text-white
                  placeholder:text-white/30 outline-none transition-colors focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={!texto.trim() || escribiendo}
                aria-label="Enviar"
                className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand-500
                  text-white transition-colors hover:bg-brand-600
                  disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
              >
                <Icon name="flechaDerecha" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-white/30">
              ¿Necesitas algo formal?{" "}
              <Link to="/pqr" className="text-brand-500 hover:underline">
                Radica una PQR
              </Link>
            </p>
          </form>
        </section>
      )}
    </>
  );
}

export default Chatbot;
