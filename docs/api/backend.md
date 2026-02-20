# Backend - web-site

Este backend está construido con [NestJS](https://nestjs.com/) e incluye:

- **Módulo Blog**: API RESTful para gestión de posts de blog (CRUD, búsqueda, categorías, tags, posts relacionados, recientes, etc.)
- **Integración con MongoDB** usando Mongoose
- **Endpoints para Spotify** (integración con música)
- **Tests unitarios y de integración** para el módulo blog
- **Documentación interactiva con Swagger**

## Configuración rápida

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz de `backend` (ver ejemplo en `env-example.txt` o en [Blog API](blog.md)).

3. Levanta MongoDB (puedes usar Docker):

   ```bash
   docker run -d --name mongodb-blog -p 27017:27017 -e MONGO_INITDB_DATABASE=blog mongo:latest
   ```

4. Ejecuta el backend:

   ```bash
   npm run start:dev
   ```

## Endpoints principales

- `/api/blog` - Endpoints RESTful para el blog (ver detalles en [Blog API](blog.md))
- `/api/spotify` - Endpoints para integración con Spotify

## Comandos disponibles

### Desarrollo

```bash
# development
npm run start

# watch mode (hot-reload)
npm run start:dev

# production
npm run start:prod
```

### Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

### Formatear código

```bash
npx prettier --write .
```

## Documentación interactiva (Swagger)

El backend expone la documentación de la API en:

```
http://localhost:PUERTO/api/docs
```

> Reemplaza `PUERTO` por el puerto configurado en tu `.env` (por defecto 3000).

Desde Swagger puedes:
- Consultar todos los endpoints y sus parámetros
- Ver ejemplos de request y response
- Probar la API directamente desde el navegador

## Documentación de la API

Consulta [Blog API](blog.md) para:
- Detalles de todos los endpoints del blog
- Ejemplos de uso
- Estructura de datos
- Cómo ejecutar los tests
