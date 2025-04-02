FROM node:20-slim AS builder

ARG PUBLIC_BASE_URL
ENV PUBLIC_BASE_URL=$PUBLIC_BASE_URL

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN rm -rf node_modules package-lock.json && \
    npm install --force && \
    npm cache clean --force
RUN npm run build

FROM nginx:alpine AS runner
# Copiar archivos de Astro
COPY --from=builder /app/dist /usr/share/nginx/html


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
