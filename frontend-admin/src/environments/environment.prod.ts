// Configuración de entorno de producción
export const environment = {
  production: true,
  apiUrl: 'https://api.bfmu.dev/api',
  appName: 'Blog Admin Panel',
  version: '1.0.0',
  
  // OAuth Configuration
  auth: {
    google: {
      clientId: '',  // Se debe configurar en build time
      redirectUrl: 'https://admin.bfmu.dev/auth/callback'
    },
    github: {
      clientId: '',  // Se debe configurar en build time
      redirectUrl: 'https://admin.bfmu.dev/auth/callback'
    }
  },
  
  // Feature flags
  features: {
    enableRegistration: false,  // Deshabilitado en producción
    enableOAuth: true,
    enableDebugMode: false,
    showDraftPosts: false
  },
  
  // UI Configuration
  ui: {
    itemsPerPage: 20,
    maxFileSize: 10 * 1024 * 1024, // 10MB en producción
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    theme: 'light'
  },
  
  // Cache settings (in milliseconds)
  cache: {
    userProfile: 15 * 60 * 1000,  // 15 minutos
    blogPosts: 5 * 60 * 1000,     // 5 minutos
    categories: 30 * 60 * 1000    // 30 minutos
  }
};
