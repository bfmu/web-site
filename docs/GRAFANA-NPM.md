# Configurar Grafana con Nginx Proxy Manager

Grafana se sirve por **subdominio** (`grafana.bfmu.dev`) en lugar de subpath (`bfmu.dev/grafana`) porque NPM tiene problemas conocidos con subpaths.

## Pasos en Nginx Proxy Manager

1. **Crear Proxy Host** para `grafana.bfmu.dev`:
   - **Domain Names**: `grafana.bfmu.dev`
   - **Forward Hostname/IP**: `website-grafana` (nombre del contenedor)
   - **Forward Port**: `3000`
   - **Scheme**: `http`

2. **Activar WebSockets** (obligatorio para Grafana Live):
   - En el Proxy Host, pestaña **Advanced**
   - Añadir en **Custom Nginx Configuration**:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

3. **SSL**: Activar "Force SSL" y obtener certificado Let's Encrypt.

4. **DNS**: Asegúrate de que `grafana.bfmu.dev` apunte a la IP del servidor (mismo registro A que bfmu.dev o CNAME).

## Red Docker

El contenedor `website-grafana` debe estar en la red `proxy` para que NPM lo alcance. El `docker-compose.prod.yml` ya lo configura.

## Acceso

- **URL**: https://grafana.bfmu.dev/
- **Usuario**: `admin` (o el de `GF_SECURITY_ADMIN_USER`)
- **Contraseña**: la de `GF_SECURITY_ADMIN_PASSWORD` en `.env`

## Redirección

Si alguien visita `bfmu.dev/grafana`, se redirige automáticamente a `grafana.bfmu.dev`.
