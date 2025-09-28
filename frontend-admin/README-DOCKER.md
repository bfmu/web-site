# 🐳 Docker para Frontend Admin - Angular 20

Este documento explica cómo construir y desplegar el panel de administración Angular 20 usando Docker.

## 📋 Tabla de Contenidos

- [Estructura de Archivos](#estructura-de-archivos)
- [Construcción](#construcción)
- [Despliegue](#despliegue)
- [Configuración](#configuración)
- [Comandos Útiles](#comandos-útiles)
- [Troubleshooting](#troubleshooting)

## 📁 Estructura de Archivos

```
frontend-admin/
├── Dockerfile                     # Dockerfile multi-stage para producción
├── .dockerignore                  # Archivos excluidos del contexto Docker
├── docker-compose.prod.yml        # Compose para producción
├── build-config.js               # Configuración de build por entorno
├── scripts/
│   ├── build.sh                  # Script automatizado de build
│   └── deploy.sh                 # Script automatizado de deploy
└── README-DOCKER.md             # Este archivo
```

## 🔨 Construcción

### Opción 1: Build Manual

```bash
# Build básico
docker build -t blog-admin:latest .

# Build con entorno específico
docker build --target production \
  --build-arg NODE_ENV=production \
  --build-arg PUBLIC_API_URL=https://api.tudominio.com/api \
  --tag blog-admin:v1.0.0 \
  .
```

### Opción 2: Script Automatizado (Linux/macOS)

```bash
# Hacer script ejecutable (Linux/macOS)
chmod +x scripts/build.sh

# Build para producción
./scripts/build.sh -e production -t v1.0.0

# Build con limpieza previa
./scripts/build.sh -e production -t latest -c
```

### Opción 3: Script Automatizado (Windows)

```powershell
# En PowerShell
cd frontend-admin
bash scripts/build.sh -e production -t v1.0.0
```

## 🚀 Despliegue

### Opción 1: Docker Run

```bash
# Ejecutar contenedor simple
docker run -d \
  --name blog-admin-prod \
  -p 8080:80 \
  --restart unless-stopped \
  blog-admin:latest

# Con configuración de entorno
docker run -d \
  --name blog-admin-prod \
  -p 8080:80 \
  -e NODE_ENV=production \
  --restart unless-stopped \
  blog-admin:latest
```

### Opción 2: Docker Compose

```bash
# Usar docker-compose para producción
ADMIN_PORT=8080 docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Detener
docker-compose -f docker-compose.prod.yml down
```

### Opción 3: Script de Deploy (Linux/macOS)

```bash
# Deploy a producción
./scripts/deploy.sh -e production -t v1.0.0 -p 8080

# Ver status
./scripts/deploy.sh --status

# Rollback
./scripts/deploy.sh --rollback -e production
```

### Opción 4: Script de Deploy (Windows)

```powershell
# En PowerShell
bash scripts/deploy.sh -e production -t v1.0.0 -p 8080
```

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PUBLIC_API_URL` | URL del backend API | `https://api.tudominio.com/api` |
| `ADMIN_PORT` | Puerto del contenedor | `8080` |

### Configuración por Entorno

#### Desarrollo
```bash
export NODE_ENV=development
export PUBLIC_API_URL=http://localhost:82/api
```

#### Staging  
```bash
export NODE_ENV=staging
export PUBLIC_API_URL=https://api-staging.tudominio.com/api
```

#### Producción
```bash
export NODE_ENV=production
export PUBLIC_API_URL=https://api.tudominio.com/api
```

### Archivo de Configuración

Puedes modificar `build-config.js` para ajustar las configuraciones según tus necesidades:

```javascript
const environments = {
  production: {
    apiUrl: 'https://tu-api.com/api',
    production: true,
    enableLogging: false,
    enableDebugInfo: false
  }
};
```

## 🛠️ Comandos Útiles

### Health Check
```bash
# Verificar que el contenedor está saludable
curl http://localhost:8080/health

# Desde dentro del contenedor
docker exec blog-admin-prod wget --spider http://localhost/health
```

### Logs
```bash
# Ver logs en tiempo real
docker logs -f blog-admin-prod

# Logs recientes
docker logs --tail 50 blog-admin-prod

# Logs de nginx dentro del contenedor
docker exec blog-admin-prod tail -f /var/log/nginx/access.log
```

### Monitoreo
```bash
# Status de contenedores
docker ps --filter "name=blog-admin"

# Uso de recursos
docker stats blog-admin-prod

# Información detallada
docker inspect blog-admin-prod
```

### Mantenimiento
```bash
# Limpiar imágenes no utilizadas
docker image prune -f

# Limpiar contenedores parados
docker container prune -f

# Limpiar todo (cuidado!)
docker system prune -af
```

## 🔧 Troubleshooting

### Problema: Contenedor no inicia

```bash
# Verificar logs
docker logs blog-admin-prod

# Verificar configuración
docker inspect blog-admin-prod

# Ejecutar en modo interactivo para debug
docker run -it --rm blog-admin:latest sh
```

### Problema: Error 502 Bad Gateway

```bash
# Verificar que nginx está ejecutándose
docker exec blog-admin-prod ps aux | grep nginx

# Verificar configuración de nginx
docker exec blog-admin-prod nginx -t

# Verificar archivos estáticos
docker exec blog-admin-prod ls -la /usr/share/nginx/html/
```

### Problema: API no disponible

1. Verificar que `PUBLIC_API_URL` sea correcta
2. Verificar conectividad de red:
   ```bash
   docker exec blog-admin-prod wget --spider https://api.tudominio.com/health
   ```
3. Verificar configuración CORS en el backend

### Problema: Build falla

```bash
# Limpiar caché de npm
rm -rf node_modules package-lock.json
npm install

# Limpiar caché de Docker
docker builder prune -f

# Build con verbose
docker build --no-cache --progress=plain -t blog-admin:debug .
```

## 📊 Optimizaciones de Producción

### Imagen Multi-stage
- **Etapa 1 (build)**: Node.js para compilar la aplicación
- **Etapa 2 (production)**: Nginx Alpine para servir archivos estáticos

### Optimizaciones Nginx
- Compresión gzip habilitada
- Cache de archivos estáticos (1 año)
- Headers de seguridad
- Support para SPA routing

### Seguridad
- Contenedor read-only
- Usuario no-root
- Recursos limitados
- Secrets management (no hardcoded)

### Monitoreo
- Health checks configurados
- Logging estructurado
- Métricas de recursos

## 🌐 Despliegue en Producción

### Con Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name admin.tudominio.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Con Traefik

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.admin.rule=Host(\`admin.tudominio.com\`)"
  - "traefik.http.routers.admin.tls=true"
  - "traefik.http.routers.admin.tls.certresolver=letsencrypt"
```

## 📞 Soporte

Para soporte adicional:

1. Verificar logs: `docker logs blog-admin-prod`
2. Revisar configuración de entorno
3. Validar conectividad con backend
4. Consultar documentación de Angular y Nginx

---

**¡Listo!** Tu panel de administración Angular 20 está dockerizado y listo para producción. 🎉

