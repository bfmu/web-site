#!/bin/bash

# ====================
# Build Docker para subdirectorio /admin
# Frontend Admin Angular 20
# ====================

set -e

echo "🐳 Building imagen Docker para bfmu.dev/admin..."

# Configurar variables
TAG=${1:-latest}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-""}
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID:-""}

# Cargar desde archivo si existe
if [ -f "production.env" ]; then
    echo "📋 Cargando configuración desde production.env..."
    source production.env
fi

echo "🏷️  Tag: blog-admin:$TAG"
echo "🌐 API_URL: https://api.bfmu.dev/api"
echo "📂 APP_BASE_PATH: /admin"
echo "🔑 Google OAuth: ${GOOGLE_CLIENT_ID:+configurado}"
echo "🔑 GitHub OAuth: ${GITHUB_CLIENT_ID:+configurado}"

# Build imagen Docker
docker build \
    --build-arg NODE_ENV=production \
    --build-arg API_URL=https://api.bfmu.dev/api \
    --build-arg APP_NAME="Blog Admin Panel" \
    --build-arg APP_VERSION="$TAG" \
    --build-arg GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
    --build-arg GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID" \
    --build-arg ENABLE_REGISTRATION=false \
    --build-arg ENABLE_OAUTH=true \
    --build-arg APP_BASE_PATH="/admin" \
    --tag "blog-admin:$TAG" \
    --label "environment=production" \
    --label "build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --label "version=$TAG" \
    --label "base-path=/admin" \
    .

if [ $? -eq 0 ]; then
    echo "✅ Imagen Docker construida: blog-admin:$TAG"
    echo ""
    echo "🚀 Para probar localmente:"
    echo "   docker run -d --name admin-test -p 8080:80 blog-admin:$TAG"
    echo "   # Acceder a: http://localhost:8080/admin"
    echo ""
    echo "📋 Para exportar (si usas Dokploy):"
    echo "   docker save blog-admin:$TAG | gzip > blog-admin-$TAG.tar.gz"
else
    echo "❌ Error construyendo imagen Docker"
    exit 1
fi
