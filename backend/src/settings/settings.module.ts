import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { EncryptionService } from './encryption.service';
import {
  OAuthProvider,
  OAuthProviderSchema,
} from './schemas/oauth-provider.schema';
import {
  ApiIntegration,
  ApiIntegrationSchema,
} from './schemas/api-integration.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: OAuthProvider.name, schema: OAuthProviderSchema },
      { name: ApiIntegration.name, schema: ApiIntegrationSchema },
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService, EncryptionService],
  exports: [SettingsService, EncryptionService],
})
export class SettingsModule {}
