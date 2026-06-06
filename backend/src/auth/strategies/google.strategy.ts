import { Injectable, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { DynamicPassportService } from '../services/dynamic-passport.service';

@Injectable()
export class GoogleStrategy
  extends PassportStrategy(Strategy, 'google')
  implements OnModuleInit
{
  constructor(
    private configService: ConfigService,
    private dynamicPassport: DynamicPassportService,
  ) {
    // Inicializar con placeholders
    super({
      clientID: 'placeholder',
      clientSecret: 'placeholder',
      callbackURL: 'http://localhost:82/api/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    try {
      const config = await this.dynamicPassport.getOAuthConfig('google');

      if (config) {
        // Actualizar configuración de la strategy dinámicamente
        (this as any)._oauth2._clientId = config.clientID;
        (this as any)._oauth2._clientSecret = config.clientSecret;
        (this as any)._callbackURL = config.callbackURL;
        console.log('✅ Google OAuth strategy initialized with dynamic config');
      } else {
        console.warn(
          '⚠️ Google OAuth not configured. Login with Google will not work.',
        );
      }
    } catch (error) {
      console.error('Error initializing Google strategy:', error);
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    done(null, profile);
  }
}
