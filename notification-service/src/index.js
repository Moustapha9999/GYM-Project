import express from "express";
import notificationsRoutes from "./routes/notifications.routes.js";
import { startWhatsApp } from "./whatsapp/baileys.client.js";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/", notificationsRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 Micro-service Notifications sur le port ${PORT}`);
  await startWhatsApp();
});
