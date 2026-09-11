// Middleware de manejo de errores centralizado.
// Cualquier error lanzado (o pasado con next(err)) en los controladores
// termina aquí, evitando que el servidor se caiga y devolviendo una
// respuesta JSON consistente.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error("❌ Error no controlado:", err);

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      ok: false,
      message: "Ya existe un registro con esos datos (correo o documento duplicado).",
    });
  }

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Error interno del servidor.",
  });
}

// Envuelve controladores async para no repetir try/catch en cada uno.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };
