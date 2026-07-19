import { Request } from 'express';

const BOT_USER_AGENT_REGEX =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|ahrefsbot|semrushbot|mj12bot|petalbot|dotbot|screaming frog|uptimerobot|pingdom|python-requests|curl\/|headlesschrome/i;

/**
 * Heurística simple por user-agent. No detecta todo, pero cubre la gran
 * mayoría de crawlers, monitores de uptime y herramientas SEO conocidas.
 */
export function isBot(userAgent?: string): boolean {
  if (!userAgent) return false;
  return BOT_USER_AGENT_REGEX.test(userAgent);
}

/**
 * Detecta si el request viene del propio admin logueado, para no mezclar
 * su navegación con las visitas reales. Solo el login del dueño del sitio
 * setea esta cookie (ver frontend/src/lib/auth.ts).
 */
export function isAdminSession(req: Request): boolean {
  const cookieHeader = req.headers.cookie ?? '';
  return /(^|;\s*)auth_session=/.test(cookieHeader);
}

/**
 * Enmascara los últimos octetos/segmentos de una IP para no exponerla
 * completa en el dashboard. Mantiene el prefijo por si sirve para agrupar
 * visitas por ISP/región a ojo.
 */
export function maskIp(ip: string): string {
  if (!ip) return ip;

  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }

  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}:xxxx:xxxx`;
  }

  return ip;
}

export function parseReferrer(referrer?: string): string {
  if (!referrer) return 'Directo';
  try {
    return new URL(referrer).hostname;
  } catch {
    return referrer;
  }
}

export function parseUserAgent(userAgent?: string): string {
  if (!userAgent) return 'Desconocido';
  if (isBot(userAgent)) return 'Bot';

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  let browser = 'Otro';
  if (/Edg\//.test(userAgent)) browser = 'Edge';
  else if (/OPR\//.test(userAgent)) browser = 'Opera';
  else if (/Chrome\//.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\//.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//.test(userAgent)) browser = 'Safari';

  return isMobile ? `${browser} · Mobile` : browser;
}
