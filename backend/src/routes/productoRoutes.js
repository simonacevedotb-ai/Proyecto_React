const { Router } = require("express");
const productoController = require("../controllers/productoController");
const { authRequired } = require("../middleware/auth");
const { authOptional } = require("../middleware/authOptional");
const { requireRole } = require("../middleware/roleCheck");

const router = Router();

// Público (clientes ven catálogo activo); si viene token de gestor, ve todo
router.get("/", authOptional, productoController.listar);
router.get("/:id", authOptional, productoController.obtener);

// Gestión: administrador y empleado
router.post("/", authRequired, requireRole("administrador", "empleado"), productoController.crear);
router.put("/:id", authRequired, requireRole("administrador", "empleado"), productoController.actualizar);
router.patch(
  "/:id/estado",
  authRequired,
  requireRole("administrador", "empleado"),
  productoController.cambiarEstado
);
// Eliminar: solo administrador
router.delete("/:id", authRequired, requireRole("administrador"), productoController.eliminar);

module.exports = router;
