#!/bin/bash

# ====================
# Script para rebuildar para subdirectorio /admin
# Frontend Admin Angular 20 
# ====================

set -e

echo "🔧 Rebuilding para deployar en bfmu.dev/admin..."

# Cargar variables de entorno
export NODE_ENV=production
export API_URL=https://api.bfmu.dev/api
export APP_BASE_PATH=/admin
export APP_DOMAIN=bfmu.dev
export GOOGLE_REDIRECT_URL=https://bfmu.dev/admin/auth/callback
export GITHUB_REDIRECT_URL=https://bfmu.dev/admin/auth/callback

# Configurar OAuth desde variables existentes si están disponibles
if [ -f "production.env" ]; then
    echo "📋 Cargando configuración desde production.env..."
    source production.env
fi

echo "🌐 API_URL: $API_URL"
echo "📂 APP_BASE_PATH: $APP_BASE_PATH"
echo "🌍 APP_DOMAIN: $APP_DOMAIN"
echo "🔑 Google OAuth: ${GOOGLE_CLIENT_ID:+configurado}"
echo "🔑 GitHub OAuth: ${GITHUB_CLIENT_ID:+configurado}"

# Build para subdirectorio
echo "🏗️  Building aplicación para subdirectorio..."
npm run build:subpath

echo "✅ Build completado para bfmu.dev/admin"
echo ""
echo "📂 Archivos generados en: dist/frontend-admin/browser/"
echo "🚀 Ahora puedes desplegar en Dokploy"
echo ""
echo "⚠️  Recuerda configurar en tu OAuth apps:"
echo "   - Google: https://bfmu.dev/admin/auth/callback"
echo "   - GitHub: https://bfmu.dev/admin/auth/callback"
