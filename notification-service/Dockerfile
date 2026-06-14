FROM node:20-slim

WORKDIR /app

# git + ssh nécessaires pour les dépendances GitHub de Baileys
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Forcer HTTPS au lieu de SSH pour GitHub (toutes les variantes d'URL)
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --global url."https://github.com/".insteadOf "git@github.com:" \
    && git config --global url."https://github.com/".insteadOf "git+ssh://git@github.com/"

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

EXPOSE 3001
CMD ["node", "src/index.js"]