// Configuración de entorno por defecto (desarrollo)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:82/api',
  appName: 'Blog Admin Panel',
  version: '1.0.0',
  
  // OAuth Configuration
  auth: {
    google: {
      clientId: '',
      redirectUrl: 'http://localhost:4200/auth/callback'
    },
    github: {
      clientId: '',
      redirectUrl: 'http://localhost:4200/auth/callback'
    }
  },
  
  // Feature flags
  features: {
    enableRegistration: true,
    enableOAuth: true,
    enableDebugMode: true,
    showDraftPosts: true
  },
  
  // UI Configuration
  ui: {
    itemsPerPage: 10,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    theme: 'light'
  },
  
  // Cache settings (in milliseconds)
  cache: {
    userProfile: 5 * 60 * 1000, // 5 minutos
    blogPosts: 2 * 60 * 1000,   // 2 minutos
    categories: 10 * 60 * 1000   // 10 minutos
  }
};
