FROM node:lts AS base
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate

# Instala las dependencias de producción
FROM base AS prod-deps
RUN pnpm install --prod

# Instala las dependencias de desarrollo
FROM base AS build-deps
RUN pnpm install

# Construye la aplicación
FROM build-deps AS build
COPY . .

ARG PUBLIC_WEB_SITE_URL
ENV PUBLIC_WEB_SITE_URL=${PUBLIC_WEB_SITE_URL}
ARG PUBLIC_BACKEND_URL
ENV PUBLIC_BACKEND_URL=${PUBLIC_BACKEND_URL}
ARG PUBLIC_GRAFANA_URL
ENV PUBLIC_GRAFANA_URL=${PUBLIC_GRAFANA_URL}

RUN pnpm run build
FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Configura las variables de entorno en la etapa de ejecución
ARG PUBLIC_WEB_SITE_URL
ENV PUBLIC_WEB_SITE_URL=${PUBLIC_WEB_SITE_URL}
ARG PUBLIC_BACKEND_URL
ENV PUBLIC_BACKEND_URL=${PUBLIC_BACKEND_URL}

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD node ./dist/server/entry.mjs