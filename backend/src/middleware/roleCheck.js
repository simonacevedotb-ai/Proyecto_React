/**
 * Middleware de control de acceso por rol.
 * Uso: router.get("/", authRequired, requireRole("administrador"), handler)
 * Uso con varios roles: requireRole("administrador", "empleado")
 *
 * Debe usarse SIEMPRE después de authRequired, ya que depende de req.usuario.
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado. Debes iniciar sesión.",
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok: false,
        message: "No tienes permisos para acceder a este recurso.",
      });
    }

    next();
  };
}

module.exports = { requireRole };
