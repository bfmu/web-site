import { Module } from '@nestjs/common';
import { SpotifyModule } from './spotify/spotify.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SpotifyModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
