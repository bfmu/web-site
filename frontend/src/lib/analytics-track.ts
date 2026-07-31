/**
 * Tracking de vistas de página y engagement para analytics.
 * Envía cada vista/evento al backend (IP, ubicación, etc. se obtienen en el servidor).
 */

import { getBackendApiUrl } from './env';

const SESSION_ID_KEY = '__analytics_sid';
const SCROLL_THRESHOLDS = [25, 50, 75, 100];
const SCROLL_THROTTLE_MS = 500;

let currentPath = '';
let pageEnteredAt = 0;
let reachedScrollThresholds = new Set<number>();
let scrollListenerAttached = false;
let clickListenerAttached = false;

function shouldTrack(path: string): boolean {
  // No trackear rutas del admin
  return !path.startsWith('/admin');
}

function getSessionId(): string | undefined {
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    // Safari en modo privado (u otras políticas) puede bloquear sessionStorage
    return undefined;
  }
}

function sendPayload(url: string, payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: 'application/json' });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

function sendEvent(
  eventType: 'time_on_page' | 'scroll_depth' | 'click',
  extra: { value?: number; label?: string },
): void {
  if (!shouldTrack(currentPath)) return;

  const apiUrl = `${getBackendApiUrl()}/analytics/event`;
  sendPayload(apiUrl, {
    eventType,
    path: currentPath,
    sessionId: getSessionId(),
    ...extra,
  });
}

function flushTimeOnPage(): void {
  if (!pageEnteredAt) return;
  const seconds = Math.round((performance.now() - pageEnteredAt) / 1000);
  if (seconds < 1) return; // descarta rebotes instantáneos / prerender
  sendEvent('time_on_page', { value: seconds });
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    flushTimeOnPage();
  } else if (document.visibilityState === 'visible') {
    // Resetea para no acumular tiempo "en pausa" entre cambios de pestaña
    pageEnteredAt = performance.now();
  }
}

function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let lastCall = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

function onScroll(): void {
  const scrollHeight = document.body.scrollHeight;
  if (scrollHeight <= window.innerHeight) return; // página sin scroll real

  const pct = Math.round(
    ((window.scrollY + window.innerHeight) / scrollHeight) * 100,
  );

  for (const threshold of SCROLL_THRESHOLDS) {
    if (pct >= threshold && !reachedScrollThresholds.has(threshold)) {
      reachedScrollThresholds.add(threshold);
      sendEvent('scroll_depth', { value: threshold });
    }
  }
}

function onClick(e: MouseEvent): void {
  const target = e.target as Element | null;
  const el = target?.closest('[data-track-click]');
  if (!el) return;
  const label = el.getAttribute('data-track-click');
  if (!label) return;
  sendEvent('click', { label });
}

function attachEngagementListeners(): void {
  if (!scrollListenerAttached) {
    window.addEventListener('scroll', throttle(onScroll, SCROLL_THROTTLE_MS), {
      passive: true,
    });
    scrollListenerAttached = true;
  }

  if (!clickListenerAttached) {
    document.addEventListener('click', onClick);
    clickListenerAttached = true;
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', flushTimeOnPage);
}

export function trackPageView(path?: string): void {
  if (typeof window === 'undefined') return;

  // Si veníamos de una página anterior, cerrar su medición de tiempo en página
  if (currentPath) flushTimeOnPage();

  const p = path ?? window.location.pathname;
  currentPath = p;
  pageEnteredAt = performance.now();
  reachedScrollThresholds = new Set();

  if (!shouldTrack(p)) return;

  attachEngagementListeners();

  const apiUrl = `${getBackendApiUrl()}/analytics/track`;
  sendPayload(apiUrl, { path: p, sessionId: getSessionId() });
}
