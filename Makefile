# Makefile para facilitar el uso de Docker Compose

.PHONY: up down logs restart clean build rebuild ps up-prod down-prod shell-backend shell-frontend shell-mongo

# Levantar todos los servicios
up:
	docker-compose -f docker-compose.dev.yml up -d

# Levantar y ver logs
up-logs:
	docker-compose -f docker-compose.dev.yml up

# Detener todos los servicios
down:
	docker-compose -f docker-compose.dev.yml down

# Ver logs
logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Ver logs de un servicio específico
logs-backend:
	docker-compose -f docker-compose.dev.yml logs -f backend

logs-frontend:
	docker-compose -f docker-compose.dev.yml logs -f frontend

logs-mongo:
	docker-compose -f docker-compose.dev.yml logs -f mongodb

# Detener, reconstruir e iniciar
rebuild:
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.dev.yml up -d --build

# Reiniciar servicios
restart:
	docker-compose -f docker-compose.dev.yml restart

restart-backend:
	docker-compose -f docker-compose.dev.yml restart backend

restart-frontend:
	docker-compose -f docker-compose.dev.yml restart frontend

# Limpiar todo (incluyendo volúmenes)
clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

# Reconstruir imágenes
build:
	docker-compose -f docker-compose.dev.yml build --no-cache

# Ver estado de servicios
ps:
	docker-compose -f docker-compose.dev.yml ps

# Acceder a shell de contenedores
shell-backend:
	docker-compose -f docker-compose.dev.yml exec backend sh

shell-frontend:
	docker-compose -f docker-compose.dev.yml exec frontend sh

shell-mongo:
	docker-compose -f docker-compose.dev.yml exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

# Instalar dependencias (si es necesario)
install-backend:
	docker-compose -f docker-compose.dev.yml exec backend npm install

install-frontend:
	docker-compose -f docker-compose.dev.yml exec frontend pnpm install

# Crear admin (backend)
create-admin:
	docker-compose -f docker-compose.dev.yml exec backend npm run create-admin

# ==================== Documentación ====================

# Servir documentación con Docsify (http://localhost:3333)
docs:
	npx docsify-cli serve docs -p 3333

# ==================== Producción ====================

up-prod:
	docker-compose -f docker-compose.prod.yml up -d

down-prod:
	docker-compose -f docker-compose.prod.yml down

build-prod:
	docker-compose -f docker-compose.prod.yml build --no-cache

ps-prod:
	docker-compose -f docker-compose.prod.yml ps

