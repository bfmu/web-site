import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SettingsService } from './settings.service';
import { UpdateOAuthProviderDto } from './dto/oauth-provider.dto';
import { UpdateApiIntegrationDto } from './dto/api-integration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ============ OAuth Providers ============

  /**
   * Lista todos los OAuth providers configurados
   * Requiere autenticación y rol admin
   */
  @Get('oauth')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listOAuthProviders() {
    try {
      return await this.settingsService.listOAuthProviders();
    } catch (error) {
      throw new HttpException(
        'Failed to list OAuth providers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene la configuración de un OAuth provider específico
   * Requiere autenticación y rol admin
   */
  @Get('oauth/:provider')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getOAuthProvider(@Param('provider') provider: string) {
    try {
      const config = await this.settingsService.getOAuthConfig(provider);
      
      if (!config) {
        throw new HttpException(
          `OAuth provider ${provider} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return config;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get OAuth provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Actualiza o crea la configuración de un OAuth provider
   * Requiere autenticación y rol admin
   */
  @Put('oauth/:provider')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateOAuthProvider(
    @Param('provider') provider: string,
    @Body() dto: UpdateOAuthProviderDto,
    @CurrentUser() user: any,
  ) {
    try {
      const validProviders = ['google', 'github'];
      if (!validProviders.includes(provider)) {
        throw new HttpException(
          `Invalid OAuth provider. Valid providers: ${validProviders.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.settingsService.updateOAuthProvider(provider, dto, user.sub);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update OAuth provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Elimina la configuración de un OAuth provider de la DB
   * Requiere autenticación y rol admin
   */
  @Delete('oauth/:provider')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteOAuthProvider(@Param('provider') provider: string) {
    try {
      await this.settingsService.deleteOAuthProvider(provider);
      return {
        message: `OAuth provider ${provider} configuration deleted. Will use environment variables if available.`,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to delete OAuth provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Inicia un flujo de test OAuth para validar la configuración
   * Requiere autenticación y rol admin
   */
  @Get('oauth/:provider/test')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async testOAuthProvider(
    @Param('provider') provider: string,
    @Res() res: Response,
  ) {
    try {
      const validProviders = ['google', 'github'];
      if (!validProviders.includes(provider)) {
        throw new HttpException(
          `Invalid OAuth provider. Valid providers: ${validProviders.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Redirigir a la ruta de auth pero en modo test
      // Usaremos un query param ?test=true para identificarlo
      const authUrl = `/api/auth/${provider}?test=true`;
      return res.redirect(authUrl);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to test OAuth provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene el estado de todos los OAuth providers
   * Endpoint público (no requiere autenticación)
   */
  @Get('oauth/public/available')
  async getOAuthProvidersStatus() {
    try {
      return await this.settingsService.getOAuthProvidersStatus();
    } catch (error) {
      throw new HttpException(
        'Failed to get OAuth providers status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============ API Integrations ============

  /**
   * Lista todas las integraciones de API configuradas
   * Requiere autenticación y rol admin
   */
  @Get('integrations')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listIntegrations() {
    try {
      return await this.settingsService.listIntegrations();
    } catch (error) {
      throw new HttpException(
        'Failed to list integrations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene la configuración de una integración específica
   * Requiere autenticación y rol admin
   */
  @Get('integrations/:service')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getIntegration(@Param('service') service: string) {
    try {
      const config = await this.settingsService.getIntegrationConfig(service);
      
      if (!config) {
        throw new HttpException(
          `Integration ${service} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return config;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get integration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Actualiza o crea la configuración de una integración
   * Requiere autenticación y rol admin
   */
  @Put('integrations/:service')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateIntegration(
    @Param('service') service: string,
    @Body() dto: UpdateApiIntegrationDto,
    @CurrentUser() user: any,
  ) {
    try {
      const validServices = ['spotify'];
      if (!validServices.includes(service)) {
        throw new HttpException(
          `Invalid service. Valid services: ${validServices.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.settingsService.updateIntegration(service, dto, user.sub);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to update integration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Elimina la configuración de una integración de la DB
   * Requiere autenticación y rol admin
   */
  @Delete('integrations/:service')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteIntegration(@Param('service') service: string) {
    try {
      await this.settingsService.deleteIntegration(service);
      return {
        message: `Integration ${service} configuration deleted. Will use environment variables if available.`,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to delete integration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene el estado de todas las integraciones
   * Endpoint público (no requiere autenticación)
   */
  @Get('integrations/public/available')
  async getIntegrationsStatus() {
    try {
      return await this.settingsService.getIntegrationsStatus();
    } catch (error) {
      throw new HttpException(
        'Failed to get integrations status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
