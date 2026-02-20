/**
 * Tracking de vistas de página para analytics.
 * Envía cada vista al backend (IP, ubicación, etc. se obtienen en el servidor).
 */

import { getBackendApiUrl } from './env';

function shouldTrack(path: string): boolean {
  // No trackear rutas del admin
  return !path.startsWith('/admin');
}

export function trackPageView(path?: string): void {
  if (typeof window === 'undefined') return;

  const p = path ?? window.location.pathname;
  if (!shouldTrack(p)) return;

  const apiUrl = `${getBackendApiUrl()}/analytics/track`;
  const payload = JSON.stringify({ path: p });
  const blob = new Blob([payload], { type: 'application/json' });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(apiUrl, blob);
  } else {
    fetch(apiUrl, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}
