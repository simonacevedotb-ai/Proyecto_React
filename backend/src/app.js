const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const productoRoutes = require("./routes/productoRoutes");
const servicioRoutes = require("./routes/servicioRoutes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API PhoneStore activa." });
});

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/servicios", servicioRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Recurso no encontrado." });
});

// Manejador de errores centralizado (siempre al final)
app.use(errorHandler);

module.exports = app;
