import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpotifyModule } from './spotify/spotify.module';
import { ConfigModule } from '@nestjs/config';
import { BlogModule } from './blog/blog.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { SettingsModule } from './settings/settings.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/blog',
    ),
    SpotifyModule,
    BlogModule,
    AuthModule,
    MediaModule,
    SettingsModule,
    BackupModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
