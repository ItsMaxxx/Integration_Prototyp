# Build-Kontext ist das Projekt-Root (siehe docker-compose.yml), damit die package-lock.json
# mitkommt und im Container exakt dieselben Versionen wie lokal installiert werden
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci -w frontend
COPY frontend/ frontend/
RUN npm run build -w frontend

FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
