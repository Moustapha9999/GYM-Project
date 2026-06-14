FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Réécriture SSH->HTTPS au niveau système (lu par tous les process git)
RUN git config --system url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --system url."https://github.com/".insteadOf "git@github.com:" \
    && git config --system url."https://github.com/".insteadOf "git+ssh://git@github.com/"

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

EXPOSE 3001
CMD ["node", "src/index.js"]