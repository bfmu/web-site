/**
 * API específica para el panel de administración
 * Funciones para CRUD de posts, estadísticas, etc.
 */

import { apiGet, apiPost, apiPatch, apiDelete, apiUpload, ApiException } from './api';

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
    const baseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:82';
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remover trailing slash
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
    // Obtener todos los posts para calcular estadísticas
    const [allPosts, categories, tags] = await Promise.all([
      getPosts({ draft: true, limit: 1000 }), // Obtener todos incluyendo borradores
      getCategories(true),
      getTags(),
    ]);

    const totalPosts = allPosts.pagination.total;
    const publishedPosts = allPosts.posts.filter(p => !p.draft).length;
    const draftPosts = allPosts.posts.filter(p => p.draft).length;
    const totalViews = allPosts.posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const categoriesCount = Array.isArray(categories) ? categories.length : 0;
    const tagsCount = tags.length;

    return {
      totalPosts,
      publishedPosts,
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

