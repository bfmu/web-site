// Configuración de entorno de staging
export const environment = {
  production: true,
  apiUrl: 'https://api-staging.bfmu.dev/api',
  appName: 'Blog Admin Panel (Staging)',
  version: '1.0.0-staging',
  
  // OAuth Configuration
  auth: {
    google: {
      clientId: '',  // Se debe configurar en build time
      redirectUrl: 'https://admin-staging.bfmu.dev/auth/callback'
    },
    github: {
      clientId: '',  // Se debe configurar en build time
      redirectUrl: 'https://admin-staging.bfmu.dev/auth/callback'
    }
  },
  
  // Feature flags
  features: {
    enableRegistration: true,   // Habilitado para testing
    enableOAuth: true,
    enableDebugMode: true,      // Debug habilitado en staging
    showDraftPosts: true
  },
  
  // UI Configuration
  ui: {
    itemsPerPage: 15,
    maxFileSize: 8 * 1024 * 1024, // 8MB
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    theme: 'light'
  },
  
  // Cache settings (in milliseconds)
  cache: {
    userProfile: 10 * 60 * 1000,  // 10 minutos
    blogPosts: 3 * 60 * 1000,     // 3 minutos
    categories: 20 * 60 * 1000    // 20 minutos
  }
};
