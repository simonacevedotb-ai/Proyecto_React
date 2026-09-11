const { Router } = require("express");
const servicioController = require("../controllers/servicioController");
const { authRequired } = require("../middleware/auth");
const { authOptional } = require("../middleware/authOptional");
const { requireRole } = require("../middleware/roleCheck");

const router = Router();

router.get("/", authOptional, servicioController.listar);
router.get("/:id", authOptional, servicioController.obtener);

router.post("/", authRequired, requireRole("administrador", "empleado"), servicioController.crear);
router.put("/:id", authRequired, requireRole("administrador", "empleado"), servicioController.actualizar);
router.patch(
  "/:id/estado",
  authRequired,
  requireRole("administrador", "empleado"),
  servicioController.cambiarEstado
);
router.delete("/:id", authRequired, requireRole("administrador"), servicioController.eliminar);

module.exports = router;
