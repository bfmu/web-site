// Utilidades para consumir la API REST del backend de blog

// Función helper para construir URLs correctamente
function buildUrl(...parts: string[]): string {
  return parts
    .map(part => part.replace(/^\/+|\/+$/g, '')) // Remover barras al inicio y final
    .filter(part => part.length > 0)
    .join('/');
}

// Configurar URLs de la API
// En SSR (servidor): PUBLIC_API_URL_DOCKER en Docker, si no PUBLIC_API_URL (localhost)
// En el cliente (navegador): PUBLIC_API_URL (localhost)
function getApiBaseUrl(): string {
  if (import.meta.env.SSR) {
    const dockerApiUrl = import.meta.env.PUBLIC_API_URL_DOCKER;
    if (dockerApiUrl) {
      const base = dockerApiUrl.endsWith('/') ? dockerApiUrl : `${dockerApiUrl}/`;
      return base;
    }
    const fallback = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/';
    return fallback.endsWith('/') ? fallback : `${fallback}/`;
  }
  const publicApiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/';
  return publicApiUrl.endsWith('/') ? publicApiUrl : `${publicApiUrl}/`;
}

function getBlogApiUrl(): string {
  return buildUrl(`${getApiBaseUrl()}api`, 'blog');
}

// Permitir ver borradores en frontend si PUBLIC_SHOW_DRAFTS=true (solo para desarrollo/admin)
const SHOW_DRAFTS = import.meta.env.PUBLIC_SHOW_DRAFTS === 'true';

export async function fetchPosts(params: Record<string, any> = {}) {
  if (params.draft === undefined) {
    if (!SHOW_DRAFTS) params.draft = false;
  }
  const apiUrl = getBlogApiUrl();
  const query = new URLSearchParams(params).toString();
  const url = `${apiUrl}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener posts');
  return res.json();
}

export async function fetchPostBySlug(slug: string) {
  const url = buildUrl(getBlogApiUrl(), slug);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Post no encontrado');
  return res.json();
}

export async function fetchRecentPosts(limit = 5) {
  const draftParam = SHOW_DRAFTS ? '' : '&draft=false';
  const url = `${buildUrl(getBlogApiUrl(), 'recent')}?limit=${limit}${draftParam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener posts recientes');
  return res.json();
}

export async function fetchCategories(params: Record<string, any> = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${buildUrl(getBlogApiUrl(), 'categories')}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener categorías');
  return res.json();
}

export async function fetchTags(params: Record<string, any> = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${buildUrl(getBlogApiUrl(), 'tags')}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener etiquetas');
  return res.json();
}

// ==================== GALLERY API ====================

function getGalleryApiUrl(): string {
  return buildUrl(`${getApiBaseUrl()}api`, 'gallery');
}

export interface GalleryAlbum {
  _id: string;
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  images: GalleryImage[] | string[];
  isPublic: boolean;
  viewCount: number;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GalleryImage {
  _id: string;
  filename: string;
  originalName: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  type: string;
  isPublic: boolean;
  alt?: string;
  description?: string;
  order: number;
}

export interface AlbumsResponse {
  albums: GalleryAlbum[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Obtener lista de álbumes públicos
 */
export async function fetchPublicAlbums(): Promise<AlbumsResponse> {
  const url = buildUrl(getGalleryApiUrl(), 'albums');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener álbumes');
  return res.json();
}

/**
 * Obtener álbum público por slug
 */
export async function fetchPublicAlbum(slug: string): Promise<GalleryAlbum> {
  const url = buildUrl(getGalleryApiUrl(), 'albums', slug);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Álbum no encontrado');
  return res.json();
}

/**
 * Obtener imagen pública por ID
 */
export async function fetchPublicImage(id: string): Promise<GalleryImage> {
  const url = buildUrl(getGalleryApiUrl(), 'images', id);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Imagen no encontrada');
  return res.json();
}

