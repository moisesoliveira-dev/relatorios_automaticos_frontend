#!/bin/sh
set -e

# BACKEND_URL: URL completa do backend, incluindo /api
# Ex: http://backend:3000/api (docker-compose) ou https://xxx.railway.app/api (Railway)
BACKEND_URL="${BACKEND_URL:-http://localhost:3000/api}"

# Railway injeta $PORT (geralmente 8080); localmente usa 80
PORT="${PORT:-80}"

# Extrai apenas o hostname do BACKEND_URL para o header Host correto
# Ex: https://backend.railway.app/api -> backend.railway.app
BACKEND_HOST=$(echo "$BACKEND_URL" | sed -E 's|https?://([^/:]+).*|\1|')

echo "Configurando nginx na porta: $PORT"
echo "Configurando proxy para backend: $BACKEND_URL"
echo "Backend host (SSL SNI): $BACKEND_HOST"

# Substitui os placeholders no template e gera o nginx.conf final
sed -e "s|BACKEND_URL_PLACEHOLDER|${BACKEND_URL}|g" \
    -e "s|PORT_PLACEHOLDER|${PORT}|g" \
    -e "s|BACKEND_HOST_PLACEHOLDER|${BACKEND_HOST}|g" \
    /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
