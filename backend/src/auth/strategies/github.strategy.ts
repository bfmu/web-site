import { Injectable, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { DynamicPassportService } from '../services/dynamic-passport.service';

@Injectable()
export class GithubStrategy
  extends PassportStrategy(Strategy, 'github')
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
      callbackURL: 'http://localhost:82/api/auth/github/callback',
      scope: ['user:email'],
      passReqToCallback: false,
    });
  }

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    try {
      const config = await this.dynamicPassport.getOAuthConfig('github');

      if (config) {
        // Actualizar configuración de la strategy dinámicamente
        (this as any)._oauth2._clientId = config.clientID;
        (this as any)._oauth2._clientSecret = config.clientSecret;
        (this as any)._callbackURL = config.callbackURL;
        console.log('✅ GitHub OAuth strategy initialized with dynamic config');
      } else {
        console.warn(
          '⚠️ GitHub OAuth not configured. Login with GitHub will not work.',
        );
      }
    } catch (error) {
      console.error('Error initializing GitHub strategy:', error);
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    done(null, profile);
  }
}
