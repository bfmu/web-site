# Sistema de Logging con Grafana Loki

Este documento describe la configuración y uso del sistema de logging integrado (Loki, Promtail, Grafana) para visualizar los logs de la aplicación sin necesidad de acceder al servidor por SSH.

## Resumen

El stack de logging está compuesto por:

- **Loki**: Almacén de logs, optimizado para consultas y agregación
- **Promtail**: Agente que recolecta los logs de los contenedores Docker y los envía a Loki
- **Grafana**: Interfaz web para explorar y buscar los logs

Los contenedores (backend, frontend, mongodb, nginx) escriben sus logs a stdout/stderr. Docker los guarda en archivos JSON. Promtail los lee, los envía a Loki, y Grafana permite consultarlos con LogQL.

## Requisitos

- Docker y Docker Compose
- En Linux: acceso al directorio `/var/lib/docker/containers` del host
- **En macOS**: El stack de logs **no funciona localmente** (Docker Desktop no expone ese path). Debes desplegar en un servidor Linux (producción) para probarlo.

---

## Configurar y probar en producción (desde Mac)

Si desarrollas en Mac, el stack Loki/Promtail no puede leer los logs de los contenedores locales. La solución es **configurar y probar directamente en el servidor de producción** (Linux).

### 1. Variables de entorno en el servidor

En tu servidor Linux de producción, crea o edita el archivo `.env` en la raíz del proyecto. Añade (o verifica) estas variables:

```bash
# Grafana - Cambia la contraseña por una segura
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=TuPasswordSeguroParaGrafana

# Tu dominio (debe coincidir con el que usa nginx)
PUBLIC_WEB_SITE_URL=https://tudominio.com
```

También puedes copiar `env.prod.example` a `.env` y rellenar todos los valores.

### 2. Desplegar en el servidor

SSH a tu servidor y, desde la carpeta del proyecto:

```bash
# Asegúrate de que el .env está configurado
docker compose -f docker-compose.prod.yml up -d
```

Esto levanta todo, incluyendo loki, promtail y grafana. Grafana estará disponible en `https://tudominio.com/grafana/`.

### 3. Verificar que funciona

1. **Abrir Grafana**: Ve a `https://tudominio.com/grafana/` e inicia sesión con `GF_SECURITY_ADMIN_USER` y `GF_SECURITY_ADMIN_PASSWORD`.

2. **Comprobar el datasource**: Menú izquierdo → **Explore** → selecciona **Loki**. Deberías poder ejecutar consultas.

3. **Ver logs**: Ejecuta `{job="containerlogs"}` y pulsa **Run query**. En unos segundos deberían aparecer líneas de log de los contenedores.

4. **Probar el flujo de subida**: Intenta subir una imagen a un álbum desde el panel admin. Si falla, en Grafana busca `{job="containerlogs"} |= "error"` o `|= "upload"` para ver qué ocurrió en el backend.

### 4. Enlace "Logs" en el panel admin

Tras desplegar, los usuarios admin verán el enlace "Logs" en el sidebar. Al hacer clic, se abre Grafana en una nueva pestaña. La URL se infiere automáticamente: `PUBLIC_WEB_SITE_URL` + `/grafana/`. No necesitas ninguna variable extra.

### 5. Seguridad (recomendado)

Grafana expone los logs de tu aplicación. Considera:

- Usar una contraseña fuerte para `GF_SECURITY_ADMIN_PASSWORD`
- Restringir el acceso a `/grafana/` por IP en nginx si solo tú accedes desde una IP fija (ejemplo más abajo)
- O proteger con basic auth adicional a nivel nginx para una capa extra

**Ejemplo: restringir Grafana por IP** (opcional). Añade dentro del `location /grafana/` en `nginx.conf`, antes de `proxy_pass`:

```nginx
# Solo permitir tu IP (cambia TU_IP_PUBLICA por tu IP real, ej: 201.45.123.78)
allow TU_IP_PUBLICA;
deny all;
```

---

## Configuración inicial (referencia)

### Desarrollo local (solo en Linux)

En Linux, el stack funciona localmente:

```bash
docker compose -f docker-compose.dev.yml up -d
```

- **Grafana**: http://localhost:3001 (acceso anónimo como Viewer)
- **Loki**: http://localhost:3100 (para verificar estado: /ready)

