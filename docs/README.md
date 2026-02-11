# 📚 Documentación - Web Site

Bienvenido a la documentación del blog personal, construido con **Astro** (frontend) y **NestJS** (backend).

## 🚀 Inicio Rápido

```bash
# Levantar todo con Docker
./start-dev.sh
# o
make up
```

Esto levanta:
- **MongoDB** (puerto 27017)
- **Backend NestJS** (puerto 3000)
- **Frontend Astro** (puerto 4321)

## 📖 Guía de lectura

| Sección | Contenido |
|---------|-----------|
| [Inicio Rápido](getting-started/quick-start.md) | Configuración inicial, comandos Make y Docker |
| [Docker](getting-started/docker.md) | Detalles de Docker Compose, volúmenes, troubleshooting |
| [Setup Admin](admin/setup.md) | Panel de administración, editor Tiptap, upload de imágenes |
| [Crear Usuario](admin/crear-usuario.md) | Crear admins, registro, roles |
| [Backend](api/backend.md) | API NestJS, Swagger, tests |
| [Blog API](api/blog.md) | Endpoints REST del blog, estructura de datos |

## 🔗 URLs de Desarrollo

- **Frontend**: http://localhost:4321
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs
- **Admin Panel**: http://localhost:4321/admin/login

## 🎯 Características

- ✅ Blog público con Astro
- ✅ Panel de administración integrado
- ✅ Editor de posts avanzado (Tiptap)
- ✅ Autenticación JWT con OAuth (Google/GitHub)
- ✅ Upload de imágenes
- ✅ Gestión de categorías y tags
- ✅ Estadísticas y analytics
