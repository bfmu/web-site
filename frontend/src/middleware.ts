/**
 * Middleware para proteger rutas del admin
 * Solo usuarios autenticados pueden acceder.
 * Sin cookie de sesión = 404 (no mostrar información ni hacer peticiones al backend)
 */

import type { MiddlewareHandler } from 'astro';
import { defineMiddleware } from 'astro:middleware';

const AUTH_SESSION_COOKIE = 'auth_session';

export const onRequest: MiddlewareHandler = defineMiddleware(async (context, next) => {
  const { url } = context;

  // Solo proteger rutas que empiecen con /admin
  if (url.pathname.startsWith('/admin')) {
    // Permitir acceso a /admin/login y /admin/register sin autenticación
    if (
      url.pathname === '/admin/login' ||
      url.pathname.startsWith('/admin/login') ||
      url.pathname === '/admin/register' ||
      url.pathname.startsWith('/admin/register')
    ) {
      return next();
    }

    // Verificar cookie de sesión (establecida al hacer login desde el cliente)
    const cookieHeader = context.request.headers.get('cookie') || '';
    const hasAuthSession = cookieHeader.includes(`${AUTH_SESSION_COOKIE}=`);

    // Sin cookie = no autenticado → retornar 404 sin renderizar nada
    if (!hasAuthSession) {
      return context.rewrite('/404');
    }
  }

  return next();
});

