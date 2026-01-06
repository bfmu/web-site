# 👤 Cómo Crear un Usuario

Hay varias formas de crear usuarios en el sistema:

## Opción 1: Crear Admin con CLI (Recomendado) ⭐

### Desde Docker Compose:

```bash
# Ejecutar el comando interactivo
docker-compose -f docker-compose.dev.yml exec backend npm run create-admin
```

O usando Make:

```bash
make create-admin
```

El comando te pedirá:
- **Nombre completo del admin**
- **Email del admin**
- **Contraseña** (mínimo 6 caracteres)

### Ejemplo:

```bash
$ docker-compose -f docker-compose.dev.yml exec backend npm run create-admin

🚀 Iniciando creación de administrador...

Nombre completo del admin: Juan Pérez
Email del admin: juan@ejemplo.com
Contraseña (mínimo 6 caracteres): ********

⏳ Creando administrador...

✅ ¡Administrador creado exitosamente!
📧 Email: juan@ejemplo.com
👤 Nombre: Juan Pérez
🔑 Rol: admin
🆔 ID: 507f1f77bcf86cd799439011
```

## Opción 2: Registrar Usuario Normal (API)

El primer usuario registrado automáticamente será admin. Los siguientes serán usuarios normales.

### Usando cURL:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "password": "contraseña123"
  }'
```

### Usando el Frontend:

1. Ve a http://localhost:4321/admin/login
2. Si no hay usuarios, el primer registro será admin automáticamente
3. Si ya hay usuarios, necesitas usar el endpoint de registro o el CLI

## Opción 3: Promover Usuario Existente a Admin

Si ya tienes un usuario y quieres hacerlo admin:

```bash
# Usando el comando CLI
docker-compose -f docker-compose.dev.yml exec backend npm run promote-user
```

O usando Make:

```bash
make promote-user
```

## Opción 4: Usando Swagger (Interfaz Web)

1. Ve a http://localhost:4000/api/docs
2. Busca el endpoint `POST /api/auth/register`
3. Haz clic en "Try it out"
4. Completa los campos:
   - `email`: tu email
   - `password`: tu contraseña (mínimo 6 caracteres)
   - `name`: tu nombre
   - `avatar`: (opcional) URL de tu avatar
5. Haz clic en "Execute"

## 📝 Notas Importantes

- **Primer usuario**: El primer usuario registrado automáticamente será `admin`
- **Contraseña**: Mínimo 6 caracteres
- **Email**: Debe ser único (no puede haber dos usuarios con el mismo email)
- **Roles disponibles**: `admin`, `editor`, `user`
- **OAuth**: También puedes crear usuarios usando Google o GitHub OAuth

## 🔐 Roles y Permisos

- **admin**: Acceso completo, puede crear/editar/eliminar posts, gestionar usuarios
- **editor**: Puede crear y editar posts, pero no eliminar ni gestionar usuarios
- **user**: Solo lectura (si está habilitado en el frontend)

## 🐛 Troubleshooting

### Error: "El usuario ya existe"
- El email ya está registrado. Usa otro email o promueve el usuario existente.

### Error: "La contraseña debe tener al menos 6 caracteres"
- Usa una contraseña más larga.

### No puedo ejecutar el comando CLI
- Asegúrate de que el contenedor del backend esté corriendo:
  ```bash
  docker-compose -f docker-compose.dev.yml ps backend
  ```

