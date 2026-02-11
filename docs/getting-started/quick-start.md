# 🚀 Inicio Rápido con Docker

## Opción 1: Script Automático (Más Fácil) ⭐

```bash
# Ejecutar el script que configura todo automáticamente
./start-dev.sh
```

Este script:
- ✅ Verifica que Docker esté corriendo
- ✅ Crea los archivos `.env` necesarios si no existen
- ✅ Configura `MONGODB_URI` correctamente para Docker
- ✅ Crea el directorio de uploads
- ✅ Levanta todos los servicios
- ✅ Muestra el estado y URLs

## Opción 2: Usando Make (Recomendado si tienes Make)

```bash
# Levantar todo
make up

# Ver logs
make logs

# Detener todo
make down
```

## Opción 3: Usando Docker Compose directamente

```bash
# Levantar todo
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Detener todo
docker-compose -f docker-compose.dev.yml down
```

## 📋 Configuración Inicial

### 1. Crear archivo .env

```bash
cp .env.example .env
```

Edita `.env` y configura:
- `JWT_SECRET` - Genera uno seguro: `openssl rand -base64 32`
- Credenciales OAuth si las usas

### 2. Crear archivo .env para backend

```bash
cd backend
cp env-example.txt .env
```

Edita `backend/.env` con:
- `MONGODB_URI=mongodb://admin:admin123@mongodb:27017/blog?authSource=admin`
- `JWT_SECRET` (mismo que en .env de la raíz)
- Otras variables necesarias

### 3. Crear archivo .env para frontend

Crea `frontend/.env` con:

```env
PUBLIC_BACKEND_URL=http://localhost:3000/
PUBLIC_BACKEND_URL_SSR=http://backend:3000/
PUBLIC_WEB_SITE_URL=http://localhost:4321/
```

### 4. Levantar servicios

```bash
# Desde la raíz del proyecto
make up
# o
docker-compose -f docker-compose.dev.yml up -d
```

### 5. Verificar que todo esté listo

```bash
make ps
# o
docker-compose -f docker-compose.dev.yml ps
```

Deberías ver 3 servicios: `mongodb`, `backend`, `frontend` todos con estado "Up".

### 6. Acceder a las aplicaciones

- **Frontend**: http://localhost:4321
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs
- **Admin Panel**: http://localhost:4321/admin/login

## 🔧 Comandos Útiles

### Ver logs en tiempo real

```bash
make logs
# o ver solo un servicio
make logs-backend
make logs-frontend
```

### Reiniciar un servicio

```bash
make restart-backend
make restart-frontend
```

### Acceder a MongoDB

```bash
make shell-mongo
# o directamente
mongosh "mongodb://admin:admin123@localhost:27017/blog?authSource=admin"
```

### Crear usuario admin

```bash
make create-admin
# Sigue las instrucciones en pantalla
```

## 🐛 Problemas Comunes

### Los servicios no inician

1. Verifica que los puertos estén libres:

   ```bash
   lsof -i :3000
   lsof -i :4321
   lsof -i :27017
   ```

2. Verifica los logs:

   ```bash
   make logs
   ```

### El frontend no puede conectar al backend

1. Verifica que `PUBLIC_BACKEND_URL` en `frontend/.env` sea:
   ```
   PUBLIC_BACKEND_URL=http://localhost:3000/
   ```

2. Verifica que el backend esté corriendo:
   ```bash
   curl http://localhost:3000/api/blog
   ```

### MongoDB no conecta

1. Verifica que MongoDB esté saludable:
   ```bash
   docker-compose -f docker-compose.dev.yml ps mongodb
   ```

2. Verifica la URI en `backend/.env`:
   ```
   MONGODB_URI=mongodb://admin:admin123@mongodb:27017/blog?authSource=admin
   ```
   **Importante**: Usa `mongodb` (nombre del servicio) no `localhost` dentro de Docker.

## 📝 Notas

- Los cambios en el código se reflejan automáticamente (hot-reload)
- Los datos de MongoDB se persisten en un volumen de Docker
- Las imágenes subidas se guardan en `backend/uploads/images/`
- Para limpiar todo (incluyendo datos): `make clean`
