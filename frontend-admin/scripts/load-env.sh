#!/bin/bash

# ====================
# Script para cargar variables de entorno
# Frontend Admin Angular 20
# ====================

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[ENV]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Función para mostrar ayuda
show_help() {
    echo "Usage: $0 [ENVIRONMENT]"
    echo ""
    echo "Environments:"
    echo "  production    Cargar variables de producción"
    echo "  staging       Cargar variables de staging"
    echo "  development   Cargar variables de desarrollo"
    echo ""
    echo "Examples:"
    echo "  source $0 production"
    echo "  . $0 staging"
}

# Determinar entorno
ENV=${1:-production}

case $ENV in
    production)
        ENV_FILE="production.env"
        ;;
    staging)
        ENV_FILE="staging.env"
        ;;
    development)
        ENV_FILE="development.env"
        ;;
    *)
        echo "Entorno desconocido: $ENV"
        show_help
        exit 1
        ;;
esac

# Cambiar al directorio del script
cd "$(dirname "$0")/.."

# Verificar que el archivo existe
if [[ ! -f "$ENV_FILE" ]]; then
    warning "Archivo $ENV_FILE no encontrado. Creando desde template..."
    
    case $ENV in
        production)
            # Crear archivo de producción
            cat > "$ENV_FILE" << 'EOF'
# Variables de Entorno - Producción
NODE_ENV=production
API_URL=https://api.bfmu.dev/api
APP_NAME=Blog Admin Panel
APP_VERSION=1.0.0

# OAuth (configurar con valores reales)
GOOGLE_CLIENT_ID=
GITHUB_CLIENT_ID=
GOOGLE_REDIRECT_URL=https://admin.bfmu.dev/auth/callback
GITHUB_REDIRECT_URL=https://admin.bfmu.dev/auth/callback

# Feature Flags
ENABLE_REGISTRATION=false
ENABLE_OAUTH=true
ENABLE_DEBUG_MODE=false
SHOW_DRAFT_POSTS=false

# UI Configuration
ITEMS_PER_PAGE=20
MAX_FILE_SIZE=10485760
UI_THEME=light

# Cache (millisegundos)
CACHE_USER_PROFILE=900000
CACHE_BLOG_POSTS=300000
CACHE_CATEGORIES=1800000
EOF
            ;;
        staging)
            cat > "$ENV_FILE" << 'EOF'
# Variables de Entorno - Staging
NODE_ENV=staging
API_URL=https://api-staging.bfmu.dev/api
APP_NAME=Blog Admin Panel (Staging)
APP_VERSION=1.0.0-staging

# OAuth (configurar con valores reales)
GOOGLE_CLIENT_ID=
GITHUB_CLIENT_ID=
GOOGLE_REDIRECT_URL=https://admin-staging.bfmu.dev/auth/callback
GITHUB_REDIRECT_URL=https://admin-staging.bfmu.dev/auth/callback

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_OAUTH=true
ENABLE_DEBUG_MODE=true
SHOW_DRAFT_POSTS=true

# UI Configuration
ITEMS_PER_PAGE=15
MAX_FILE_SIZE=8388608
UI_THEME=light

# Cache (millisegundos)
CACHE_USER_PROFILE=600000
CACHE_BLOG_POSTS=180000
CACHE_CATEGORIES=1200000
EOF
            ;;
        development)
            cat > "$ENV_FILE" << 'EOF'
# Variables de Entorno - Desarrollo
NODE_ENV=development
API_URL=http://localhost:82/api
APP_NAME=Blog Admin Panel (Dev)
APP_VERSION=1.0.0-dev

# OAuth (configurar con valores reales)
GOOGLE_CLIENT_ID=
GITHUB_CLIENT_ID=
GOOGLE_REDIRECT_URL=http://localhost:4200/auth/callback
GITHUB_REDIRECT_URL=http://localhost:4200/auth/callback

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_OAUTH=true
ENABLE_DEBUG_MODE=true
SHOW_DRAFT_POSTS=true

# UI Configuration
ITEMS_PER_PAGE=10
MAX_FILE_SIZE=5242880
UI_THEME=light

# Cache (millisegundos)
CACHE_USER_PROFILE=300000
CACHE_BLOG_POSTS=120000
CACHE_CATEGORIES=600000
EOF
            ;;
    esac
    
    success "Archivo $ENV_FILE creado. Edítalo con tus valores reales."
fi

log "Cargando variables de entorno desde: $ENV_FILE"

# Cargar variables de entorno
set -a  # Exportar automáticamente las variables
source "$ENV_FILE"
set +a

# Mostrar variables cargadas (ocultar secretos)
log "Variables de entorno cargadas para: $ENV"
echo ""
echo "🌐 NODE_ENV: $NODE_ENV"
echo "🌐 API_URL: $API_URL"
echo "📱 APP_NAME: $APP_NAME"
echo "🏷️  APP_VERSION: $APP_VERSION"
echo "🔑 GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:+***configurado***}"
echo "🔑 GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:+***configurado***}"
echo "🎛️  ENABLE_REGISTRATION: $ENABLE_REGISTRATION"
echo "🎛️  ENABLE_OAUTH: $ENABLE_OAUTH"
echo "🐛 ENABLE_DEBUG_MODE: $ENABLE_DEBUG_MODE"
echo "📄 SHOW_DRAFT_POSTS: $SHOW_DRAFT_POSTS"
echo "📄 ITEMS_PER_PAGE: $ITEMS_PER_PAGE"
echo ""

success "Variables de entorno cargadas exitosamente"

# Si se ejecuta directamente (no con source), mostrar instrucciones
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo ""
    warning "Para cargar las variables en tu shell actual, ejecuta:"
    echo "  source $0 $ENV"
    echo "  # o"
    echo "  . $0 $ENV"
fi
