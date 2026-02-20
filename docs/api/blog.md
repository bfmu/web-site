# Blog API - Documentación

## Configuración

### Variables de entorno necesarias

Crea un archivo `.env` en la raíz del backend con las siguientes variables:

```env
# Puerto del servidor
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/blog

# Spotify API (opcional)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token
SPOTIFY_REDIRECT=http://localhost:3000/api/spotify/callback
```

## Tests unitarios y de integración

El módulo `blog` incluye pruebas unitarias y de integración para asegurar el correcto funcionamiento de la lógica y los endpoints.

### Ejecutar los tests

Desde la carpeta `backend` ejecuta:

```bash
npm test
```

Si todo está correcto, deberías ver:

```
Test Suites: 2 passed, 2 total
Tests:       16 passed, 16 total
```

Puedes modificar o agregar más tests en los archivos:
- `src/blog/blog.service.spec.ts`
- `src/blog/blog.controller.spec.ts`

## Endpoints del Blog

### Posts

#### Obtener todos los posts

```
GET /api/blog
```

**Query parameters:**
- `search`: Buscar en título, descripción y contenido
- `category`: Filtrar por categoría
- `tag`: Filtrar por tag
- `draft`: Filtrar por estado de borrador (true/false)
- `language`: Filtrar por idioma
- `page`: Número de página (default: 1)
- `limit`: Límite de posts por página (default: 10, max: 100)
- `sortBy`: Campo para ordenar (default: 'published')
- `sortOrder`: Orden ascendente o descendente (asc/desc, default: 'desc')

**Ejemplo:**

```
GET /api/blog?page=1&limit=5&category=tech&search=javascript
```

#### Obtener un post por slug

```
GET /api/blog/:slug
```

#### Crear un nuevo post

```
POST /api/blog
```

**Body:**

```json
{
  "slug": "mi-primer-post",
  "title": "Mi Primer Post",
  "content": "# Contenido en Markdown\n\nEste es el contenido del post...",
  "description": "Descripción del post",
  "image": "/images/post-image.jpg",
  "tags": ["javascript", "web"],
  "category": "Desarrollo",
  "draft": false,
  "published": "2024-01-15T10:00:00.000Z",
  "language": "es",
  "readingTime": 5
}
```

#### Actualizar un post

```
PATCH /api/blog/:slug
```

#### Eliminar un post

```
DELETE /api/blog/:slug
```

### Categorías y Tags

#### Obtener todas las categorías

```
GET /api/blog/categories
```

#### Obtener todos los tags

```
GET /api/blog/tags
```

### Posts relacionados y recientes

#### Obtener posts relacionados

```
GET /api/blog/related/:slug?limit=3
```

#### Obtener posts recientes

```
GET /api/blog/recent?limit=5
```

## Estructura de datos

### Post Schema

```typescript
{
  slug: string;           // URL única del post
  title: string;          // Título del post
  content: string;        // Contenido en Markdown
  description?: string;   // Descripción opcional
  image?: string;         // URL de la imagen
  tags?: string[];        // Array de tags
  category?: string;      // Categoría
  draft: boolean;         // Estado de borrador
  published: Date;       // Fecha de publicación
  language: string;       // Idioma (default: 'es')
  readingTime: number;    // Tiempo de lectura en minutos
  views: number;         // Número de vistas
  createdAt: Date;       // Fecha de creación (automático)
  updatedAt: Date;       // Fecha de actualización (automático)
}
```

## Ejemplos de uso

### Crear un post

```bash
curl -X POST http://localhost:3000/api/blog \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "mi-primer-post",
    "title": "Mi Primer Post",
    "content": "# Hola Mundo\n\nEste es mi primer post en el blog.",
    "description": "Un post de ejemplo",
    "tags": ["ejemplo", "primer-post"],
    "category": "General",
    "published": "2024-01-15T10:00:00.000Z"
  }'
```

### Obtener posts con filtros

```bash
curl "http://localhost:3000/api/blog?category=tech&limit=5&sortBy=published&sortOrder=desc"
```

### Obtener un post específico

```bash
curl http://localhost:3000/api/blog/mi-primer-post
```

## Notas importantes

1. **Slug único**: Cada post debe tener un slug único que se usa en la URL.
2. **Contenido Markdown**: El contenido se almacena en formato Markdown.
3. **Vistas automáticas**: Cada vez que se consulta un post, se incrementa automáticamente el contador de vistas.
4. **Validaciones**: Todos los endpoints incluyen validaciones automáticas de los datos de entrada.
5. **Paginación**: Los endpoints de listado incluyen paginación automática.
