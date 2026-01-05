# Setup del Panel de Administración

## ✅ Completado

### Frontend
- ✅ Dependencias de Tiptap instaladas
- ✅ Sistema de autenticación JWT completo
- ✅ Cliente API con refresh automático de tokens
- ✅ Layout del admin con sidebar responsive
- ✅ Página de login con OAuth (Google/GitHub)
- ✅ Dashboard con estadísticas
- ✅ Listado de posts con filtros y paginación
- ✅ Editor de posts con Tiptap (avanzado)
- ✅ Upload de imágenes con drag & drop
- ✅ Gestión de categorías y tags
- ✅ Favicon arreglado

### Backend
- ✅ Endpoint de upload de imágenes (`POST /api/blog/upload-image`)
- ✅ Servir archivos estáticos desde `/uploads`
- ✅ Validación de imágenes (tipo y tamaño)
- ✅ Directorio de uploads configurado

## 🚀 Cómo usar

### 1. Iniciar el backend

```bash
cd backend
npm run start:dev
```

El backend estará disponible en `http://localhost:4000` (o el puerto configurado).

### 2. Iniciar el frontend

```bash
cd frontend
npm run dev
```

El frontend estará disponible en `http://localhost:4321` (o el puerto configurado).

### 3. Acceder al admin

1. Ve a `http://localhost:4321/admin/login`
2. Inicia sesión con:
   - Email/Password (si tienes usuario local)
   - Google OAuth
   - GitHub OAuth

### 4. Crear tu primer post

1. Después de login, ve al dashboard
2. Click en "Nuevo Post"
3. Completa el formulario:
   - Título (el slug se genera automáticamente)
   - Descripción
   - Contenido (usa el editor Tiptap)
   - Categoría y tags
   - Imagen de portada (drag & drop)
   - Fecha de publicación
4. Guarda como borrador o publica directamente

## 📁 Estructura de archivos

```
frontend/
├── src/
│   ├── lib/
│   │   ├── auth.ts              # Autenticación
│   │   ├── api.ts                # Cliente API
│   │   └── admin-api.ts          # API del admin
│   ├── components/
│   │   └── admin/
│   │       ├── AdminLayout.astro
│   │       ├── PostEditor.tsx
│   │       ├── PostForm.tsx
│   │       ├── ImageUpload.tsx
│   │       ├── CategoryInput.tsx
│   │       ├── TagInput.tsx
│   │       └── StatsCard.astro
│   ├── pages/
│   │   └── admin/
│   │       ├── login.astro
│   │       ├── index.astro       # Dashboard
│   │       └── posts/
│   │           ├── index.astro   # Listado
│   │           ├── new.astro     # Nuevo post
│   │           └── [slug].astro  # Editar post
│   └── middleware.ts             # Protección de rutas
```

## 🔧 Configuración

### Variables de entorno del frontend

Asegúrate de tener en `.env`:

```env
PUBLIC_API_URL=http://localhost:4000/
```

### Variables de entorno del backend

El backend necesita:
- `MONGODB_URI` - URI de MongoDB
- `JWT_SECRET` - Secreto para JWT
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (opcional, para OAuth)
- `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` (opcional, para OAuth)

## 📝 Notas importantes

1. **Upload de imágenes**: Las imágenes se guardan en `backend/uploads/images/`. Asegúrate de que este directorio tenga permisos de escritura.

2. **Autenticación**: El sistema usa JWT con refresh tokens. Los tokens se guardan en `localStorage`.

3. **Editor Tiptap**: El editor incluye:
   - Formato de texto (negrita, cursiva, subrayado)
   - Encabezados (H1, H2, H3)
   - Listas (con viñetas y numeradas)
   - Citas
   - Código (inline y bloques)
   - Enlaces
   - Imágenes

4. **Responsive**: El admin es completamente responsive. En mobile, el sidebar se colapsa automáticamente.

## 🐛 Troubleshooting

### Error: "No se puede conectar al backend"
- Verifica que el backend esté corriendo
- Verifica `PUBLIC_API_URL` en el frontend
- Verifica CORS en el backend

### Error: "Token expirado"
- El sistema debería refrescar automáticamente
- Si persiste, cierra sesión y vuelve a iniciar

### Las imágenes no se cargan
- Verifica que el directorio `backend/uploads/images/` exista
- Verifica permisos de escritura
- Verifica que el backend esté sirviendo archivos estáticos

### El editor Tiptap no funciona
- Verifica que las dependencias estén instaladas: `npm list @tiptap/react`
- Revisa la consola del navegador para errores

## 🎨 Personalización

### Cambiar colores del admin

Los colores se pueden cambiar en los componentes usando las clases de Tailwind. Busca `bg-indigo-600` y `text-indigo-600` para cambiar el color principal.

### Agregar más extensiones a Tiptap

1. Instala la extensión: `npm install @tiptap/extension-nombre`
2. Importa en `PostEditor.tsx`
3. Agrega a la configuración del editor

## 📚 Documentación

- [Tiptap Docs](https://tiptap.dev/)
- [Astro Docs](https://docs.astro.build/)
- [NestJS Docs](https://docs.nestjs.com/)

