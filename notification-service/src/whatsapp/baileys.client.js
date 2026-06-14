/**
 * Client WhatsApp basé sur Baileys (WhatsApp Web multi-device).
 */
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";

let sock = null;
let connected = false;

export function isConnected() {
  return connected;
}

export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("\n📱 Scanne ce QR code avec WhatsApp (Appareils connectés) :\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      connected = true;
      console.log("✅ WhatsApp connecté !");
    }
    if (connection === "close") {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log("❌ WhatsApp déconnecté.", shouldReconnect ? "Reconnexion..." : "Logout.");
      if (shouldReconnect) startWhatsApp();
    }
  });

  return sock;
}

export async function sendMessage(numero, message) {
  if (!sock || !connected) {
    return { success: false, erreur: "WhatsApp non connecté" };
  }
  try {
    const jid = `${numero.replace(/\D/g, "")}@s.whatsapp.net`;
    const sent = await sock.sendMessage(jid, { text: message });
    return { success: true, message_id: sent?.key?.id };
  } catch (e) {
    return { success: false, erreur: e.message };
  }
}
