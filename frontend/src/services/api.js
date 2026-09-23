// Cliente HTTP centralizado para hablar con el backend FastAPI.
// Agrega automáticamente el token JWT (si existe) y normaliza errores
// para que todas las pantallas los muestren igual.

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const TOKEN_KEY = "phonestore_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Permite que AuthContext reaccione cuando el backend responde 401
// (token vencido) sin que cada pantalla tenga que ocuparse de eso.
let onSesionExpirada = null;
export function registrarManejadorSesionExpirada(callback) {
  onSesionExpirada = callback;
}

/** Convierte { pagina: 2, buscar: "" } en "?pagina=2" (ignora vacíos). */
export function construirQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === "") return;
    query.append(clave, String(valor));
  });
  const texto = query.toString();
  return texto ? `?${texto}` : "";
}

async function request(path, { method = "GET", body, auth = false, signal } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkError) {
    if (networkError.name === "AbortError") throw networkError;
    const error = new Error(
      "No se pudo conectar con el servidor. Verifica que el backend esté encendido."
    );
    error.isNetworkError = true;
    throw error;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Respuesta sin cuerpo JSON (ej. 204)
  }

  if (!response.ok) {
    const error = new Error(
      (data && data.message) || `Error ${response.status} en la petición.`
    );
    error.status = response.status;
    error.errors = data && data.errors;
    error.data = data;

    // Token vencido o inválido en una ruta autenticada: cerrar sesión.
    if (response.status === 401 && auth && onSesionExpirada) {
      onSesionExpirada();
    }
    throw error;
  }

  return data;
}

/**
 * Descarga un archivo del backend (PDF, Excel) y lo guarda en el equipo.
 *
 * No pasa por `request` porque la respuesta no es JSON: llega como binario
 * y hay que convertirla en un enlace temporal para que el navegador la
 * baje con su nombre. El nombre lo propone el servidor en la cabecera
 * Content-Disposition; si no viene, se usa el que se pase por parametro.
 */
async function descargar(path, nombrePorDefecto = "descarga") {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    // Los errores si vienen en JSON: se leen para mostrar el motivo real
    let mensaje = "No se pudo generar el archivo.";
    try {
      const datos = await response.json();
      mensaje = datos.message || mensaje;
    } catch {
      // La respuesta no era JSON; se queda el mensaje generico.
    }
    const error = new Error(mensaje);
    error.status = response.status;
    throw error;
  }

  const cabecera = response.headers.get("content-disposition") || "";
  const encontrado = cabecera.match(/filename="?([^"';]+)"?/i);
  const nombre = encontrado ? encontrado[1] : nombrePorDefecto;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  return nombre;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  descargar,
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};
