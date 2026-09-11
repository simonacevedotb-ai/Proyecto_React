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

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};
