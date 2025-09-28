#!/bin/bash

# ====================
# Script de Deploy para Frontend Admin
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
    echo -e "${BLUE}[DEPLOY]${NC} $1"
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
    echo "  -e, --env ENV        Entorno de deploy (staging|production)"
    echo "  -t, --tag TAG        Tag de la imagen a deployar"
    echo "  -p, --port PORT      Puerto para el contenedor (default: 8080)"
    echo "  -d, --domain DOMAIN  Dominio para el deploy"
    echo "  -r, --rollback       Rollback al deploy anterior"
    echo "  -s, --status         Mostrar status del deploy actual"
    echo "  -h, --help           Mostrar esta ayuda"
    echo ""
    echo "Examples:"
    echo "  $0 -e production -t v1.0.0 -d admin.midominio.com"
    echo "  $0 --env staging --port 8081"
    echo "  $0 --rollback -e production"
    echo "  $0 --status"
}

# Valores por defecto
ENVIRONMENT=""
TAG="latest"
PORT="8080"
DOMAIN=""
ROLLBACK=false
STATUS=false

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
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -s|--status)
            STATUS=true
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

# Mostrar status si se solicita
if [[ "$STATUS" == true ]]; then
    log "Status de contenedores admin:"
    docker ps -a --filter "name=blog-admin" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
    exit 0
fi

# Validaciones
if [[ -z "$ENVIRONMENT" ]]; then
    error "Debe especificar un entorno (-e|--env)"
fi

if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    error "Entorno inválido: $ENVIRONMENT. Usar: staging o production"
fi

# Configurar variables según entorno
CONTAINER_NAME="blog-admin-$ENVIRONMENT"
IMAGE_NAME="blog-admin:$TAG"
COMPOSE_FILE="docker-compose.prod.yml"

# Verificar que la imagen existe
if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    error "La imagen $IMAGE_NAME no existe. Ejecuta el build primero."
fi

log "Iniciando deploy para entorno: $ENVIRONMENT"
log "Imagen: $IMAGE_NAME"
log "Puerto: $PORT"
log "Contenedor: $CONTAINER_NAME"

# Cambiar al directorio del proyecto
cd "$(dirname "$0")/.."

# Función para rollback
do_rollback() {
    warning "Iniciando rollback..."
    
    # Buscar backup del contenedor anterior
    BACKUP_CONTAINER="${CONTAINER_NAME}_backup"
    
    if docker container inspect "$BACKUP_CONTAINER" >/dev/null 2>&1; then
        log "Restaurando contenedor backup: $BACKUP_CONTAINER"
        
        # Detener contenedor actual
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        
        # Renombrar backup al nombre original
        docker rename "$BACKUP_CONTAINER" "$CONTAINER_NAME"
        docker start "$CONTAINER_NAME"
        
        success "Rollback completado"
    else
        error "No se encontró backup para rollback"
    fi
}

# Ejecutar rollback si se solicita
if [[ "$ROLLBACK" == true ]]; then
    do_rollback
    exit 0
fi

# Crear backup del contenedor actual (si existe)
if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    warning "Creando backup del contenedor actual..."
    
    # Detener contenedor actual
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    
    # Renombrar como backup
    BACKUP_CONTAINER="${CONTAINER_NAME}_backup"
    docker rm "$BACKUP_CONTAINER" 2>/dev/null || true
    docker rename "$CONTAINER_NAME" "$BACKUP_CONTAINER" 2>/dev/null || true
    
    success "Backup creado: $BACKUP_CONTAINER"
fi

# Configurar variables de entorno para docker-compose
export ADMIN_PORT="$PORT"
export DOCKER_IMAGE="$IMAGE_NAME"
export NODE_ENV="$ENVIRONMENT"

# Deploy usando docker-compose
log "Deployando usando docker-compose..."

# Crear archivo temporal de compose con la imagen específica
cat > docker-compose.deploy.yml << EOF
version: '3.9'

services:
  frontend-admin:
    image: $IMAGE_NAME
    container_name: $CONTAINER_NAME
    restart: unless-stopped
    
    ports:
      - "$PORT:80"
    
    environment:
      - NODE_ENV=$ENVIRONMENT
      - NGINX_WORKER_PROCESSES=auto
      - NGINX_WORKER_CONNECTIONS=1024
    
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
    
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /var/cache/nginx:rw,noexec,nosuid,size=100m
      - /var/run:rw,noexec,nosuid,size=100m
      - /tmp:rw,noexec,nosuid,size=100m
    
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

# Deployar
docker-compose -f docker-compose.deploy.yml up -d

# Esperar a que el contenedor esté healthy
log "Esperando a que el contenedor esté saludable..."
TIMEOUT=60
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    if docker exec "$CONTAINER_NAME" wget --no-verbose --tries=1 --spider http://localhost/health 2>/dev/null; then
        break
    fi
    
    echo -n "."
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo ""

if [ $ELAPSED -ge $TIMEOUT ]; then
    error "El contenedor no respondió en el tiempo esperado. Revisando logs..."
    docker logs --tail 20 "$CONTAINER_NAME"
    exit 1
fi

success "Deploy completado exitosamente!"

# Limpiar archivo temporal
rm -f docker-compose.deploy.yml

# Mostrar información del deploy
log "Información del deploy:"
echo ""
echo "  🌐 URL: http://localhost:$PORT"
if [[ -n "$DOMAIN" ]]; then
    echo "  🌍 Dominio: https://$DOMAIN"
fi
echo "  📦 Contenedor: $CONTAINER_NAME"
echo "  🏷️  Imagen: $IMAGE_NAME"
echo "  🚀 Entorno: $ENVIRONMENT"
echo ""

log "Comandos útiles:"
echo "  # Ver logs en tiempo real:"
echo "  docker logs -f $CONTAINER_NAME"
echo ""
echo "  # Ver status:"
echo "  docker ps --filter name=$CONTAINER_NAME"
echo ""
echo "  # Ejecutar rollback:"
echo "  $0 --rollback -e $ENVIRONMENT"
echo ""
echo "  # Health check manual:"
echo "  curl http://localhost:$PORT/health"

# Limpiar imágenes antiguas (mantener solo las 3 más recientes)
log "Limpiando imágenes antiguas..."
docker images blog-admin --format "{{.ID}}" | tail -n +4 | xargs -r docker rmi 2>/dev/null || true

success "Deploy finalizado!"

