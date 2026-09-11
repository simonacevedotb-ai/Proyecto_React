const { verificarToken } = require("../utils/jwt");

/**
 * Verifica que la petición traiga un token JWT válido en el header
 * Authorization: Bearer <token>
 * Si es válido, adjunta la información del usuario en req.usuario.
 */
function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      ok: false,
      message: "No autorizado. Debes iniciar sesión.",
    });
  }

  try {
    const payload = verificarToken(token);
    req.usuario = payload; // { id_usuario, email, rol, id_rol }
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "Token inválido o expirado. Inicia sesión nuevamente.",
    });
  }
}

module.exports = { authRequired };
