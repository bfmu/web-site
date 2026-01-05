/**
 * Middleware para proteger rutas del admin
 */

import { defineMiddleware } from 'astro:middleware';
import { isAuthenticated, isAdmin, getUser } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;

  // Solo proteger rutas que empiecen con /admin
  if (url.pathname.startsWith('/admin')) {
    // Permitir acceso a /admin/login sin autenticación
    if (url.pathname === '/admin/login') {
      // Si ya está autenticado, redirigir al dashboard
      if (isAuthenticated()) {
        return context.redirect('/admin');
      }
      return next();
    }

    // Verificar autenticación
    if (!isAuthenticated()) {
      return context.redirect('/admin/login');
    }

    // Verificar que sea admin (en el cliente, en el servidor solo verificamos autenticación)
    // La verificación real de admin se hace en el backend
    const user = getUser();
    if (!user || user.role !== 'admin') {
      // En el servidor no podemos verificar completamente, pero podemos hacer una verificación básica
      // La verificación real se hará en el cliente y el backend rechazará requests no autorizados
    }
  }

  return next();
});

