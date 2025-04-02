FROM node:20-alpine AS builder

ARG PUBLIC_BASE_URL
ENV PUBLIC_BASE_URL=$PUBLIC_BASE_URL

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g pnpm@latest-10
RUN pnpm ci
COPY . .
RUN pnpm run build

FROM nginx:alpine AS runner
# Copiar archivos de Astro
COPY --from=builder /app/dist /usr/share/nginx/html


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
