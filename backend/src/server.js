require("dotenv").config();

const app = require("./app");
const { checkConnection } = require("./config/db");

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
  await checkConnection();
});
