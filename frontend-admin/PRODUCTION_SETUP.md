# 🚀 Configuración de Producción - Frontend Admin

Guía para configurar y desplegar el frontend admin en producción con tu API `https://api.bfmu.dev/api`.

## 📋 Pasos de Configuración

### 1. 🔧 Configurar Variables de Entorno

El archivo `production.env` ya está configurado para tu API. Edita los valores que necesites:

```bash
# Editar configuración de producción
nano production.env
```

**Variables importantes a configurar:**

```bash
# 🔑 OAuth - OBLIGATORIO configurar
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
GITHUB_CLIENT_ID=tu-github-client-id

# 🌍 Dominio de tu admin panel
APP_DOMAIN=admin.bfmu.dev
GOOGLE_REDIRECT_URL=https://admin.bfmu.dev/auth/callback
GITHUB_REDIRECT_URL=https://admin.bfmu.dev/auth/callback

# 📊 Opcional - Analytics
ANALYTICS_ID=tu-google-analytics-id
SENTRY_DSN=tu-sentry-dsn-para-errores
```

### 2. 🏗️ Build de Producción

#### Opción A: Build Local

```bash
# Cargar variables de entorno
source scripts/load-env.sh production

# Build con configuración de producción
npm run build:prod

# Verificar build
ls -la dist/frontend-admin/browser/
```

#### Opción B: Build con Docker

```bash
# Build con variables desde archivo
docker build \
  --build-arg NODE_ENV=production \
  --build-arg API_URL=https://api.bfmu.dev/api \
  --build-arg GOOGLE_CLIENT_ID=tu-google-client-id \
  --build-arg GITHUB_CLIENT_ID=tu-github-client-id \
  --build-arg ENABLE_REGISTRATION=false \
  -t blog-admin:prod \
  .
```

#### Opción C: Build con Script Automatizado

```bash
# Configurar OAuth desde terminal
export GOOGLE_CLIENT_ID="tu-google-client-id"
export GITHUB_CLIENT_ID="tu-github-client-id"

# Build usando script
./scripts/build.sh -e production -t v1.0.0

# Ver imagen creada
docker images blog-admin
```

### 3. 🚀 Despliegue

#### Opción A: Docker Run Básico

```bash
# Ejecutar contenedor
docker run -d \
  --name blog-admin-prod \
  -p 8080:80 \
  --restart unless-stopped \
  blog-admin:prod

# Verificar que funciona
curl http://localhost:8080/health
# Respuesta: healthy
```

#### Opción B: Docker Compose Completo

```yaml
# docker-compose.prod.yml
version: '3.9'
services:
  frontend-admin:
    image: blog-admin:prod
    container_name: blog-admin-prod
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
      - APP_DOMAIN=admin.bfmu.dev
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(\`admin.bfmu.dev\`)"
      - "traefik.http.routers.admin.tls=true"
      - "traefik.http.routers.admin.tls.certresolver=letsencrypt"
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# Desplegar con compose
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Opción C: Script de Deploy Automatizado

```bash
# Deploy completo con script
./scripts/deploy.sh -e production -t v1.0.0 -p 8080 -d admin.bfmu.dev

# Verificar status
./scripts/deploy.sh --status
```

### 4. 🌍 Configuración de Nginx Reverse Proxy

Si usas Nginx como reverse proxy, aquí está la configuración:

```nginx
# /etc/nginx/sites-available/admin.bfmu.dev
server {
    listen 80;
    server_name admin.bfmu.dev;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.bfmu.dev;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/admin.bfmu.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.bfmu.dev/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Para WebSocket si lo usas
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:8080/health;
        access_log off;
    }
}
```

### 5. 🔑 Configuración OAuth

#### Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ o Google Identity
4. Crear credenciales OAuth 2.0:
   - **Authorized JavaScript origins**: `https://admin.bfmu.dev`
   - **Authorized redirect URIs**: `https://admin.bfmu.dev/auth/callback`
5. Copia el **Client ID** (NO el secret)

#### GitHub OAuth

1. Ve a GitHub Settings → Developer settings → OAuth Apps
2. Crear nueva OAuth App:
   - **Homepage URL**: `https://admin.bfmu.dev`
   - **Authorization callback URL**: `https://admin.bfmu.dev/auth/callback`
3. Copia el **Client ID** (NO el secret)

### 6. ✅ Verificación Post-Deploy

```bash
# 1. Verificar que el contenedor está corriendo
docker ps | grep blog-admin

# 2. Health check
curl https://admin.bfmu.dev/health
# Respuesta esperada: healthy

# 3. Verificar que carga la aplicación
curl -I https://admin.bfmu.dev
# Respuesta esperada: HTTP/1.1 200 OK

# 4. Verificar logs
docker logs blog-admin-prod --tail 50

# 5. Verificar configuración OAuth
# Ve a https://admin.bfmu.dev y prueba el login
```

### 7. 🛡️ Configuración Backend (API)

Asegúrate de que tu backend en `https://api.bfmu.dev/api` tenga configurado:

```javascript
// CORS para el admin panel
app.use(cors({
  origin: [
    'https://admin.bfmu.dev',
    'https://bfmu.dev', // tu frontend principal
  ],
  credentials: true
}));

// OAuth redirect URLs configuradas
const oauthConfig = {
  google: {
    callbackURL: 'https://admin.bfmu.dev/auth/callback'
  },
  github: {
    callbackURL: 'https://admin.bfmu.dev/auth/callback'
  }
};
```

### 8. 🔄 Actualizaciones

#### Deploy de una nueva versión

```bash
# 1. Build nueva versión
./scripts/build.sh -e production -t v1.1.0

# 2. Deploy con rollback automático
./scripts/deploy.sh -e production -t v1.1.0

# 3. En caso de problemas, rollback
./scripts/deploy.sh --rollback -e production
```

#### Actualización de variables

```bash
# 1. Editar configuración
nano production.env

# 2. Rebuild con nueva configuración
source scripts/load-env.sh production
./scripts/build.sh -e production -t v1.0.1

# 3. Redeploy
./scripts/deploy.sh -e production -t v1.0.1
```

## 🚨 Troubleshooting

### Problema: OAuth no funciona

```bash
# Verificar configuración
grep -E "(GOOGLE|GITHUB)" production.env

# Verificar que las URLs de callback coinciden
curl -s https://admin.bfmu.dev | grep -o 'auth/callback'
```

### Problema: API no responde

```bash
# Verificar conectividad
curl -I https://api.bfmu.dev/api/health

# Verificar CORS
curl -H "Origin: https://admin.bfmu.dev" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: authorization" \
     -X OPTIONS \
     https://api.bfmu.dev/api/auth/profile
```

### Problema: Contenedor no inicia

```bash
# Ver logs detallados
docker logs blog-admin-prod

# Ejecutar en modo interactivo para debug
docker run -it --rm blog-admin:prod sh
```

## 📞 Comandos de Administración

```bash
# Ver status completo
./scripts/deploy.sh --status

# Ver logs en tiempo real
docker logs -f blog-admin-prod

# Reiniciar contenedor
docker restart blog-admin-prod

# Backup de configuración
cp production.env production.env.backup.$(date +%Y%m%d)

# Limpiar imágenes antiguas
docker image prune -f
```

---

**¡Tu frontend admin está listo para producción!** 🎉

Accede a `https://admin.bfmu.dev` y disfruta de tu panel de administración completamente funcional.
