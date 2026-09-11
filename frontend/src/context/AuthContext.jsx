import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { registrarManejadorSesionExpirada } from "../services/api";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

const TOKEN_KEY = "phonestore_token";
const USER_KEY = "phonestore_user";

function leerUsuarioGuardado() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarSesion(token, usuario) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  } catch {
    // Sin localStorage la sesión vive solo en memoria.
  }
}

function limpiarSesion() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* nada que limpiar */
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(leerUsuarioGuardado);
  // Solo hay que "cargar" si existe un token que validar contra el backend.
  const [cargando, setCargando] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    limpiarSesion();
    setUsuario(null);
  }, []);

  // Si el backend responde 401 en una ruta autenticada (token vencido),
  // se cierra la sesión automáticamente en toda la aplicación.
  useEffect(() => {
    registrarManejadorSesionExpirada(() => {
      limpiarSesion();
      setUsuario(null);
    });
  }, []);

  // Al montar, si hay token, se valida la sesión contra el backend.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return undefined;

    let vivo = true;

    async function validarSesion() {
      try {
        const usuarioActualizado = await authService.me();
        if (!vivo) return;
        setUsuario(usuarioActualizado);
        guardarSesion(null, usuarioActualizado);
      } catch {
        if (!vivo) return;
        limpiarSesion();
        setUsuario(null);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    validarSesion();
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * Inicia sesión.
   *
   * Si la cuenta tiene activada la verificación en dos pasos, el backend
   * NO devuelve el token: manda un código al correo y responde con un
   * desafío. En ese caso aquí no se guarda ninguna sesión; la pantalla de
   * login pide el código y llama después a `completarDobleFactor`.
   */
  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password });

    if (data.requiere_doble_factor) {
      return {
        requiereDobleFactor: true,
        desafio: data.desafio,
        emailParcial: data.email_parcial,
        minutos: data.minutos,
        mensaje: data.message,
      };
    }

    guardarSesion(data.token, data.usuario);
    setUsuario(data.usuario);
    return { requiereDobleFactor: false, usuario: data.usuario };
  }, []);

  /** Segundo paso: cambia el código de 6 dígitos por la sesión. */
  const completarDobleFactor = useCallback(async (desafio, codigo) => {
    const data = await authService.verificarDobleFactor({ desafio, codigo });
    guardarSesion(data.token, data.usuario);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const register = useCallback(async (values) => {
    const data = await authService.register(values);
    guardarSesion(data.token, data.usuario);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  /** Refresca los datos del usuario tras editar su perfil. */
  const actualizarUsuario = useCallback((usuarioActualizado) => {
    setUsuario(usuarioActualizado);
    guardarSesion(null, usuarioActualizado);
  }, []);

  const value = useMemo(() => {
    const rol = usuario?.rol || null;
    return {
      usuario,
      isAuthenticated: !!usuario,
      rol,
      esAdmin: rol === "administrador",
      esEmpleado: rol === "empleado",
      esCliente: rol === "cliente",
      esGestor: rol === "administrador" || rol === "empleado",
      cargando,
      correoVerificado: !!usuario?.email_verificado,
      dobleFactor: !!usuario?.doble_factor,
      login,
      completarDobleFactor,
      register,
      logout,
      actualizarUsuario,
    };
  }, [
    usuario,
    cargando,
    login,
    completarDobleFactor,
    register,
    logout,
    actualizarUsuario,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
