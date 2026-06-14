# Micro-service Notifications — TOTAL FITNESS

WhatsApp (Baileys) + SMS fallback. Appelé par le backend FastAPI.

## Installation locale
```bash
npm install
cp .env.example .env
npm run dev
```

Au premier démarrage, **scanne le QR code** affiché dans le terminal avec WhatsApp
(Paramètres → Appareils connectés → Connecter un appareil).

## Endpoints
- `GET /health` — vérification
- `GET /status` — statut connexion WhatsApp
- `POST /send` — envoyer un message (header `x-api-secret` requis)
  ```json
  { "numero": "22245175075", "message": "Bonjour", "fallback_sms": true }
  ```

## ⚠️ Important
- Le dossier `auth_info_baileys/` contient la session WhatsApp : **ne jamais le commiter**, et le monter en **volume persistant** sur Render.
- Configure `API_SECRET` (partagé avec le backend) pour sécuriser les appels.
