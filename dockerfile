FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
