// Utilidades para consumir la API REST del backend de blog

const BASE_API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:82/api';
const API_URL = `${BASE_API_URL}/blog`;

export async function fetchPosts(params: Record<string, any> = {}) {
  const query = new URLSearchParams(params).toString();
  console.log(`[fetchPosts] GET: ${API_URL}${query ? `?${query}` : ''}`);
  const res = await fetch(`${API_URL}${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Error al obtener posts');
  return res.json();
}

export async function fetchPostBySlug(slug: string) {
  const url = `${API_URL}/${slug}`;
  console.log(`[fetchPostBySlug] GET: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Post no encontrado');
  return res.json();
}

export async function fetchRecentPosts(limit = 5) {
  const url = `${API_URL}/recent?limit=${limit}`;
  console.log(`[fetchRecentPosts] GET: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener posts recientes');
  return res.json();
}

export async function fetchCategories(params: Record<string, any> = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/categories${query ? `?${query}` : ''}`;
  console.log(`[fetchCategories] GET: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener categorías');
  return res.json();
}

export async function fetchTags(params: Record<string, any> = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_URL}/tags${query ? `?${query}` : ''}`;
  console.log(`[fetchTags] GET: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener etiquetas');
  return res.json();
}

