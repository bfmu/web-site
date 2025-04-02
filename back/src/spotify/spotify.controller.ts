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
    const authUrl = this.spotifyService.getAuthorizationUrl();
    res.redirect(authUrl); // Redirige al usuario a la página de autorización de Spotify
  }

  /**
   * Callback para manejar el código de autorización y obtener tokens.
   * Endpoint: GET /api/spotify/callback
   */
  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      throw new HttpException(
        'Authorization code is missing',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const tokens = await this.spotifyService.exchangeCodeForTokens(code);
      res.json({
        message: 'Authorization successful',
        tokens,
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
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
