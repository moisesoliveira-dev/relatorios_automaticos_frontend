# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application for production
RUN npm run build -- --configuration=production

# Production stage - using nginx to serve static files
FROM nginx:alpine AS production

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy nginx config template
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Copy built application from builder stage
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Create startup script that substitutes environment variables
RUN printf '#!/bin/sh\n\
sed "s|BACKEND_URL_PLACEHOLDER|${BACKEND_URL:-http://localhost:3000}|g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf\n\
nginx -g "daemon off;"\n' > /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose port (Railway uses PORT env variable, default 80)
EXPOSE 80

# Start nginx with environment variable substitution
CMD ["/docker-entrypoint.sh"]
