const { Router } = require("express");
const usuarioController = require("../controllers/usuarioController");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/roleCheck");

const router = Router();

// Todas las rutas de usuarios requieren estar autenticado
router.use(authRequired);

// Consultar: administrador y empleado
router.get("/", requireRole("administrador", "empleado"), usuarioController.listar);
router.get("/:id", requireRole("administrador", "empleado"), usuarioController.obtener);

// Gestión completa: solo administrador
router.post("/", requireRole("administrador"), usuarioController.crear);
router.put("/:id", requireRole("administrador"), usuarioController.actualizar);
router.patch("/:id/estado", requireRole("administrador"), usuarioController.cambiarEstado);
router.patch("/:id/rol", requireRole("administrador"), usuarioController.cambiarRol);
router.delete("/:id", requireRole("administrador"), usuarioController.eliminar);

module.exports = router;
