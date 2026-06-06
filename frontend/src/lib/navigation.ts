/**
 * Navegación que preserva la carga dinámica de Swup (sin recargar toda la página).
 * Mantiene el estado del reproductor y otras instancias en memoria.
 */

/**
 * Navega a una URL usando Swup si está disponible (transición sin reload),
 * o hace un full page navigation como fallback.
 */
export function navigateTo(url: string): void {
  if (typeof window === 'undefined') return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const swup = (window as any).swup;
  if (swup?.navigate) {
    swup.navigate(url);
  } else {
    window.location.href = url;
  }
}
