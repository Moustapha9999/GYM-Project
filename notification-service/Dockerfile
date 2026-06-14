
FROM node:20-slim

WORKDIR /app

# git est nécessaire car certaines dépendances de Baileys s'installent depuis GitHub
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/


# Volume pour persister la session WhatsApp (sinon re-scan QR à chaque redémarrage)
VOLUME ["/app/auth_info_baileys"]

EXPOSE 3001
CMD ["node", "src/index.js"]