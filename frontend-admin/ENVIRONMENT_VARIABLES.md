# 🔧 Variables de Entorno - Frontend Admin

Este documento describe todas las variables de entorno disponibles para configurar el panel de administración Angular 20.

## 📋 Variables Principales

### 🌐 **API Configuration**

| Variable | Descripción | Desarrollo | Staging | Producción |
|----------|-------------|------------|---------|------------|
| `API_URL` | URL base de la API backend | `http://localhost:82/api` | `https://api-staging.bfmu.dev/api` | `https://api.bfmu.dev/api` |
| `APP_NAME` | Nombre de la aplicación | `Blog Admin Panel` | `Blog Admin Panel (Staging)` | `Blog Admin Panel` |
| `APP_VERSION` | Versión de la aplicación | `1.0.0` | `1.0.0-staging` | `1.0.0` |

### 🔑 **OAuth Configuration**

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | `123456-abcdef.apps.googleusercontent.com` |
| `GITHUB_CLIENT_ID` | Client ID de GitHub OAuth | `Iv1.a1b2c3d4e5f6g7h8` |
| `GOOGLE_REDIRECT_URL` | URL de callback para Google | `https://admin.bfmu.dev/auth/callback` |
| `GITHUB_REDIRECT_URL` | URL de callback para GitHub | `https://admin.bfmu.dev/auth/callback` |

### 🎛️ **Feature Flags**

| Variable | Descripción | Tipo | Por Defecto |
|----------|-------------|------|-------------|
| `ENABLE_REGISTRATION` | Habilitar registro de usuarios | `boolean` | `false` (prod), `true` (dev/staging) |
| `ENABLE_OAUTH` | Habilitar autenticación OAuth | `boolean` | `true` |
| `ENABLE_DEBUG_MODE` | Habilitar modo debug | `boolean` | `false` (prod), `true` (dev/staging) |
| `SHOW_DRAFT_POSTS` | Mostrar posts en borrador | `boolean` | `false` (prod), `true` (dev/staging) |

### 🎨 **UI Configuration**

| Variable | Descripción | Tipo | Por Defecto |
|----------|-------------|------|-------------|
| `ITEMS_PER_PAGE` | Elementos por página | `number` | `10` (dev), `15` (staging), `20` (prod) |
| `MAX_FILE_SIZE` | Tamaño máximo de archivo en bytes | `number` | `5MB` (dev), `8MB` (staging), `10MB` (prod) |
| `UI_THEME` | Tema de la interfaz | `string` | `light` |

### ⚡ **Cache Configuration** (en millisegundos)

| Variable | Descripción | Desarrollo | Staging | Producción |
|----------|-------------|------------|---------|------------|
| `CACHE_USER_PROFILE` | Cache del perfil de usuario | `5 minutos` | `10 minutos` | `15 minutos` |
| `CACHE_BLOG_POSTS` | Cache de posts del blog | `2 minutos` | `3 minutos` | `5 minutos` |
| `CACHE_CATEGORIES` | Cache de categorías | `10 minutos` | `20 minutos` | `30 minutos` |

## 🛠️ Configuración en Diferentes Entornos

### Desarrollo Local

```bash
# .env.local (no incluido en Git)
NODE_ENV=development
API_URL=http://localhost:82/api
GOOGLE_CLIENT_ID=your-dev-google-client-id
GITHUB_CLIENT_ID=your-dev-github-client-id
ENABLE_DEBUG_MODE=true
```

### Staging

```bash
# Variables de entorno del servidor/CI
NODE_ENV=staging
API_URL=https://api-staging.bfmu.dev/api
GOOGLE_CLIENT_ID=your-staging-google-client-id
GITHUB_CLIENT_ID=your-staging-github-client-id
APP_NAME="Blog Admin Panel (Staging)"
ENABLE_REGISTRATION=true
ENABLE_DEBUG_MODE=true
```

### Producción

```bash
# Variables de entorno de producción
NODE_ENV=production
API_URL=https://api.bfmu.dev/api
GOOGLE_CLIENT_ID=your-prod-google-client-id
GITHUB_CLIENT_ID=your-prod-github-client-id
APP_NAME="Blog Admin Panel"
APP_VERSION="1.0.0"
ENABLE_REGISTRATION=false
ENABLE_DEBUG_MODE=false
SHOW_DRAFT_POSTS=false
```

