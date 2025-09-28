#!/bin/bash

# ====================
# Script de Build para Frontend Admin
# ====================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[BUILD]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Función para mostrar ayuda
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV        Entorno de build (development|staging|production)"
    echo "  -t, --tag TAG        Tag para la imagen Docker"
    echo "  -p, --push           Push de la imagen a registry"
    echo "  -c, --clean          Limpiar antes del build"
    echo "  -h, --help           Mostrar esta ayuda"
    echo ""
    echo "Examples:"
    echo "  $0 -e production -t v1.0.0"
    echo "  $0 --env staging --clean"
    echo "  $0 -e production -t latest --push"
}

# Valores por defecto
ENVIRONMENT="production"
TAG="latest"
PUSH=false
CLEAN=false

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Opción desconocida: $1"
            ;;
    esac
done

# Validar entorno
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    error "Entorno inválido: $ENVIRONMENT. Usar: development, staging, o production"
fi

log "Iniciando build para entorno: $ENVIRONMENT"
log "Tag de imagen: $TAG"

# Cambiar al directorio del proyecto
cd "$(dirname "$0")/.."

# Verificar que estamos en el directorio correcto
if [[ ! -f "package.json" ]]; then
    error "No se encuentra package.json. ¿Estás en el directorio correcto?"
fi

# Limpiar si se solicita
if [[ "$CLEAN" == true ]]; then
    warning "Limpiando builds anteriores..."
    rm -rf dist/ .angular/ node_modules/.cache/
    docker system prune -f --filter label=stage=build
    success "Limpieza completada"
fi

# Verificar dependencias
log "Verificando dependencias..."
if [[ ! -d "node_modules" ]]; then
    warning "node_modules no existe. Instalando dependencias..."
    npm ci
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado o no está disponible en PATH"
fi

# Verificar que Docker esté ejecutándose
if ! docker info >/dev/null 2>&1; then
    error "Docker no está ejecutándose"
fi

# Configurar variables de entorno según el entorno
export NODE_ENV="$ENVIRONMENT"

case $ENVIRONMENT in
    development)
        export PUBLIC_API_URL="http://localhost:82/api"
        ;;
    staging)
        export PUBLIC_API_URL="https://api-staging.tudominio.com/api"
        ;;
    production)
        export PUBLIC_API_URL="https://api.tudominio.com/api"
        ;;
esac

log "API URL configurada: $PUBLIC_API_URL"

# Build de la imagen Docker
IMAGE_NAME="blog-admin"
FULL_TAG="$IMAGE_NAME:$TAG"

log "Construyendo imagen Docker: $FULL_TAG"

# Build con argumentos de build
docker build \
    --target production \
    --build-arg NODE_ENV="$ENVIRONMENT" \
    --build-arg PUBLIC_API_URL="$PUBLIC_API_URL" \
    --tag "$FULL_TAG" \
    --label "environment=$ENVIRONMENT" \
    --label "build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --label "version=$TAG" \
    .

if [[ $? -eq 0 ]]; then
    success "Imagen construida exitosamente: $FULL_TAG"
else
    error "Falló la construcción de la imagen Docker"
fi

# Mostrar información de la imagen
log "Información de la imagen:"
docker images "$IMAGE_NAME:$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"

# Push si se solicita
if [[ "$PUSH" == true ]]; then
    warning "Push a registry no implementado aún"
    log "Para hacer push manual:"
    echo "  docker tag $FULL_TAG your-registry.com/$FULL_TAG"
    echo "  docker push your-registry.com/$FULL_TAG"
fi

# Mostrar comandos útiles
success "Build completado!"
echo ""
log "Comandos útiles:"
echo "  # Ejecutar contenedor:"
echo "  docker run -d -p 8080:80 --name blog-admin-$ENVIRONMENT $FULL_TAG"
echo ""
echo "  # Ver logs:"
echo "  docker logs -f blog-admin-$ENVIRONMENT"
echo ""
echo "  # Detener contenedor:"
echo "  docker stop blog-admin-$ENVIRONMENT && docker rm blog-admin-$ENVIRONMENT"
echo ""
echo "  # Usar docker-compose:"
echo "  ADMIN_PORT=8080 docker-compose -f docker-compose.prod.yml up -d"
