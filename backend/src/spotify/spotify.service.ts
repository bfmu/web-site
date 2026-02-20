import { Injectable, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SpotifyService implements OnModuleInit {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string;
  private redirectUri: string;
  private scopes: string;
  private configLoaded: boolean = false;

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
  ) {}

  async onModuleInit() {
    await this.loadConfiguration();
    
    if (this.configLoaded && this.refreshToken) {
      await this.refreshAccessToken();
    }
    
    // Escuchar cambios de configuración
    this.settingsService.onConfigChange((type, service) => {
      if (type === 'integration' && service === 'spotify') {
        console.log('🔄 Spotify configuration changed, reloading...');
        this.reloadConfiguration();
      }
    });
  }

  private async loadConfiguration() {
    try {
      // Intentar cargar de DB primero
      const credentials = await this.settingsService.getIntegrationCredentials('spotify');
      
      if (credentials && credentials.clientId) {
        this.clientId = credentials.clientId;
        this.clientSecret = credentials.clientSecret;
        this.refreshToken = credentials.refreshToken;
        this.redirectUri = credentials.redirectUri;
        this.scopes = credentials.scopes?.join(' ') || 
          'user-top-read user-read-recently-played user-read-private user-read-email';
        this.configLoaded = true;
        console.log(`✅ Spotify config loaded from ${credentials.source}`);
        return;
      }
    } catch (error) {
      console.warn('Could not load Spotify config from database, trying environment variables');
    }
    
    // Fallback a variables de entorno
    this.clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('SPOTIFY_CLIENT_SECRET');
    this.refreshToken = this.configService.get<string>('SPOTIFY_REFRESH_TOKEN');
    this.redirectUri = this.configService.get<string>('SPOTIFY_REDIRECT_URI');
    this.scopes = 'user-top-read user-read-recently-played user-read-private user-read-email';
    
    if (this.clientId && this.clientSecret) {
      this.configLoaded = true;
      console.log('✅ Spotify config loaded from environment variables');
    } else {
      console.warn('⚠️ Spotify not configured. Configure from dashboard or add to .env');
    }
  }

  async reloadConfiguration() {
    await this.loadConfiguration();
    if (this.configLoaded && this.refreshToken) {
      await this.refreshAccessToken();
    }
  }

  // Verificar si está configurado antes de hacer requests
  private ensureConfigured() {
    if (!this.configLoaded) {
      throw new HttpException(
        'Spotify integration is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    
    if (!this.refreshToken) {
      throw new HttpException(
        'Spotify refresh token not configured. Please authorize Spotify from the admin dashboard.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Método para refrescar el token de acceso
  async refreshAccessToken() {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      console.warn('⚠️ Cannot refresh Spotify token: missing credentials');
      return;
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      if (response.status === 200) {
        this.accessToken = response.data.access_token; // Guardamos el nuevo token de acceso
        this.refreshToken = response.data.refresh_token || this.refreshToken; // Actualizamos el refresh token si se devuelve uno nuevo
      } else {
        throw new Error('Failed to refresh access token');
      }
    } catch (error: any) {
      if (error.response) {
        const spotifyError = error.response.data;
        console.error('Error refreshing Spotify access token:', {
          error: spotifyError.error,
          error_description: spotifyError.error_description,
        });
      } else {
        console.error('Error refreshing Spotify access token:', error.message);
      }
      // No lanzar error aquí para no romper el servicio si el token expiró
    }
  }

  // Método genérico para hacer solicitudes a la API de Spotify
  private async makeRequest(config: AxiosRequestConfig) {
    try {
      if (!this.accessToken) {
        await this.refreshAccessToken(); // Aseguramos que el token esté actualizado
      }

      // Añadimos el token de acceso al encabezado de la solicitud
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.accessToken}`,
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.warn('Access token expired, refreshing token...');
        await this.refreshAccessToken(); // Refresca el token si ha expirado

        // Reintenta la solicitud después de refrescar el token
        try {
          // Añadimos el token actualizado al encabezado de la solicitud
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${this.accessToken}`,
          };
          const retryResponse = await axios(config);
          return retryResponse.data;
        } catch (retryError) {
          console.error('Error retrying the request:', retryError);
          throw retryError;
        }
      } else {
        console.error('Error making request:', error);
        throw error;
      }
    }
  }

  // Método para construir la URL de autorización
  getAuthorizationUrl(): string {
    if (!this.clientId || !this.redirectUri) {
      throw new HttpException(
        'Spotify Client ID and Redirect URI must be configured before authorizing',
        HttpStatus.BAD_REQUEST,
      );
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scopes, // Scopes necesarios para las operaciones
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Método para intercambiar el código de autorización por tokens
  async exchangeCodeForTokens(code: string): Promise<any> {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new HttpException(
        'Spotify credentials not configured. Please configure Client ID, Client Secret, and Redirect URI first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // Retornamos los tokens obtenidos
      return response.data;
    } catch (error: any) {
      // Mejorar el manejo de errores de Spotify
      if (error.response) {
        const spotifyError = error.response.data;
        const errorMessage = spotifyError.error_description || spotifyError.error || 'Unknown error from Spotify';
        
        console.error('Spotify token exchange error:', {
          error: spotifyError.error,
          error_description: spotifyError.error_description,
          client_id: this.clientId ? `${this.clientId.substring(0, 10)}...` : 'NOT SET',
          redirect_uri: this.redirectUri,
        });

        throw new HttpException(
          `Spotify authorization failed: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        'Failed to exchange authorization code for tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para obtener el perfil del usuario
  async getProfile() {
    this.ensureConfigured();
    return this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me',
    });
  }

  // Método para obtener la última canción reproducida
  async getLastPlayedTrack() {
    this.ensureConfigured();
    const data = await this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/player/recently-played?limit=1',
    });
    return data.items[0];
  }

  // Método para obtener los artistas más escuchados
  async getTopArtists() {
    this.ensureConfigured();
    return this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/top/artists?limit=8',
    });
  }

  // Método para obtener las canciones más escuchadas
  async getTopTracks() {
    this.ensureConfigured();
    const data = await this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/top/tracks',
    });
    return data.items;
  }

  // Método para obtener las playlists del usuario
  async getUserPlaylists() {
    this.ensureConfigured();
    const data = await this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/playlists?limit=5',
    });
    return data.items;
  }

  // Metodo para obtener las ultimas canciones escuchadas
  async getRecentlyPlayed() {
    this.ensureConfigured();
    const data = await this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/player/recently-played',
    });
    return data.items;
  }
}