## 🐳 Configuración con Docker

### Build con Variables de Entorno

```bash
# Build básico
docker build -t blog-admin:latest .

# Build con variables personalizadas
docker build \
  --build-arg NODE_ENV=production \
  --build-arg API_URL=https://api.midominio.com/api \
  --build-arg GOOGLE_CLIENT_ID=mi-google-client-id \
  --build-arg GITHUB_CLIENT_ID=mi-github-client-id \
  --build-arg ENABLE_REGISTRATION=false \
  -t blog-admin:prod \
  .
```

### Ejecución con Variables

```bash
# Ejecutar con variables de entorno
docker run -d \
  --name blog-admin-prod \
  -p 8080:80 \
  -e API_URL=https://api.midominio.com/api \
  blog-admin:prod
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.9'
services:
  frontend-admin:
    build:
      context: .
      args:
        NODE_ENV: production
        API_URL: https://api.bfmu.dev/api
        GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
        GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
        ENABLE_REGISTRATION: "false"
    ports:
      - "8080:80"
    environment:
      - APP_ENV=production
```

## 🚀 Scripts de Build

### Usando Scripts Npm

```bash
# Development build
npm run build

# Production build
npm run build:prod

# Staging build
npm run build:staging

# Con variables personalizadas
API_URL=https://mi-api.com/api npm run build:prod
```

### Usando Scripts de Shell

```bash
# Build básico
./scripts/build.sh -e production -t latest

# Build con variables OAuth
GOOGLE_CLIENT_ID=your-id GITHUB_CLIENT_ID=your-id \
./scripts/build.sh -e production -t v1.0.0

# Build para diferentes entornos
./scripts/build.sh -e staging -t staging-latest
./scripts/build.sh -e production -t prod-v1.0.0
```

## 🔧 Configuración Dinámica

### Script de Configuración

El frontend incluye un script (`scripts/configure-env.js`) que genera automáticamente los archivos de entorno basados en las variables disponibles:

```bash
# Configurar entorno manualmente
node scripts/configure-env.js

# Con variables específicas
NODE_ENV=production API_URL=https://mi-api.com \
node scripts/configure-env.js
```

### Archivos Generados

- `src/environments/environment.ts` - Desarrollo
- `src/environments/environment.prod.ts` - Producción  
- `src/environments/environment.staging.ts` - Staging

## 🛡️ Seguridad

### ⚠️ **Variables Sensibles**

Las siguientes variables contienen información sensible y deben ser manejadas con cuidado:

- `GOOGLE_CLIENT_ID` - Solo el ID público, no el secret
- `GITHUB_CLIENT_ID` - Solo el ID público, no el secret
- `API_URL` - Puede exponer información sobre la arquitectura

### 🔒 **Recomendaciones**

1. **No incluir secrets** en variables de entorno del frontend
2. **Usar diferentes Client IDs** para cada entorno
3. **Configurar CORS** correctamente en el backend
4. **Validar URLs** de callback en los proveedores OAuth
5. **Usar HTTPS** en producción

## 🔍 Debug y Troubleshooting

### Ver Configuración Actual

```bash
# En tiempo de build
npm run configure-env

# Verificar variables en el contenedor
docker exec -it blog-admin-prod printenv | grep -E "(API_URL|GOOGLE|GITHUB)"
```

### Logs de Configuración

Durante el build, el script muestra la configuración aplicada:

```
🔧 Configurando entorno: production
📁 Archivo destino: src/environments/environment.prod.ts
🌐 API_URL: https://api.bfmu.dev/api
📱 APP_NAME: Blog Admin Panel
🔑 GOOGLE_CLIENT_ID: ***configured***
🔑 GITHUB_CLIENT_ID: ***configured***
```

### Variables Comunes de Debug

```bash
# Habilitar logs detallados
ENABLE_DEBUG_MODE=true

# Mostrar información adicional
SHOW_DRAFT_POSTS=true

# Usar API local en desarrollo
API_URL=http://localhost:82/api
```

---

## 📞 Soporte

Para más información sobre configuración:

1. Revisar los archivos en `src/environments/`
2. Consultar `scripts/configure-env.js`
3. Ver ejemplos en `scripts/build.sh`
4. Revisar la documentación Docker en `README-DOCKER.md`
