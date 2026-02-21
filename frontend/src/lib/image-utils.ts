/**
 * Utilidades para URLs de imágenes optimizadas.
 * Usa el endpoint /api/media/serve del backend para servir imágenes redimensionadas y comprimidas.
 */
import { getBackendApiUrl, getBackendResourceUrl } from './env';

/**
 * Extrae la ruta relativa de uploads desde una URL o path.
 */
function extractUploadPath(src: string): string | null {
  if (!src) return null;
  if (src.startsWith('/uploads/')) return src;
  if (src.startsWith('http')) {
    try {
      const u = new URL(src);
      if (u.pathname.startsWith('/uploads/')) return u.pathname;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Construye la URL del endpoint de imagen optimizada.
 * @param src - Ruta relativa (/uploads/images/xxx.jpg) o URL completa
 * @param width - Ancho máximo en píxeles (opcional). Para vista completa usa 4096 o superior
 * @param quality - Calidad 1-100 (default: 80, para fotos de alta calidad usa 95)
 */
export function getOptimizedImageUrl(
  src: string,
  width?: number,
  quality = 80
): string {
  const path = extractUploadPath(src);
  if (!path) return src;

  const base = getBackendApiUrl().replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('path', path);
  if (width && width > 0) params.set('w', String(width));
  params.set('q', String(Math.min(100, Math.max(1, quality))));

  return `${base}/media/serve?${params.toString()}`;
}

/**
 * URL de la imagen original (sin redimensionar). Para vista completa cuando la calidad es crítica.
 * Nota: archivos grandes (ej. 66MB) tardarán más en cargar.
 */
export function getOriginalImageUrl(src: string): string {
  const path = extractUploadPath(src);
  if (!path) return src;
  return getBackendResourceUrl(path);
}

/**
 * Genera srcSet para imágenes responsive con varios anchos.
 */
export function getOptimizedImageSrcSet(
  src: string,
  widths: number[] = [400, 800, 1200],
  quality = 80
): string {
  const path = extractUploadPath(src);
  if (!path) return '';

  const base = getBackendApiUrl().replace(/\/$/, '');
  return widths
    .map(
      (w) =>
        `${base}/media/serve?path=${encodeURIComponent(path)}&w=${w}&q=${quality} ${w}w`
    )
    .join(', ');
}
