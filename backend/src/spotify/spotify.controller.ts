import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { Response } from 'express';

@Controller('spotify') // Todas las rutas de este controlador estarán prefijadas con "api/spotify"
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  /**
   * Redirige al usuario a la URL de autorización de Spotify.
   * Endpoint: GET /api/spotify/login
   */
  @Get('login')
  login(@Res() res: Response) {
    try {
      const authUrl = this.spotifyService.getAuthorizationUrl();
      res.redirect(authUrl); // Redirige al usuario a la página de autorización de Spotify
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to generate Spotify authorization URL',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Callback para manejar el código de autorización y obtener tokens.
   * Endpoint: GET /api/spotify/callback
   */
  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Spotify Authorization Error</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
              .container { text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #e74c3c; font-size: 24px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Error</div>
              <p>Authorization code is missing</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'spotify-auth-error', error: 'No authorization code' }, '*');
              }
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    }

    try {
      // Recargar configuración antes de intercambiar tokens (por si acaso cambió)
      await this.spotifyService.reloadConfiguration();
      
      const tokens = await this.spotifyService.exchangeCodeForTokens(code);
      
      console.log('✅ Tokens received from Spotify, sending to frontend...');
      
      // Enviar tokens al opener y cerrar ventana
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Spotify Authorization Success</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1DB954; }
              .container { text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .success { color: #1DB954; font-size: 48px; margin-bottom: 10px; }
              h2 { color: #333; margin: 10px 0; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">✅</div>
              <h2>Autorización exitosa</h2>
              <p>Puedes cerrar esta ventana</p>
            </div>
            <script>
              console.log('📤 Sending message to opener window...');
              if (window.opener) {
                window.opener.postMessage({
                  type: 'spotify-auth-success',
                  accessToken: '${tokens.access_token}',
                  refreshToken: '${tokens.refresh_token}',
                  expiresIn: ${tokens.expires_in || 3600}
                }, '*');
                console.log('✅ Message sent!');
              } else {
                console.error('❌ No opener window found!');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Spotify Authorization Error</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
              .container { text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #e74c3c; font-size: 48px; margin-bottom: 10px; }
              h2 { color: #333; margin: 10px 0; }
              p { color: #666; }
              .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px; font-size: 14px; color: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌</div>
              <h2>Error en la autorización</h2>
              <p>No se pudieron obtener los tokens de Spotify</p>
              <div class="details">${error.message}</div>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'spotify-auth-error', 
                  error: '${error.message}' 
                }, '*');
              }
              setTimeout(() => window.close(), 5000);
            </script>
          </body>
        </html>
      `);
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado.
   * Endpoint: GET /api/spotify/me
   */
  @Get('me')
  async getProfile() {
    try {
      const profile = await this.spotifyService.getProfile();
      return profile || 'No profile found';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtiene la última canción reproducida por el usuario.
   * Endpoint: GET /api/spotify/last-played
   */
  @Get('last-played')
  async getLastPlayedTrack() {
    try {
      const lastPlayed = await this.spotifyService.getLastPlayedTrack();
      return lastPlayed ? lastPlayed.track : 'No track found';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtiene los artistas más escuchados.
   * Endpoint: GET /api/spotify/top-artists
   */
  @Get('top-artists')
  async getTopArtists() {
    try {
      const topArtists = await this.spotifyService.getTopArtists();
      return topArtists || 'No artists found';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtiene las canciones más escuchadas.
   * Endpoint: GET /api/spotify/top-tracks
   */
  @Get('top-tracks')
  async getTopTracks() {
    try {
      const topTracks = await this.spotifyService.getTopTracks();
      return topTracks || 'No tracks found';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtiene las playlists del usuario autenticado.
   * Endpoint: GET /api/spotify/playlists
   */
  @Get('playlists')
  async getUserPlaylists() {
    try {
      const playlists = await this.spotifyService.getUserPlaylists();
      return playlists || 'No playlists found';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtiene las ultimas canciones escuchadas
   * Endpoint: GET /api/spotify/recently-played
   */
  @Get('recently-played')
  async getRecentlyPlayed() {
    try {
      const recentlyPlayed = await this.spotifyService.getRecentlyPlayed();
      return recentlyPlayed || 'No recently played tracks found';
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
