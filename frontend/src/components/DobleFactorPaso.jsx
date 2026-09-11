import { useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import Alert from "./ui/Alert";
import Button from "./ui/Button";
import Icon from "./ui/Icon";

/**
 * Segundo paso del inicio de sesión.
 *
 * Cuando la cuenta tiene activada la verificación en dos pasos, el
 * backend no entrega la sesión con la contraseña: manda un código de seis
 * dígitos al correo y devuelve un desafío. Esta pantalla cambia ese
 * código por la sesión.
 *
 * Props:
 *   - desafio: identificador del intento, lo devolvió /auth/login
 *   - emailParcial: correo enmascarado, para que el usuario sepa dónde mirar
 *   - minutos: cuánto dura el código
 *   - onVerificado: recibe el usuario cuando el código es correcto
 *   - onCancelar: vuelve al formulario de contraseña
 */
function DobleFactorPaso({ desafio, emailParcial, minutos = 10, onVerificado, onCancelar }) {
  const { completarDobleFactor } = useAuth();

  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [segundos, setSegundos] = useState(minutos * 60);

  const campoRef = useRef(null);

  useEffect(() => {
    campoRef.current?.focus();
  }, []);

  // Cuenta atrás de la caducidad del código
  useEffect(() => {
    if (segundos <= 0) return undefined;
    const temporizador = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(temporizador);
  }, [segundos]);

  const minutosRestantes = String(Math.floor(segundos / 60)).padStart(2, "0");
  const segundosRestantes = String(segundos % 60).padStart(2, "0");
  const caducado = segundos <= 0;

  const handleChange = (e) => {
    // Solo dígitos: pegar el código desde el correo no debe romper el campo
    const limpio = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCodigo(limpio);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (codigo.length !== 6) {
      setError("Escribe los 6 dígitos del código.");
      return;
    }

    setEnviando(true);
    try {
      const usuario = await completarDobleFactor(desafio, codigo);
      onVerificado?.(usuario);
    } catch (fallo) {
      setError(fallo.message || "No se pudo verificar el código.");
      setCodigo("");
      campoRef.current?.focus();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="mb-5 flex h-12 w-12 items-center justify-center border border-brand-500/40 bg-brand-500/10 text-brand-500">
        <Icon name="escudo" className="h-6 w-6" />
      </div>

      <h2 className="mb-1 text-2xl font-bold text-white">Verificación en dos pasos</h2>
      <p className="mb-6 text-sm leading-relaxed text-white/50">
        Enviamos un código de 6 dígitos a{" "}
        <span className="font-semibold text-white">{emailParcial}</span>. Escríbelo aquí
        para terminar de entrar.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert tipo="error">{error}</Alert>}
        {caducado && !error && (
          <Alert tipo="alerta">
            El código caducó. Vuelve atrás e inicia sesión otra vez para recibir uno nuevo.
          </Alert>
        )}

        <div>
          <label
            htmlFor="codigo-doble-factor"
            className="mb-1.5 block text-sm font-medium text-white/80"
          >
            Código de verificación
          </label>
          <input
            id="codigo-doble-factor"
            ref={campoRef}
            name="codigo"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={codigo}
            onChange={handleChange}
            disabled={caducado}
            aria-describedby="ayuda-doble-factor"
            className="w-full border border-white/15 bg-white/5 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-white placeholder:text-white/20 outline-none transition-colors focus:border-brand-500 disabled:opacity-50"
          />
          <p id="ayuda-doble-factor" className="mt-2 text-xs text-white/40">
            {caducado
              ? "Código caducado."
              : `El código caduca en ${minutosRestantes}:${segundosRestantes}.`}
          </p>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          cargando={enviando}
          disabled={caducado || codigo.length !== 6}
        >
          {enviando ? "Verificando..." : "Verificar y entrar"}
        </Button>
      </form>

      <button
        type="button"
        onClick={onCancelar}
        className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-semibold text-white/50 transition-colors hover:text-brand-500"
      >
        <Icon name="flechaIzquierda" className="h-4 w-4" />
        Volver a iniciar sesión
      </button>

      <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/35">
        ¿No te llegó? Revisa la carpeta de correo no deseado. Si tu cuenta no puede
        recibir correos, un administrador puede desactivar la verificación en dos pasos.
      </p>
    </>
  );
}

export default DobleFactorPaso;
