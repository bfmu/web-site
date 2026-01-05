# Instalación de Dependencias

## Frontend - Tiptap

Para instalar las dependencias de Tiptap necesarias para el editor de posts, ejecuta:

```bash
cd frontend
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-underline @tiptap/extension-text-style @tiptap/extension-color
```

## Backend - Multer (para upload de imágenes)

El backend ya tiene `multer` en las dependencias (se usa con `@nestjs/platform-express`), pero si necesitas instalarlo explícitamente:

```bash
cd backend
npm install multer @types/multer
```

## Verificar instalación

### Frontend
```bash
cd frontend
npm list @tiptap/react @tiptap/starter-kit
```

### Backend
```bash
cd backend
npm list multer
```

## Notas

- El endpoint de upload de imágenes se ha agregado en `/api/blog/upload-image`
- Las imágenes se guardan en `backend/uploads/images/`
- Asegúrate de que el directorio `uploads` tenga permisos de escritura
- En producción, considera usar un servicio de almacenamiento como S3 o Cloudinary

