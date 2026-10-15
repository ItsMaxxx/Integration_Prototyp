# Build-Kontext ist das Projekt-Root (siehe docker-compose.yml), damit die package-lock.json
# mitkommt und im Container exakt dieselben Versionen wie lokal installiert werden
FROM node:24-alpine
WORKDIR /app
# Keine nativen Module nötig: SQLite kommt über das eingebaute node:sqlite
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci -w backend --omit=dev
COPY backend/ backend/
WORKDIR /app/backend
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "start"]
