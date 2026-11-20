# Ein-Container-Variante für Hosting (z. B. Render): das Backend liefert die gebaute
# Oberfläche selbst aus, nginx entfällt. Lokal weiterhin docker-compose.yml verwenden.

# Stufe 1: Frontend bauen
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci -w frontend
COPY frontend/ frontend/
RUN npm run build -w frontend

# Stufe 2: Backend + fertiges Frontend
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci -w backend --omit=dev
COPY backend/ backend/
COPY --from=builder /app/frontend/dist /app/frontend-dist

# Feste Werte im Container; SESSION_SECRET, DEMO_EMAIL, DEMO_PASSWORT kommen vom Hoster
ENV APP_PORT=3000 \
    DB_PATH=/app/data/proofm.db \
    UPLOAD_DIR=/app/data/uploads \
    FRONTEND_DIR=/app/frontend-dist \
    COOKIE_SECURE=true

WORKDIR /app/backend
EXPOSE 3000
CMD ["npm", "start"]
