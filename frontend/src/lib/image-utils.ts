/**
 * Utilidades para URLs de imágenes optimizadas.
 * Usa el endpoint /api/media/serve del backend para servir imágenes redimensionadas y comprimidas.
 */
import { getBackendApiUrl } from './env';

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
 * @param version - Cache buster opcional (ej. orientación). Cualquier valor que cambie cuando
 *   la imagen cambia (ej. al rotarla en admin) → URL distinta → cache invalidado automáticamente.
 */
export function getOptimizedImageUrl(
  src: string,
  width?: number,
  quality = 80,
  version?: string | number,
): string {
  const path = extractUploadPath(src);
  if (!path) return src;

  const base = getBackendApiUrl().replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('path', path);
  if (width && width > 0) params.set('w', String(width));
  params.set('q', String(Math.min(100, Math.max(1, quality))));
  if (version !== undefined && version !== null && version !== '') {
    params.set('v', String(version));
  }

  return `${base}/media/serve?${params.toString()}`;
}

/**
 * URL de la imagen original (sin redimensionar). Para vista completa cuando la calidad es crítica.
 * Usa el endpoint serve para aplicar orientación EXIF y rotación del usuario.
 * Nota: archivos grandes (ej. 66MB) tardarán más en cargar.
 */
export function getOriginalImageUrl(
  src: string,
  version?: string | number,
): string {
  const uploadPath = extractUploadPath(src);
  if (!uploadPath) return src;
  return getOptimizedImageUrl(src, undefined, 95, version);
}

/**
 * Genera srcSet para imágenes responsive con varios anchos.
 */
export function getOptimizedImageSrcSet(
  src: string,
  widths: number[] = [400, 800, 1200],
  quality = 80,
  version?: string | number,
): string {
  const path = extractUploadPath(src);
  if (!path) return '';

  const base = getBackendApiUrl().replace(/\/$/, '');
  return widths
    .map((w) => {
      const params = new URLSearchParams();
      params.set('path', path);
      params.set('w', String(w));
      params.set('q', String(quality));
      if (version !== undefined && version !== null && version !== '') {
        params.set('v', String(version));
      }
      return `${base}/media/serve?${params.toString()} ${w}w`;
    })
    .join(', ');
}
