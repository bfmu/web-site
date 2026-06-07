import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import {
  OAuthProvider,
  OAuthProviderDocument,
} from './schemas/oauth-provider.schema';
import {
  ApiIntegration,
  ApiIntegrationDocument,
} from './schemas/api-integration.schema';
import {
  UpdateOAuthProviderDto,
  OAuthProviderResponseDto,
} from './dto/oauth-provider.dto';
import {
  UpdateApiIntegrationDto,
  ApiIntegrationResponseDto,
} from './dto/api-integration.dto';
import { EncryptionService } from './encryption.service';

@Injectable()
export class SettingsService {
  private eventEmitter = new EventEmitter();

  constructor(
    @InjectModel(OAuthProvider.name)
    private oauthProviderModel: Model<OAuthProviderDocument>,
    @InjectModel(ApiIntegration.name)
    private apiIntegrationModel: Model<ApiIntegrationDocument>,
    private encryptionService: EncryptionService,
    private configService: ConfigService,
  ) {}

  // ============ OAuth Providers ============

  /**
   * Obtiene la configuración de un OAuth provider
   * Si existe en DB, la usa; si no, intenta leer de variables de entorno
   */
  async getOAuthConfig(
    provider: string,
  ): Promise<OAuthProviderResponseDto | null> {
    try {
      const config = await this.oauthProviderModel.findOne({ provider });

      if (config) {
        return {
          provider: config.provider,
          clientId: config.clientId,
          callbackUrl: config.callbackUrl,
          enabled: config.enabled,
          source: 'database',
          hasClientSecret: !!(
            config.clientSecret && config.clientSecret.length > 0
          ),
          updatedAt: config.updatedAt,
          createdAt: config.createdAt,
        };
      }

      // Fallback a variables de entorno
      return this.getOAuthConfigFromEnv(provider);
    } catch (error) {
      console.error(`Error getting OAuth config for ${provider}:`, error);
      return this.getOAuthConfigFromEnv(provider);
    }
  }

