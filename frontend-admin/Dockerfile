# ====================
# Multi-stage Dockerfile for Angular 20 Admin Panel
# Stage 1: Build
# ====================
FROM node:22-alpine AS build

# Instalar dependencias del sistema
RUN apk add --no-cache git

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./

# Instalar dependencias (incluir dev dependencies para build)
RUN npm ci --silent

# Copiar código fuente
COPY . .

# Build de la aplicación para producción
RUN npm run build

# ====================
# Stage 2: Production
# ====================
FROM nginx:1.29.1-alpine AS production

# Instalar certificados SSL para HTTPS
RUN apk add --no-cache ca-certificates

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S angular -u 1001

# Remover configuración por defecto de nginx
RUN rm -f /etc/nginx/conf.d/default.conf

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verificar estructura de build y copiar archivos (Angular 20 usa /browser)
COPY --from=build /app/dist/frontend-admin/browser /usr/share/nginx/html

# Verificar que el index.html de Angular esté presente
RUN test -f /usr/share/nginx/html/index.html || (echo "ERROR: index.html no encontrado" && exit 1)

# Cambiar permisos de archivos
RUN chown -R angular:nodejs /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

# Labels para metadatos
LABEL maintainer="Bryan - Frontend Admin Angular 20"
LABEL version="1.0"
LABEL description="Panel de administración Angular 20 para blog"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Ejecutar Nginx
CMD ["nginx", "-g", "daemon off;"]
