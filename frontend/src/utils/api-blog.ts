// Utilidades para consumir la API REST del backend de blog

// Función helper para construir URLs correctamente
function buildUrl(...parts: string[]): string {
  return parts
    .map(part => part.replace(/^\/+|\/+$/g, '')) // Remover barras al inicio y final
    .filter(part => part.length > 0)
    .join('/');
}

// Configurar URLs de la API
// En SSR (servidor), usar el nombre del servicio Docker 'backend'
// En el cliente (navegador), usar localhost
function getApiBaseUrl(): string {
  // Si estamos en el servidor (SSR), usar el nombre del servicio Docker
  if (import.meta.env.SSR) {
    // En Docker, usar el nombre del servicio
    const dockerApiUrl = import.meta.env.PUBLIC_API_URL_DOCKER || 'http://backend:4000/';
    return dockerApiUrl.endsWith('/') ? dockerApiUrl : `${dockerApiUrl}/`;
  }
  // En el cliente, usar la URL pública (localhost desde el navegador)
  const publicApiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/';
  return publicApiUrl.endsWith('/') ? publicApiUrl : `${publicApiUrl}/`;
}

const BASE_API_URL = `${getApiBaseUrl()}api`;
const API_URL = buildUrl(BASE_API_URL, 'blog');

// Debug: mostrar URLs construidas
console.debug(`[API Config] BASE_API_URL: ${BASE_API_URL}`);
console.debug(`[API Config] API_URL: ${API_URL}`);

// Permitir ver borradores en frontend si PUBLIC_SHOW_DRAFTS=true (solo para desarrollo/admin)
const SHOW_DRAFTS = import.meta.env.PUBLIC_SHOW_DRAFTS === 'true';

export async function fetchPosts(params: Record<string, any> = {}) {
  // Por defecto, solo mostrar posts publicados (draft: false)
  // Solo mostrar drafts si se especifica explícitamente draft: true o si SHOW_DRAFTS está activado
  if (params.draft === undefined) {
    // Si SHOW_DRAFTS está activado, no filtrar (mostrar todos)
    // Si no, filtrar solo posts publicados
    if (!SHOW_DRAFTS) {
      params.draft = false;
    }
  }
  const query = new URLSearchParams(params).toString();
  console.debug(`[fetchPosts] GET: ${API_URL}${query ? `?${query}` : ''}`);
  const res = await fetch(`${API_URL}${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Error al obtener posts');
  return res.json();
}

export async function fetchPostBySlug(slug: string) {
  const url = buildUrl(API_URL, slug);
  console.debug(`[fetchPostBySlug] GET: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Post no encontrado');
  return res.json();
}

export async function fetchRecentPosts(limit = 5) {
  // Por defecto, solo mostrar posts publicados
  const draftParam = SHOW_DRAFTS ? '' : '&draft=false';
  const url = `${buildUrl(API_URL, 'recent')}?limit=${limit}${draftParam}`;
  console.debug(`[fetchRecentPosts] GET: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener posts recientes');
  return res.json();
}

export async function fetchCategories(params: Record<string, any> = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${buildUrl(API_URL, 'categories')}${query ? `?${query}` : ''}`;
  console.debug(`[fetchCategories] GET: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener categorías');
  return res.json();
}

export async function fetchTags(params: Record<string, any> = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${buildUrl(API_URL, 'tags')}${query ? `?${query}` : ''}`;
  console.debug(`[fetchTags] GET: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener etiquetas');
  return res.json();
}

