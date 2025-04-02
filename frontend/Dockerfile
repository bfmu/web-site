# Usar una imagen base oficial de Node.js
FROM node:20-alpine AS builder

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar los archivos necesarios para instalar dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código del proyecto
COPY . .

# Construir el proyecto Astro
RUN npm run build

# Usar una imagen ligera para servir el contenido
FROM nginx:alpine AS runner

# Copiar los archivos generados por Astro al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Comando por defecto para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]