/**
 * Configuración centralizada de URLs del frontend
 *
 * Variables de entorno (Astro requiere prefijo PUBLIC_ para exponer al cliente):
 * - PUBLIC_BACKEND_URL: URL base del backend (API, imágenes). Para comunicación con el backend.
 * - PUBLIC_BACKEND_URL_SSR: (Opcional) URL del backend cuando el servidor (SSR) hace peticiones.
 *   En Docker, el servidor necesita conectar al backend por red interna (ej: http://backend:3000).
 *   Si no se define, se usa PUBLIC_BACKEND_URL.
 * - PUBLIC_WEB_SITE_URL: URL del sitio web para links de compartir, sitemap, Open Graph, etc.
 *
 * También se aceptan BACKEND_URL y WEB_SITE_URL como alias (para .env).
 */

function getBackendUrlEnv(): string {
  return (
    import.meta.env.PUBLIC_BACKEND_URL ||
    import.meta.env.BACKEND_URL ||
    import.meta.env.PUBLIC_API_URL || // Compatibilidad con configuración anterior
    'http://localhost:3000/'
  );
}

function getBackendUrlSsrEnv(): string | undefined {
  return (
    import.meta.env.PUBLIC_BACKEND_URL_SSR ||
    import.meta.env.BACKEND_URL_SSR ||
    import.meta.env.PUBLIC_API_URL_DOCKER // Compatibilidad con configuración anterior
  );
}

/**
 * Obtiene la URL base del backend
 * - En el cliente (navegador): siempre PUBLIC_BACKEND_URL
 * - En el servidor (SSR): PUBLIC_BACKEND_URL_SSR si existe (Docker), sino PUBLIC_BACKEND_URL
 */
export function getBackendUrl(): string {
  const isClient = typeof window !== 'undefined';

  if (!isClient && import.meta.env.SSR) {
    const ssrUrl = getBackendUrlSsrEnv();
    if (ssrUrl) {
      return ssrUrl.endsWith('/') ? ssrUrl : `${ssrUrl}/`;
    }
  }

  const url = getBackendUrlEnv();
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Obtiene la URL base de la API (backend + /api)
 */
export function getBackendApiUrl(): string {
  const base = getBackendUrl();
  return `${base.replace(/\/$/, '')}/api`;
}

/**
 * Construye una URL completa para un recurso del backend (ej: imágenes en /uploads/...)
 * Si recibe una URL absoluta que apunta a nuestros uploads, extrae el path y rebuild con el dominio actual.
 */
export function getBackendResourceUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http')) {
    try {
      const u = new URL(path);
      if (u.pathname.startsWith('/uploads/')) path = u.pathname;
      else return path;
    } catch {
      return path;
    }
  }
  const base = getBackendUrl().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Obtiene la URL del sitio web para links de compartir, sitemap, etc.
 */
export function getWebSiteUrl(): string {
  const url =
    import.meta.env.PUBLIC_WEB_SITE_URL ||
    import.meta.env.WEB_SITE_URL ||
    import.meta.env.PUBLIC_BASE_URL || // Compatibilidad con configuración anterior
    'http://localhost:4321/';
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Obtiene la URL de Grafana (visor de logs).
 * - Dev: http://localhost:3001
 * - Prod: {PUBLIC_WEB_SITE_URL}/grafana/ o PUBLIC_GRAFANA_URL si está definida
 */
export function getGrafanaUrl(): string {
  const explicit = import.meta.env.PUBLIC_GRAFANA_URL;
  if (explicit) return explicit.endsWith('/') ? explicit : `${explicit}/`;
  if (import.meta.env.DEV) return 'http://localhost:3001';
  const base = getWebSiteUrl().replace(/\/$/, '');
  return `${base}/grafana/`;
}
