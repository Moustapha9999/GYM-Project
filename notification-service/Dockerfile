FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

# Volume pour persister la session WhatsApp (sinon re-scan QR à chaque redémarrage)
VOLUME ["/app/auth_info_baileys"]

EXPOSE 3001
CMD ["node", "src/index.js"]
