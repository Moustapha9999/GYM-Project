import express from "express";
import { sendMessage, sendDocument, isConnected } from "../whatsapp/baileys.client.js";
import { sendSMS } from "../sms/sms.provider.js";

const router = express.Router();

function checkSecret(req, res, next) {
  const secret = req.headers["x-api-secret"];
  if (process.env.API_SECRET && secret !== process.env.API_SECRET) {
    return res.status(401).json({ success: false, erreur: "Secret invalide" });
  }
  next();
}

router.get("/status", (req, res) => {
  res.json({ whatsapp_connecte: isConnected() });
});

router.post("/send", checkSecret, async (req, res) => {
  const { numero, message, fallback_sms } = req.body;
  if (!numero || !message) {
    return res.status(400).json({ success: false, erreur: "numero et message requis" });
  }
  const wa = await sendMessage(numero, message);
  if (wa.success) {
    return res.json({ success: true, canal: "whatsapp", message_id: wa.message_id });
  }
  if (fallback_sms) {
    const sms = await sendSMS(numero, message);
    if (sms.success) {
      return res.json({ success: true, canal: "sms", message_id: sms.message_id });
    }
    return res.status(502).json({ success: false, erreur: `WhatsApp: ${wa.erreur} | SMS: ${sms.erreur}` });
  }
  return res.status(502).json({ success: false, erreur: wa.erreur });
});

router.post("/send-document", checkSecret, async (req, res) => {
  const { numero, filename, document_base64, caption } = req.body;
  if (!numero || !filename || !document_base64) {
    return res.status(400).json({
      success: false,
      erreur: "numero, filename et document_base64 requis",
    });
  }
  const buffer = Buffer.from(document_base64, "base64");
  const wa = await sendDocument(numero, buffer, filename, caption || "");
  if (wa.success) {
    return res.json({ success: true, canal: "whatsapp", message_id: wa.message_id });
  }
  return res.status(502).json({ success: false, erreur: wa.erreur });
});

export default router;
