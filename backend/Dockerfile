FROM node:24-alpine
WORKDIR /app
# Keine nativen Module nötig: SQLite kommt über das eingebaute node:sqlite
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "start"]
