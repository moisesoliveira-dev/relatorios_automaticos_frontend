# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration=production

# ---- Production Stage ----
FROM nginx:alpine AS production

# Copia o build do Angular para o nginx
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Copia o template do nginx
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Copia o entrypoint que substitui a URL do backend em runtime
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 8080

ENTRYPOINT ["/entrypoint.sh"]
