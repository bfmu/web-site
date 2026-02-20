import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../../settings/settings.service';

@Injectable()
export class DynamicPassportService implements OnModuleInit {
  private configCache: Map<string, any> = new Map();

  constructor(
    private settingsService: SettingsService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    // Escuchar cambios de configuración
    this.settingsService.onConfigChange((type, service) => {
      if (type === 'oauth') {
        console.log(`🔄 OAuth config changed for ${service}, clearing cache`);
        this.configCache.delete(service);
      }
    });
  }

  /**
   * Obtiene la configuración de OAuth para un provider
   * Intenta obtener de DB primero, luego hace fallback a variables de entorno
   */
  async getOAuthConfig(provider: 'google' | 'github'): Promise<any> {
    // Verificar cache primero
    if (this.configCache.has(provider)) {
      return this.configCache.get(provider);
    }

    try {
      // Intentar obtener credenciales completas de DB
      const credentials = await this.settingsService.getOAuthCredentials(provider);
      
      if (credentials && credentials.clientID) {
        console.log(`✅ Using ${provider} OAuth config from ${credentials.source}`);
        this.configCache.set(provider, credentials);
        return credentials;
      }

      // Si no hay configuración válida
      console.warn(`⚠️ No valid OAuth config found for ${provider}`);
      return null;
    } catch (error) {
      console.error(`Error loading OAuth config for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Fuerza la recarga de la configuración de un provider
   */
  async reloadConfig(provider: string): Promise<void> {
    this.configCache.delete(provider);
    await this.getOAuthConfig(provider as any);
  }

  /**
   * Verifica si un provider está configurado y habilitado
   */
  async isProviderEnabled(provider: string): Promise<boolean> {
    return await this.settingsService.isOAuthEnabled(provider);
  }
}
