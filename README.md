# Web Site - Blog Personal

Blog personal construido con Astro (frontend) y NestJS (backend), con panel de administración integrado.

## 🚀 Inicio Rápido

### Opción 1: Docker Compose (Recomendado)

```bash
# Levantar todo automáticamente
./start-dev.sh

# O manualmente
docker-compose -f docker-compose.dev.yml up -d
```

Esto levanta:
- MongoDB (puerto 27017)
- Backend NestJS (puerto 3000)
- Frontend Astro (puerto 4321)

### Opción 2: Manual

```bash
# 1. Iniciar MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# 2. Iniciar Backend
cd backend
npm install
npm run start:dev

# 3. Iniciar Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## 📁 Estructura del Proyecto

```
web-site/
├── backend/          # API NestJS + MongoDB
├── frontend/         # Astro + Admin integrado
├── docker-compose.dev.yml  # Docker para desarrollo
└── start-dev.sh      # Script de inicio rápido
```

## 🔧 Configuración

### Variables de Entorno

**Backend** (`backend/.env`):
```env
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/blog?authSource=admin
PORT=3000
JWT_SECRET=tu-secret-aqui
```

**Frontend** (`frontend/.env`):
```env
PUBLIC_BACKEND_URL=http://localhost:3000/
PUBLIC_WEB_SITE_URL=http://localhost:4321/
```

## 📚 Documentación

Toda la documentación está organizada en la carpeta [`docs/`](docs/README.md) con un gestor de documentación (Docsify):

```bash
# Ver la documentación localmente
make docs
# o: npx docsify-cli serve docs
```

Luego abre http://localhost:3333 en tu navegador.

## 🎯 Características

- ✅ Blog público con Astro
- ✅ Panel de administración integrado
- ✅ Editor de posts avanzado (Tiptap)
- ✅ Autenticación JWT con OAuth (Google/GitHub)
- ✅ Upload de imágenes
- ✅ Gestión de categorías y tags
- ✅ Estadísticas y analytics
- ✅ Responsive design

## ⚠️ Gotchas de Desarrollo

### Swup y scripts de página

El frontend usa [Swup](https://swup.js.org/) (`@swup/astro`) para transiciones SPA-like entre páginas. Esto significa que la navegación normal (click en un link) **no recarga la página** — Swup reemplaza el contenido del DOM vía el evento `content:replace`.

**Un `<script>` inline dentro de un `.astro` NO se vuelve a ejecutar en esa transición.** Solo corre en la carga completa inicial (hard refresh / primera visita). Si una página tiene lógica que depende del DOM (fetch de datos, chart rendering, event listeners), y esa lógica vive en un `<script>` inline, va a "funcionar" con recarga dura pero se va a romper silenciosamente al navegar hacia esa página desde otra (por eso este tipo de bug es fácil de no detectar en desarrollo).

**Patrón correcto** (ya usado en `login-init.ts`, `backup-init.ts`, `posts-init.ts`, `tags-init.ts`, `analytics-page-init.ts`, `dashboard-init.ts`):
1. Mover toda la lógica de la página a `frontend/src/lib/<page>-init.ts`, exportando una función `initXPage()`.
2. Registrarla en `initPageSpecific()` dentro de `frontend/src/layouts/Layout.astro`, con un chequeo de `path.endsWith('/ruta/de/la/pagina')`.
3. Esa función se llama tanto en la carga inicial como en cada `content:replace` de Swup, así que reconsultá los elementos del DOM cada vez que corre (los nodos viejos ya no existen tras el swap) y limpiá/disponé estado que quede atado al DOM anterior (ej. instancias de gráficos con `.dispose()`).

## 🔗 URLs de Desarrollo

- Frontend: http://localhost:4321
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs
- Admin Panel: http://localhost:4321/admin/login
