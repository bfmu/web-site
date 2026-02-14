/**
 * API específica para el panel de administración
 * Funciones para CRUD de posts, estadísticas, etc.
 */

import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiUpload, ApiException } from './api';
import { getAccessToken } from './auth';
import { getBackendUrl, getBackendApiUrl } from './env';

// Tipos
export interface BlogPost {
  _id?: string;
  slug: string;
  title: string;
  content: string;
  description?: string;
  image?: string;
  tags: string[];
  category?: string;
  draft: boolean;
  published: string | Date;
  language: string;
  readingTime: number;
  views: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePostRequest {
  slug: string;
  title: string;
  content: string;
  description?: string;
  image?: string;
  tags?: string[];
  category?: string;
  draft?: boolean;
  published: string | Date;
  language?: string;
  readingTime?: number;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  slug?: string;
}

export interface PostsResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PostQuery {
  search?: string;
  category?: string;
  tag?: string;
  draft?: boolean;
  language?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SlugValidation {
  isValid: boolean;
  suggestedSlug?: string;
}

export interface Stats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  categoriesCount: number;
  tagsCount: number;
}

/**
 * Obtener todos los posts con filtros
 */
export async function getPosts(query: PostQuery = {}): Promise<PostsResponse> {
  const params = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const endpoint = `blog${queryString ? `?${queryString}` : ''}`;
  
  return apiGet<PostsResponse>(endpoint);
}

/**
 * Obtener un post por slug
 */
export async function getPost(slug: string): Promise<BlogPost> {
  return apiGet<BlogPost>(`blog/${slug}`);
}

/**
 * Crear un nuevo post
 */
export async function createPost(post: CreatePostRequest): Promise<BlogPost> {
  return apiPost<BlogPost>('blog', post);
}

/**
 * Actualizar un post
 */
export async function updatePost(slug: string, post: UpdatePostRequest): Promise<BlogPost> {
  return apiPatch<BlogPost>(`blog/${slug}`, post);
}

/**
 * Eliminar un post
 */
export async function deletePost(slug: string): Promise<void> {
  return apiDelete<void>(`blog/${slug}`);
}

/**
 * Validar si un slug está disponible
 */
export async function validateSlug(
  slug: string,
  currentSlug?: string
): Promise<SlugValidation> {
  const params = new URLSearchParams();
  if (currentSlug) {
    params.append('currentSlug', currentSlug);
  }

  const queryString = params.toString();
  return apiGet<SlugValidation>(`blog/validate-slug/${slug}${queryString ? `?${queryString}` : ''}`);
}

/**
 * Obtener categorías
 */
export async function getCategories(withCount: boolean = false): Promise<string[] | Array<{ name: string; count: number }>> {
  const endpoint = `blog/categories${withCount ? '?withCount=true' : ''}`;
  return apiGet<string[] | Array<{ name: string; count: number }>>(endpoint);
}

/**
 * Obtener tags
 */
export async function getTags(): Promise<string[]> {
  return apiGet<string[]>('blog/tags');
}

/**
 * Obtener posts recientes
 */
export async function getRecentPosts(limit: number = 5): Promise<BlogPost[]> {
  return apiGet<BlogPost[]>(`blog/recent?limit=${limit}`);
}

/**
 * Obtener posts relacionados
 */
export async function getRelatedPosts(slug: string, limit: number = 3): Promise<BlogPost[]> {
  return apiGet<BlogPost[]>(`blog/related/${slug}?limit=${limit}`);
}

/**
 * Subir imagen
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  try {
    const result = await apiUpload('blog/upload-image', file);
    // El backend retorna { url, filename, size, mimetype }
    // La URL ya viene como /uploads/images/filename.jpg
    // Necesitamos construir la URL completa con el base URL del backend
    const cleanBaseUrl = getBackendUrl().replace(/\/$/, '');
    const imageUrl = result.url.startsWith('http') 
      ? result.url 
      : `${cleanBaseUrl}${result.url}`;
    return { url: imageUrl };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error(error.message || 'Error al subir la imagen');
  }
}

/**
 * Obtener estadísticas del blog
 */
export async function getStats(): Promise<Stats> {
  try {
    // En SSR, no podemos obtener borradores sin autenticación
    // Obtener solo posts publicados y luego intentar obtener borradores si hay token
    // El backend tiene un límite máximo de 100, así que usamos ese valor
    const [publishedPosts, categories, tags] = await Promise.all([
      getPosts({ draft: false, limit: 100 }), // Solo publicados (máximo permitido)
      getCategories(true).catch(() => []), // Si falla, retornar array vacío
      getTags().catch(() => []), // Si falla, retornar array vacío
    ]);

    let allPosts = publishedPosts;
    let draftPosts = 0;
    
    // Intentar obtener borradores solo si hay token (en el cliente)
    if (typeof window !== 'undefined') {
      try {
        const allPostsWithDrafts = await getPosts({ draft: true, limit: 100 });
        allPosts = allPostsWithDrafts;
        draftPosts = allPosts.posts.filter(p => p.draft).length;
      } catch (error) {
        // Si falla, usar solo los publicados
        console.warn('No se pudieron obtener borradores:', error);
      }
    }

    const totalPosts = allPosts.pagination.total;
    const publishedCount = allPosts.posts.filter(p => !p.draft).length;
    const totalViews = allPosts.posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const categoriesCount = Array.isArray(categories) ? categories.length : 0;
    const tagsCount = tags.length;

    return {
      totalPosts,
      publishedPosts: publishedCount,
      draftPosts,
      totalViews,
      categoriesCount,
      tagsCount,
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    // Retornar valores por defecto en caso de error
    return {
      totalPosts: 0,
      publishedPosts: 0,
      draftPosts: 0,
      totalViews: 0,
      categoriesCount: 0,
      tagsCount: 0,
    };
  }
}

/**
 * Obtener posts más vistos
 */
export async function getMostViewedPosts(limit: number = 10): Promise<BlogPost[]> {
  const response = await getPosts({
    limit,
    sortBy: 'views',
    sortOrder: 'desc',
  });
  return response.posts;
}

/**
 * Calcular tiempo de lectura estimado
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/**
 * Generar slug desde título
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y final
}

/**
 * Obtener perfil del usuario actual
 */
export async function getProfile(): Promise<any> {
  return apiGet('auth/profile');
}

/**
 * Actualizar perfil del usuario
 */
export async function updateProfile(data: { name?: string; avatar?: string }): Promise<any> {
  return apiPatch('auth/profile', data);
}

/**
 * Subir avatar del usuario
 */
export async function uploadAvatar(file: File): Promise<{ url: string; filename: string }> {
  return apiUpload('auth/upload-avatar', file);
}

export async function changePassword(data: {
  currentPassword?: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return apiPost('auth/change-password', data);
}

// ==================== HOMEPAGE API ====================

export interface HomepageSectionConfig {
  id: string;
  enabled?: boolean;
  order?: number;
  config?: Record<string, unknown>;
}

export interface HomepageConfigResponse {
  sections: HomepageSectionConfig[];
}

export async function updateHomepageConfig(data: {
  sections: HomepageSectionConfig[];
}): Promise<HomepageConfigResponse> {
  return apiPut<HomepageConfigResponse>('homepage', data);
}

// ==================== MEDIA API ====================

export interface MediaFile {
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
  albumId?: string;
  alt?: string;
  description?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaQuery {
  type?: string;
  albumId?: string;
  isPublic?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MediaResponse {
  media: MediaFile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MediaUsage {
  inUse: boolean;
  usedInPosts: string[];
  usedInAlbums: string[];
}

/**
 * Subir archivo y crear registro de media
 */
export async function uploadMedia(
  file: File,
  metadata?: { isPublic?: boolean; alt?: string; description?: string; albumId?: string }
): Promise<MediaFile> {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata) {
    if (metadata.isPublic !== undefined) {
      formData.append('isPublic', metadata.isPublic.toString());
    }
    if (metadata.alt) {
      formData.append('alt', metadata.alt);
    }
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    if (metadata.albumId) {
      formData.append('albumId', metadata.albumId);
    }
  }
  
  // Usar la misma lógica que apiUpload pero con campos adicionales
  const endpoint = 'media/upload';
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${getBackendApiUrl()}/${endpoint.replace(/^\//, '')}`;

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  
  // NO establecer Content-Type para FormData, el navegador lo hace automáticamente
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al subir archivo' }));
    throw new ApiException(
      error.message || `Error ${response.status}`,
      response.status,
      error
    );
  }

  const result = await response.json();
  
  // Construir URL completa
  const cleanBaseUrl = getBackendUrl().replace(/\/$/, '');
  const imageUrl = result.url.startsWith('http') 
    ? result.url 
    : `${cleanBaseUrl}${result.url}`;
  
  return {
    ...result,
    url: imageUrl,
  } as MediaFile;
}


/**
 * Listar medios
 */
export async function getMediaList(query: MediaQuery = {}): Promise<MediaResponse> {
  const params = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const endpoint = `media${queryString ? `?${queryString}` : ''}`;
  
  return apiGet<MediaResponse>(endpoint);
}

/**
 * Obtener media por ID
 */
export async function getMedia(id: string): Promise<MediaFile> {
  return apiGet<MediaFile>(`media/${id}`);
}

/**
 * Actualizar metadata del media
 */
export async function updateMedia(id: string, data: Partial<MediaFile>): Promise<MediaFile> {
  return apiPatch<MediaFile>(`media/${id}`, data);
}

/**
 * Eliminar media
 */
export async function deleteMedia(id: string): Promise<void> {
  return apiDelete<void>(`media/${id}`);
}

/**
 * Renombrar archivo del media
 */
export async function renameMedia(id: string, filename: string): Promise<MediaFile> {
  return apiPatch<MediaFile>(`media/${id}/rename`, { filename });
}

/**
 * Verificar uso del media
 */
export async function checkMediaUsage(id: string): Promise<MediaUsage> {
  return apiGet<MediaUsage>(`media/${id}/usage`);
}

/**
 * Mover media a álbum
 */
export async function moveMediaToAlbum(mediaId: string, albumId: string): Promise<MediaFile> {
  return apiPost<MediaFile>(`media/${mediaId}/move-to-album`, { albumId });
}

// ==================== ALBUM API ====================

export interface Album {
  _id: string;
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  images: MediaFile[] | string[];
  isPublic: boolean;
  viewCount: number;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAlbumRequest {
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  images?: string[];
  isPublic?: boolean;
  publishedAt?: string;
}

export interface UpdateAlbumRequest extends Partial<CreateAlbumRequest> {}

export interface AlbumsResponse {
  albums: Album[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AlbumQuery {
  isPublic?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Crear álbum
 */
export async function createAlbum(album: CreateAlbumRequest): Promise<Album> {
  return apiPost<Album>('albums', album);
}

/**
 * Listar álbumes
 */
export async function getAlbums(query: AlbumQuery = {}): Promise<AlbumsResponse> {
  const params = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const endpoint = `albums${queryString ? `?${queryString}` : ''}`;
  
  return apiGet<AlbumsResponse>(endpoint);
}

/**
 * Obtener álbum por slug
 */
export async function getAlbum(slug: string): Promise<Album> {
  return apiGet<Album>(`albums/${slug}`);
}

/**
 * Actualizar álbum
 */
export async function updateAlbum(slug: string, album: UpdateAlbumRequest): Promise<Album> {
  return apiPatch<Album>(`albums/${slug}`, album);
}

/**
 * Eliminar álbum
 */
export async function deleteAlbum(slug: string): Promise<void> {
  return apiDelete<void>(`albums/${slug}`);
}

/**
 * Agregar imagen al álbum
 */
export async function addImageToAlbum(slug: string, mediaId: string): Promise<Album> {
  return apiPost<Album>(`albums/${slug}/images`, { mediaId });
}

/**
 * Agregar múltiples imágenes al álbum
 */
export async function addImagesToAlbumBatch(
  slug: string,
  mediaIds: string[],
): Promise<Album> {
  return apiPost<Album>(`albums/${slug}/images/batch`, { mediaIds });
}

/**
 * Remover imagen del álbum
 */
export async function removeImageFromAlbum(slug: string, mediaId: string): Promise<Album> {
  return apiDelete<Album>(`albums/${slug}/images/${mediaId}`);
}

/**
 * Reordenar imágenes del álbum
 */
export async function reorderAlbumImages(slug: string, imageIds: string[]): Promise<Album> {
  return apiPatch<Album>(`albums/${slug}/reorder`, { imageIds });
}

/**
 * Establecer portada del álbum
 */
export async function setAlbumCover(slug: string, mediaId: string): Promise<Album> {
  return apiPatch<Album>(`albums/${slug}/cover`, { mediaId });
}

// ==================== BACKUP API ====================

export interface BackupMetadata {
  version: string;
  createdAt: string;
  checksums?: Record<string, string>;
  counts?: {
    users: number;
    posts: number;
    media: number;
    albums: number;
    apiintegrations: number;
    oauthproviders: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  metadata?: BackupMetadata;
  warnings: string[];
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restored: {
    users: number;
    posts: number;
    media: number;
    albums: number;
    apiintegrations: number;
    oauthproviders: number;
    filesCount: number;
  };
  preRestoreBackupPath?: string;
  error?: string;
}

/**
 * Crear backup completo (base de datos + archivos).
 * Retorna el Blob del archivo .tar.gz para descargar.
 */
export async function createBackup(): Promise<Blob> {
  const url = `${getBackendApiUrl()}/backup/create`;
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { method: 'POST', headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Error al crear backup' }));
    throw new ApiException(err.message || `Error ${response.status}`, response.status, err);
  }

  return response.blob();
}

/**
 * Validar archivo de backup sin restaurar.
 */
export async function validateBackup(file: File): Promise<ValidationResult> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${getBackendApiUrl()}/backup/validate`;
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Error al validar backup' }));
    throw new ApiException(err.message || `Error ${response.status}`, response.status, err);
  }

  return response.json();
}

const RESTORE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Restaurar sitio desde archivo de backup.
 * Crea un backup automático antes de restaurar.
 */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${getBackendApiUrl()}/backup/restore`;
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    console.log('[Backup] restoreBackup: POST', url, 'token=', !!token, 'fileSize=', file.size);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESTORE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Error al restaurar backup' }));
      throw new ApiException(err.message || `Error ${response.status}`, response.status, err);
    }

    return response.json();
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiException('La restauración tardó demasiado. Por favor, inténtalo de nuevo.', 408);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}