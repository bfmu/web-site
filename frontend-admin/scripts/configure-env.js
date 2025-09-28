#!/usr/bin/env node

/**
 * Script para configurar variables de entorno en tiempo de build
 * Frontend Admin Angular 20
 */

const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    production: false,
    apiUrl: process.env.API_URL || 'http://localhost:82/api',
    appName: process.env.APP_NAME || 'Blog Admin Panel',
    version: process.env.APP_VERSION || '1.0.0',
    
    auth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        redirectUrl: process.env.GOOGLE_REDIRECT_URL || 'http://localhost:4200/auth/callback'
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        redirectUrl: process.env.GITHUB_REDIRECT_URL || 'http://localhost:4200/auth/callback'
      }
    },
    
    features: {
      enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
      enableOAuth: process.env.ENABLE_OAUTH !== 'false',
      enableDebugMode: process.env.ENABLE_DEBUG_MODE !== 'false',
      showDraftPosts: process.env.SHOW_DRAFT_POSTS !== 'false'
    },
    
    ui: {
      itemsPerPage: parseInt(process.env.ITEMS_PER_PAGE || '10'),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || (5 * 1024 * 1024).toString()),
      supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
      theme: process.env.UI_THEME || 'light'
    },
    
    cache: {
      userProfile: parseInt(process.env.CACHE_USER_PROFILE || (5 * 60 * 1000).toString()),
      blogPosts: parseInt(process.env.CACHE_BLOG_POSTS || (2 * 60 * 1000).toString()),
      categories: parseInt(process.env.CACHE_CATEGORIES || (10 * 60 * 1000).toString())
    }
  },
  
  production: {
    production: true,
    apiUrl: process.env.API_URL || 'https://api.bfmu.dev/api',
    appName: process.env.APP_NAME || 'Blog Admin Panel',
    version: process.env.APP_VERSION || '1.0.0',
    
    auth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        redirectUrl: process.env.GOOGLE_REDIRECT_URL || 'https://admin.bfmu.dev/auth/callback'
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        redirectUrl: process.env.GITHUB_REDIRECT_URL || 'https://admin.bfmu.dev/auth/callback'
      }
    },
    
    features: {
      enableRegistration: process.env.ENABLE_REGISTRATION === 'true',
      enableOAuth: process.env.ENABLE_OAUTH !== 'false',
      enableDebugMode: process.env.ENABLE_DEBUG_MODE === 'true',
      showDraftPosts: process.env.SHOW_DRAFT_POSTS === 'true'
    },
    
    ui: {
      itemsPerPage: parseInt(process.env.ITEMS_PER_PAGE || '20'),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || (10 * 1024 * 1024).toString()),
      supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
      theme: process.env.UI_THEME || 'light'
    },
    
    cache: {
      userProfile: parseInt(process.env.CACHE_USER_PROFILE || (15 * 60 * 1000).toString()),
      blogPosts: parseInt(process.env.CACHE_BLOG_POSTS || (5 * 60 * 1000).toString()),
      categories: parseInt(process.env.CACHE_CATEGORIES || (30 * 60 * 1000).toString())
    }
  },
  
  staging: {
    production: true,
    apiUrl: process.env.API_URL || 'https://api-staging.bfmu.dev/api',
    appName: process.env.APP_NAME || 'Blog Admin Panel (Staging)',
    version: process.env.APP_VERSION || '1.0.0-staging',
    
    auth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        redirectUrl: process.env.GOOGLE_REDIRECT_URL || 'https://admin-staging.bfmu.dev/auth/callback'
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        redirectUrl: process.env.GITHUB_REDIRECT_URL || 'https://admin-staging.bfmu.dev/auth/callback'
      }
    },
    
    features: {
      enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
      enableOAuth: process.env.ENABLE_OAUTH !== 'false',
      enableDebugMode: process.env.ENABLE_DEBUG_MODE !== 'false',
      showDraftPosts: process.env.SHOW_DRAFT_POSTS !== 'false'
    },
    
    ui: {
      itemsPerPage: parseInt(process.env.ITEMS_PER_PAGE || '15'),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || (8 * 1024 * 1024).toString()),
      supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
      theme: process.env.UI_THEME || 'light'
    },
    
    cache: {
      userProfile: parseInt(process.env.CACHE_USER_PROFILE || (10 * 60 * 1000).toString()),
      blogPosts: parseInt(process.env.CACHE_BLOG_POSTS || (3 * 60 * 1000).toString()),
      categories: parseInt(process.env.CACHE_CATEGORIES || (20 * 60 * 1000).toString())
    }
  }
};

function generateEnvironmentFile(env) {
  const config = environments[env] || environments.development;
  
  const content = `// Auto-generated environment configuration
// Generated at: ${new Date().toISOString()}
// Environment: ${env}
export const environment = ${JSON.stringify(config, null, 2)};
`;

  return content;
}

function main() {
  const env = process.env.NODE_ENV || 'development';
  const targetFile = process.env.ENV_FILE || `src/environments/environment.${env === 'development' ? 'ts' : env + '.ts'}`;
  
  console.log(`🔧 Configurando entorno: ${env}`);
  console.log(`📁 Archivo destino: ${targetFile}`);
  
  // Mostrar variables clave
  console.log(`🌐 API_URL: ${environments[env]?.apiUrl || 'default'}`);
  console.log(`📱 APP_NAME: ${environments[env]?.appName || 'default'}`);
  console.log(`🔑 GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '***configured***' : 'not set'}`);
  console.log(`🔑 GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID ? '***configured***' : 'not set'}`);
  
  try {
    const content = generateEnvironmentFile(env);
    
    // Asegurar que el directorio existe
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log(`✅ Archivo de entorno generado: ${targetFile}`);
    
    // Backup del archivo original si existe
    const originalFile = 'src/environments/environment.ts';
    if (env !== 'development' && fs.existsSync(originalFile)) {
      const backupFile = `${originalFile}.backup`;
      fs.copyFileSync(originalFile, backupFile);
      console.log(`📋 Backup creado: ${backupFile}`);
    }
    
  } catch (error) {
    console.error(`❌ Error generando archivo de entorno:`, error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateEnvironmentFile,
  environments
};
