import { api } from "./api";

/**
 * Asistente de atención al cliente.
 *
 * La conversación se identifica con una clave que devuelve el backend en
 * el primer mensaje. Se guarda en el navegador para que la charla
 * sobreviva a una recarga de la página.
 */
const CLAVE_GUARDADA = "phonestore_chat";

function leerClave() {
  try {
    return localStorage.getItem(CLAVE_GUARDADA) || null;
  } catch {
    return null;
  }
}

function guardarClave(clave) {
  try {
    if (clave) localStorage.setItem(CLAVE_GUARDADA, clave);
  } catch {
    // Sin almacenamiento la charla sigue, solo que no sobrevive a recargar.
  }
}

function olvidarClave() {
  try {
    localStorage.removeItem(CLAVE_GUARDADA);
  } catch {
    // No pasa nada: la clave nueva sustituye a la anterior en memoria.
  }
}

async function enviar(mensaje, clave = leerClave()) {
  const data = await api.post("/chatbot/mensaje", { mensaje, clave }, { auth: true });
  guardarClave(data.clave);
  return data;
}

async function historial(clave = leerClave()) {
  if (!clave) return null;
  try {
    const data = await api.get(`/chatbot/${clave}`, { auth: true });
    return data.conversacion;
  } catch {
    // La conversación caducó o pertenece a otra cuenta: se empieza de cero.
    olvidarClave();
    return null;
  }
}

async function motor() {
  return api.get("/chatbot/estado/motor");
}

export const chatbotService = {
  enviar,
  historial,
  motor,
  leerClave,
  olvidarClave,
};
