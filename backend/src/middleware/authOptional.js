const { verificarToken } = require("../utils/jwt");

/**
 * Igual que authRequired, pero no bloquea la petición si no hay token.
 * Útil para endpoints públicos (ej: listar productos) que muestran
 * información distinta si el usuario está autenticado como gestor.
 */
function authOptional(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme === "Bearer" && token) {
    try {
      req.usuario = verificarToken(token);
    } catch (error) {
      // Token inválido o expirado: se ignora y se continúa como invitado
      req.usuario = null;
    }
  }

  next();
}

module.exports = { authOptional };