  /**
   * Obtiene las credenciales completas de un OAuth provider (incluyendo secrets)
   * Solo para uso interno
   */
  async getOAuthCredentials(provider: string): Promise<any> {
    try {
      const config = await this.oauthProviderModel.findOne({ provider });

      if (config && config.enabled) {
        return {
          clientID: config.clientId,
          clientSecret: this.encryptionService.decrypt(config.clientSecret),
          callbackURL: config.callbackUrl,
          source: 'database',
        };
      }

      // Fallback a variables de entorno
      const envPrefix = provider.toUpperCase();
      const clientId = this.configService.get(`${envPrefix}_CLIENT_ID`);

      if (clientId) {
        return {
          clientID: clientId,
          clientSecret: this.configService.get(`${envPrefix}_CLIENT_SECRET`),
          callbackURL: this.configService.get(`${envPrefix}_CALLBACK_URL`),
          source: 'environment',
        };
      }

      return null;
    } catch (error) {
      console.error(`Error getting OAuth credentials for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Lista todos los OAuth providers configurados
   */
  async listOAuthProviders(): Promise<OAuthProviderResponseDto[]> {
    const configs = await this.oauthProviderModel.find();

    return configs.map((config) => ({
      provider: config.provider,
      clientId: config.clientId,
      callbackUrl: config.callbackUrl,
      enabled: config.enabled,
      source: 'database',
      hasClientSecret: !!(
        config.clientSecret && config.clientSecret.length > 0
      ),
      updatedAt: config.updatedAt,
      createdAt: config.createdAt,
    }));
  }

  /**
   * Actualiza o crea la configuración de un OAuth provider
   */
  async updateOAuthProvider(
    provider: string,
    dto: UpdateOAuthProviderDto,
    userId: string,
  ): Promise<OAuthProviderResponseDto> {
    const updateData: any = { ...dto, updatedBy: userId };

    // Encriptar el secret si se proporciona
    if (dto.clientSecret) {
      updateData.clientSecret = this.encryptionService.encrypt(
        dto.clientSecret,
      );
    }

    const config = await this.oauthProviderModel.findOneAndUpdate(
      { provider },
      { $set: updateData },
      { new: true, upsert: true },
    );

    // Emitir evento de cambio de configuración
    this.eventEmitter.emit('config-change', 'oauth', provider);

    return {
      provider: config.provider,
      clientId: config.clientId,
      callbackUrl: config.callbackUrl,
      enabled: config.enabled,
      source: 'database',
      hasClientSecret: !!(
        config.clientSecret && config.clientSecret.length > 0
      ),
      updatedAt: config.updatedAt,
      createdAt: config.createdAt,
    };
  }

  /**
   * Elimina la configuración de un OAuth provider de la DB
   */
  async deleteOAuthProvider(provider: string): Promise<void> {
    await this.oauthProviderModel.deleteOne({ provider });
    this.eventEmitter.emit('config-change', 'oauth', provider);
  }

  /**
   * Verifica si un OAuth provider está habilitado
   */
  async isOAuthEnabled(provider: string): Promise<boolean> {
    const config = await this.oauthProviderModel.findOne({ provider });

    if (config) {
      return config.enabled;
    }

    // Si no está en DB, verificar si existe en variables de entorno
    const envPrefix = provider.toUpperCase();
    const clientId = this.configService.get(`${envPrefix}_CLIENT_ID`);
    return !!clientId;
  }

  /**
   * Obtiene el estado de todos los OAuth providers (para uso público)
   */
  async getOAuthProvidersStatus(): Promise<Record<string, boolean>> {
    const providers = ['google', 'github'];
    const status: Record<string, boolean> = {};

    for (const provider of providers) {
      status[provider] = await this.isOAuthEnabled(provider);
    }

    return status;
  }

  // ============ API Integrations ============

  /**
   * Obtiene la configuración de una integración de API
   */
  async getIntegrationConfig(
    service: string,
  ): Promise<ApiIntegrationResponseDto | null> {
    try {
      const config = await this.apiIntegrationModel.findOne({ service });

      if (config) {
        return {
          service: config.service,
          clientId: config.clientId,
          redirectUri: config.redirectUri,
          scopes: config.scopes,
          enabled: config.enabled,
          lastTokenRefresh: config.lastTokenRefresh,
          tokenStatus: config.tokenStatus,
          source: 'database',
          updatedAt: config.updatedAt,
          createdAt: config.createdAt,
        };
      }

      // Fallback a variables de entorno
      return this.getIntegrationConfigFromEnv(service);
    } catch (error) {
      console.error(`Error getting integration config for ${service}:`, error);
      return this.getIntegrationConfigFromEnv(service);
    }
  }

  /**
   * Obtiene las credenciales completas de una integración (incluyendo secrets)
   * Solo para uso interno
   */
  async getIntegrationCredentials(service: string): Promise<any> {
    try {
      const config = await this.apiIntegrationModel.findOne({ service });

      if (config && config.enabled) {
        return {
          clientId: config.clientId,
          clientSecret: this.encryptionService.decrypt(config.clientSecret),
          refreshToken: config.refreshToken
            ? this.encryptionService.decrypt(config.refreshToken)
            : null,
          redirectUri: config.redirectUri,
          scopes: config.scopes,
          source: 'database',
        };
      }

      // Fallback a variables de entorno
      const envPrefix = service.toUpperCase();
      const clientId = this.configService.get(`${envPrefix}_CLIENT_ID`);

      if (clientId) {
        return {
          clientId,
          clientSecret: this.configService.get(`${envPrefix}_CLIENT_SECRET`),
          refreshToken: this.configService.get(`${envPrefix}_REFRESH_TOKEN`),
          redirectUri: this.configService.get(`${envPrefix}_REDIRECT_URI`),
          scopes: [],
          source: 'environment',
        };
      }

      return null;
    } catch (error) {
      console.error(
        `Error getting integration credentials for ${service}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Lista todas las integraciones configuradas
   */
  async listIntegrations(): Promise<ApiIntegrationResponseDto[]> {
    const configs = await this.apiIntegrationModel.find();

    return configs.map((config) => ({
      service: config.service,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      enabled: config.enabled,
      lastTokenRefresh: config.lastTokenRefresh,
      tokenStatus: config.tokenStatus,
      source: 'database',
      updatedAt: config.updatedAt,
      createdAt: config.createdAt,
    }));
  }

  /**
   * Actualiza o crea la configuración de una integración
   */
  async updateIntegration(
    service: string,
    dto: UpdateApiIntegrationDto,
    userId: string,
  ): Promise<ApiIntegrationResponseDto> {
    const updateData: any = { ...dto, updatedBy: userId };

    // Encriptar secrets si se proporcionan
    if (dto.clientSecret) {
      updateData.clientSecret = this.encryptionService.encrypt(
        dto.clientSecret,
      );
    }
    if (dto.refreshToken) {
      updateData.refreshToken = this.encryptionService.encrypt(
        dto.refreshToken,
      );
      // Actualizar fecha y estado del token cuando se guarda un nuevo refresh token
      updateData.lastTokenRefresh = new Date();
      updateData.tokenStatus = 'valid';
      console.log('✅ Refresh token updated and marked as valid');
    }

    const config = await this.apiIntegrationModel.findOneAndUpdate(
      { service },
      { $set: updateData },
      { new: true, upsert: true },
    );

    // Emitir evento de cambio de configuración
    this.eventEmitter.emit('config-change', 'integration', service);

    return {
      service: config.service,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      enabled: config.enabled,
      lastTokenRefresh: config.lastTokenRefresh,
      tokenStatus: config.tokenStatus,
      source: 'database',
      updatedAt: config.updatedAt,
      createdAt: config.createdAt,
    };
  }

  /**
   * Actualiza el estado del token de una integración
   */
  async updateTokenStatus(
    service: string,
    status: 'valid' | 'expired' | 'invalid',
  ): Promise<void> {
    await this.apiIntegrationModel.findOneAndUpdate(
      { service },
      {
        $set: {
          tokenStatus: status,
          lastTokenRefresh: new Date(),
        },
      },
    );
  }

  /**
   * Elimina la configuración de una integración de la DB
   */
  async deleteIntegration(service: string): Promise<void> {
    await this.apiIntegrationModel.deleteOne({ service });
    this.eventEmitter.emit('config-change', 'integration', service);
  }

  /**
   * Verifica si una integración está habilitada
   */
  async isIntegrationEnabled(service: string): Promise<boolean> {
    const config = await this.apiIntegrationModel.findOne({ service });

    if (config) {
      return config.enabled;
    }

    // Si no está en DB, verificar si existe en variables de entorno
    const envPrefix = service.toUpperCase();
    const clientId = this.configService.get(`${envPrefix}_CLIENT_ID`);
    return !!clientId;
  }

  /**
   * Obtiene el estado de todas las integraciones (para uso público)
   */
  async getIntegrationsStatus(): Promise<Record<string, boolean>> {
    const services = ['spotify'];
    const status: Record<string, boolean> = {};

    for (const service of services) {
      status[service] = await this.isIntegrationEnabled(service);
    }

    return status;
  }

  // ============ Eventos ============

  /**
   * Registra un listener para cambios de configuración
   */
  onConfigChange(callback: (type: string, service: string) => void): void {
    this.eventEmitter.on('config-change', callback);
  }

  /**
   * Remueve un listener de cambios de configuración
   */
  offConfigChange(callback: (type: string, service: string) => void): void {
    this.eventEmitter.off('config-change', callback);
  }

  // ============ Helpers privados ============

  private getOAuthConfigFromEnv(
    provider: string,
  ): OAuthProviderResponseDto | null {
    const envPrefix = provider.toUpperCase();
    const clientId = this.configService.get(`${envPrefix}_CLIENT_ID`);

    if (!clientId) {
      return null;
    }

    const clientSecret = this.configService.get(`${envPrefix}_CLIENT_SECRET`);

    return {
      provider,
      clientId,
      callbackUrl: this.configService.get(`${envPrefix}_CALLBACK_URL`),
      enabled: true,
      source: 'environment',
      hasClientSecret: !!(clientSecret && clientSecret.length > 0),
    };
  }

  private getIntegrationConfigFromEnv(
    service: string,
  ): ApiIntegrationResponseDto | null {
    const envPrefix = service.toUpperCase();
    const clientId = this.configService.get(`${envPrefix}_CLIENT_ID`);

    if (!clientId) {
      return null;
    }

    return {
      service,
      clientId,
      redirectUri: this.configService.get(`${envPrefix}_REDIRECT_URI`),
      scopes: [],
      enabled: true,
      tokenStatus: 'valid',
      source: 'environment',
    };
  }
}
