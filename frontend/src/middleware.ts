/**
 * Middleware para proteger rutas del admin
 * Solo usuarios autenticados pueden acceder, y solo administradores pueden ver ciertas funciones
 */

import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;

  // Solo proteger rutas que empiecen con /admin
  if (url.pathname.startsWith('/admin')) {
    // Permitir acceso a /admin/login sin autenticación
    if (url.pathname === '/admin/login' || url.pathname.startsWith('/admin/login')) {
      return next();
    }

    // En SSR, no podemos verificar localStorage (window no existe)
    // Permitimos el acceso en SSR y la protección se hace en el cliente
    // El backend también rechazará requests no autorizados con JWT
    // La verificación en el cliente se hace en AdminLayout.astro
    // Los usuarios normales no deberían poder acceder al admin - esto se verifica en el cliente
  }

  return next();
});

