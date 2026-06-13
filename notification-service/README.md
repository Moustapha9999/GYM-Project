# Notification Service — Node.js + Baileys

Micro-service d'envoi de notifications WhatsApp (Baileys) avec fallback SMS.

## Installation
```bash
npm install
cp .env.example .env
npm run dev
```

⚠️ Au premier démarrage, scanner le QR code WhatsApp affiché dans le terminal.
Le dossier `auth_info_baileys/` (session) ne doit JAMAIS être commité.
