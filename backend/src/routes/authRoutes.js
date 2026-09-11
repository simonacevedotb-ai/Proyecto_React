const { Router } = require("express");
const authController = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authRequired, authController.me);

module.exports = router;
