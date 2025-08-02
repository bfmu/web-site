FROM node:lts AS base
WORKDIR /app

COPY package.json package-lock.json ./

FROM base AS prod-deps
RUN npm install --production

FROM base AS build-deps
RUN npm install --production=false

FROM build-deps AS build
COPY . .

# Configura las variables de entorno en la etapa de construcción
ARG PUBLIC_BASE_URL
ENV PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=${PUBLIC_API_URL}

RUN npm run build

FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD node ./dist/server/entry.mjs