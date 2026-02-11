# 🐳 Docker Compose para Desarrollo

Este docker-compose levanta automáticamente todo lo necesario para desarrollo:
- MongoDB
- Backend (NestJS) con hot-reload
- Frontend (Astro) con hot-reload

## 🚀 Inicio Rápido

### 1. Configurar variables de entorno

```bash
# Copiar ejemplo
cp .env.example .env

# Editar .env con tus valores
# Especialmente importante:
# - JWT_SECRET (generar uno seguro)
# - OAuth credentials (Google/GitHub) si los usas
```

### 2. Levantar todo

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Ver logs

```bash
# Todos los servicios
docker-compose -f docker-compose.dev.yml logs -f

# Solo backend
docker-compose -f docker-compose.dev.yml logs -f backend

# Solo frontend
docker-compose -f docker-compose.dev.yml logs -f frontend

# Solo MongoDB
docker-compose -f docker-compose.dev.yml logs -f mongodb
```

### 4. Detener todo

```bash
docker-compose -f docker-compose.dev.yml down
```

### 5. Detener y eliminar volúmenes (limpiar datos)

```bash
docker-compose -f docker-compose.dev.yml down -v
```

## 📋 Servicios Disponibles

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:4321 | Astro con hot-reload |
| Backend API | http://localhost:3000 | NestJS con hot-reload |
| Backend Docs | http://localhost:3000/api/docs | Swagger UI |
| MongoDB | localhost:27017 | Base de datos |

## 🔧 Comandos Útiles

### Ver estado de servicios

```bash
docker-compose -f docker-compose.dev.yml ps
```

### Reiniciar un servicio

```bash
docker-compose -f docker-compose.dev.yml restart backend
docker-compose -f docker-compose.dev.yml restart frontend
```

### Ejecutar comandos en un contenedor

```bash
# Backend
docker-compose -f docker-compose.dev.yml exec backend npm run create-admin

# Frontend
docker-compose -f docker-compose.dev.yml exec frontend pnpm run build
```

### Acceder a MongoDB

```bash
# Desde el host
mongosh "mongodb://admin:admin123@localhost:27017/blog?authSource=admin"

# O desde dentro del contenedor
docker-compose -f docker-compose.dev.yml exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
```

## 📁 Volúmenes

Los datos se persisten en volúmenes de Docker:
- `mongodb_data`: Datos de MongoDB
- `mongodb_config`: Configuración de MongoDB
- `./backend/uploads`: Imágenes subidas (se guarda en el host)

## 🔄 Hot Reload

Tanto el backend como el frontend tienen hot-reload configurado:
- **Backend**: Los cambios en `backend/src/` se reflejan automáticamente
- **Frontend**: Los cambios en `frontend/src/` se reflejan automáticamente

## 🐛 Troubleshooting

### Los servicios no inician

1. Verificar que los puertos no estén en uso:

   ```bash
   lsof -i :3000  # Backend
   lsof -i :4321  # Frontend
   lsof -i :27017 # MongoDB
   ```

2. Ver logs de errores:
   ```bash
   docker-compose -f docker-compose.dev.yml logs
   ```

### MongoDB no conecta

1. Verificar que MongoDB esté saludable:
   ```bash
   docker-compose -f docker-compose.dev.yml ps mongodb
   ```

2. Verificar la URI en `.env`:
   ```
   MONGODB_URI=mongodb://admin:admin123@mongodb:27017/blog?authSource=admin
   ```

### El frontend no puede conectar al backend

1. Verificar que `PUBLIC_BACKEND_URL` en `.env` del frontend sea:
   ```
   PUBLIC_BACKEND_URL=http://localhost:3000/
   ```

2. Si estás accediendo desde el navegador, usa `localhost`, no `127.0.0.1`

### Las imágenes no se suben

1. Verificar que el directorio `backend/uploads` exista y tenga permisos:
   ```bash
   mkdir -p backend/uploads/images
   chmod 755 backend/uploads/images
   ```

## Producción

Para producción, usa `docker-compose.prod.yml`:

```bash
docker-compose -f docker-compose.prod.yml up -d
# o: make up-prod
```

Incluye MongoDB, backend, frontend y nginx (puertos 80/443). Requiere variables de entorno en `.env` (ver `env.prod.example`).

## 📝 Notas

- Los `node_modules` están en volúmenes anónimos para evitar conflictos
- MongoDB usa credenciales por defecto (`admin/admin123`) - **cámbialas en producción**
- El backend y frontend se reconstruyen automáticamente si cambias los Dockerfiles
