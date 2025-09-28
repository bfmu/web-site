/**
 * Configuración de build para diferentes entornos
 * Frontend Admin Angular 20
 */

const environments = {
  development: {
    apiUrl: 'http://localhost:82/api',
    production: false,
    enableLogging: true,
    enableDebugInfo: true
  },
  
  staging: {
    apiUrl: 'https://api-staging.bfmu.dev/api',
    production: true,
    enableLogging: true,
    enableDebugInfo: false
  },
  
  production: {
    apiUrl: 'https://api.bfmu.dev/api',
    production: true,
    enableLogging: false,
    enableDebugInfo: false
  }
};

module.exports = {
  environments,
  getCurrentConfig: () => {
    const env = process.env.NODE_ENV || 'development';
    return environments[env] || environments.development;
  }
};

