/**
 * Navegación que preserva la carga dinámica de Swup (sin recargar toda la página).
 * Mantiene el estado del reproductor y otras instancias en memoria.
 */

declare global {
  interface Window {
    swup?: {
      navigate: (url: string, options?: { animate?: boolean }) => void;
    };
  }
}

/**
 * Navega a una URL usando Swup si está disponible (transición sin reload),
 * o hace un full page navigation como fallback.
 */
export function navigateTo(url: string): void {
  if (typeof window === 'undefined') return;

  if (window.swup?.navigate) {
    window.swup.navigate(url);
  } else {
    window.location.href = url;
  }
}
