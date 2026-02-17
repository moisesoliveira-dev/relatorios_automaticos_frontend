#!/bin/sh
set -e

# BACKEND_URL: URL completa do backend, incluindo /api
# Ex: http://backend:3000/api (docker-compose) ou https://xxx.railway.app/api (Railway)
BACKEND_URL="${BACKEND_URL:-http://localhost:3000/api}"

echo "Configurando proxy para backend: $BACKEND_URL"

# Substitui o placeholder no template e gera o nginx.conf final
sed "s|BACKEND_URL_PLACEHOLDER|${BACKEND_URL}|g" \
    /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
