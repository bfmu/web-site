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
- Backend NestJS (puerto 4000)
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
PORT=4000
JWT_SECRET=tu-secret-aqui
```

**Frontend** (`frontend/.env`):
```env
PUBLIC_API_URL=http://localhost:4000/
PUBLIC_BASE_URL=http://localhost:4321/
```

## 📚 Documentación

- [Inicio Rápido con Docker](QUICK_START.md)
- [Setup del Admin](SETUP_ADMIN.md)
- [Docker Compose](README_DOCKER.md)

## 🎯 Características

- ✅ Blog público con Astro
- ✅ Panel de administración integrado
- ✅ Editor de posts avanzado (Tiptap)
- ✅ Autenticación JWT con OAuth (Google/GitHub)
- ✅ Upload de imágenes
- ✅ Gestión de categorías y tags
- ✅ Estadísticas y analytics
- ✅ Responsive design

## 🔗 URLs de Desarrollo

- Frontend: http://localhost:4321
- Backend API: http://localhost:4000
- Swagger Docs: http://localhost:4000/api/docs
- Admin Panel: http://localhost:4321/admin/login