### Producción (Linux)

```bash
docker compose -f docker-compose.prod.yml up -d
```

- **Grafana**: `https://tu-dominio.com/grafana/`
- Credenciales: `GF_SECURITY_ADMIN_USER` y `GF_SECURITY_ADMIN_PASSWORD` del `.env`

### Verificación

1. **Loki**: `curl http://localhost:3100/ready` debe retornar `ready`
2. **Grafana**: abrir la URL y verificar que el datasource "Loki" esté configurado (Explore → Loki)
3. **Promtail**: los logs comenzarán a aparecer en Grafana en unos segundos

## Uso de Grafana

### Acceso desde el panel admin

Los administradores tienen un enlace "Logs" en el sidebar del panel admin que abre Grafana en una nueva pestaña.

### Explorar logs

1. Ir a **Explore** (icono de brújula en el menú izquierdo)
2. Seleccionar el datasource **Loki**
3. Usar LogQL para consultar logs

### Ejemplos de consultas LogQL

```logql
# Todos los logs de contenedores
{job="containerlogs"}

# Filtrar por texto "error"
{job="containerlogs"} |= "error"

# Filtrar por "upload" o "álbum"
{job="containerlogs"} |~ "upload|album|Media"

# Excluir ruido
{job="containerlogs"} != "GET /health"
```

### Crear un dashboard básico

1. **Dashboards** → **New** → **New Dashboard**
2. **Add visualization** → elegir **Loki** como source
3. Query: `{job="containerlogs"} |= "error"`
4. Configurar el panel (tipo: logs o estadísticas según necesidad)

## Variables de entorno

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `GF_SECURITY_ADMIN_USER` | Usuario admin de Grafana (prod) | admin |
| `GF_SECURITY_ADMIN_PASSWORD` | Contraseña admin de Grafana (prod) | admin |

La URL de Grafana para el enlace "Logs" del admin se infiere de `PUBLIC_WEB_SITE_URL` + `/grafana/`. Solo define `PUBLIC_GRAFANA_URL` si Grafana está en otro dominio o path.

## Resolución de problemas

### Promtail no ve logs / directorio vacío

El contenedor Promtail monta `/var/lib/docker/containers` desde el host. Verifica:

- En Linux: el path existe y contiene subdirectorios con archivos `*-json.log`
- En macOS con Docker Desktop: este path puede no existir en el sistema de archivos del Mac. Los contenedores se ejecutan en una VM Linux interna. Opciones:
  - Usar Colima o Rancher Desktop, que exponen ese path de forma más estándar
  - En Mac con Docker Desktop, el logging stack puede no recolectar logs hasta que se use un setup alternativo

### Loki no recibe logs

- Comprobar que Promtail esté en la misma red que Loki (`website-network` en dev, `internal` en prod)
- Revisar logs de Promtail: `docker logs website-promtail-dev` o `docker logs website-promtail`

### Grafana sin datasource Loki

- Verificar que el archivo `monitoring/grafana-datasource.yaml` esté montado correctamente en `/etc/grafana/provisioning/datasources/datasources.yaml`
- Reiniciar Grafana tras cambiar la configuración de provisioning

### Grafana 404 al acceder por /grafana/

En producción, nginx debe estar configurado con `location /grafana/` y `GF_SERVER_SERVE_FROM_SUB_PATH=true`. Ver `nginx.conf`.

### Subida de imágenes falla con error genérico

Si las imágenes superan 1MB, nginx las rechazaba por defecto. Se añadió `client_max_body_size 10m` en nginx. Tras cambiar `nginx.conf`, reiniciar el contenedor nginx.

## Limitaciones

- Solo se capturan logs de contenedores (stdout/stderr). Los errores que ocurren en el navegador del usuario no aparecen aquí.
- En producción, considerar una retención de logs (p. ej. configuración de Loki para borrar logs antiguos) y monitorear el tamaño del volumen `loki_data`.

## Archivos de configuración

| Archivo | Descripción |
|---------|-------------|
| `monitoring/loki-config.yaml` | Configuración de Loki (almacenamiento, puertos) |
| `monitoring/promtail-config.yaml` | Configuración de Promtail (ruta de logs, pipeline) |
| `monitoring/grafana-datasource.yaml` | Provisioning del datasource Loki en Grafana |
