#!/bin/bash

# Script para iniciar el entorno de desarrollo con Docker

set -e

echo "🚀 Iniciando entorno de desarrollo..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker Desktop."
    exit 1
fi

# Verificar archivos .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env no existe${NC}"
    echo "Creando desde .env.docker.example..."
    if [ -f "backend/.env.docker.example" ]; then
        cp backend/.env.docker.example backend/.env
        echo -e "${GREEN}✓ backend/.env creado${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita backend/.env y configura:${NC}"
        echo "   - JWT_SECRET (genera uno seguro: openssl rand -base64 32)"
        echo "   - Credenciales OAuth si las usas"
        echo ""
    elif [ -f "backend/env-example.txt" ]; then
        cp backend/env-example.txt backend/.env
        # Actualizar MONGODB_URI para Docker
        sed -i.bak 's|mongodb://localhost:27017/blog|mongodb://admin:admin123@mongodb:27017/blog?authSource=admin|' backend/.env
        rm -f backend/.env.bak
        echo -e "${GREEN}✓ backend/.env creado${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita backend/.env y configura:${NC}"
        echo "   - JWT_SECRET (genera uno seguro)"
        echo ""
    else
        echo "❌ No se encontró ningún archivo de ejemplo"
        exit 1
    fi
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}⚠️  frontend/.env no existe${NC}"
    echo "Creando..."
    cat > frontend/.env << EOF
PUBLIC_API_URL=http://localhost:3000/
PUBLIC_BASE_URL=http://localhost:4321/
EOF
    echo -e "${GREEN}✓ frontend/.env creado${NC}"
fi

# Crear directorio de uploads
mkdir -p backend/uploads/images
chmod 755 backend/uploads/images

# Levantar servicios
echo ""
echo "📦 Levantando servicios con Docker Compose..."
docker-compose -f docker-compose.dev.yml up -d

# Esperar a que los servicios estén listos
echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 5

# Verificar estado
echo ""
echo "📊 Estado de los servicios:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo -e "${GREEN}✅ Servicios iniciados!${NC}"
echo ""
echo "📍 URLs disponibles:"
echo "   Frontend:    http://localhost:4321"
echo "   Backend API: http://localhost:3000"
echo "   Swagger:     http://localhost:3000/api/docs"
echo "   Admin:       http://localhost:4321/admin/login"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs:    docker-compose -f docker-compose.dev.yml logs -f"
echo "   Detener:     docker-compose -f docker-compose.dev.yml down"
echo "   Reiniciar:   docker-compose -f docker-compose.dev.yml restart"
echo ""

