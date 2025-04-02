import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string;
  private redirectUri: string;
  private scopes: string;

  constructor(private configService: ConfigService) {
    // Inicializamos las credenciales usando ConfigService para acceder a las variables de entorno
    this.clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('SPOTIFY_CLIENT_SECRET');
    this.refreshToken = this.configService.get<string>('SPOTIFY_REFRESH_TOKEN');
    this.redirectUri = this.configService.get<string>('SPOTIFY_REDIRECT');
    this.scopes =
      'user-top-read user-read-recently-played user-read-private user-read-email';

    // Refrescamos el token de acceso al iniciar el servicio
    this.refreshAccessToken();
  }

  // Método para refrescar el token de acceso
  async refreshAccessToken() {
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
        console.log('Access token refreshed successfully:', this.accessToken);
      } else {
        throw new Error('Failed to refresh access token');
      }
    } catch (error) {
      console.error('Error refreshing Spotify access token:', error);
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
  }

  // Método para obtener el perfil del usuario
  async getProfile() {
    return this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me',
    });
  }

  // Método para obtener la última canción reproducida
  async getLastPlayedTrack() {
    const data = await this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/player/recently-played?limit=1',
    });
    return data.items[0];
  }

  // Método para obtener los artistas más escuchados
  async getTopArtists() {
    return this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/top/artists?limit=8',
    });
  }

  // Método para obtener las canciones más escuchadas
  async getTopTracks() {
    const data = await this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/top/tracks',
    });
    return data.items;
  }

  // Método para obtener las playlists del usuario
  async getUserPlaylists() {
    const data = await this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/playlists?limit=5',
    });
    return data.items;
  }

  // Metodo para obtener las ultimas canciones escuchadas
  async getRecentlyPlayed() {
    const data = await this.makeRequest({
      method: 'get',
      url: 'https://api.spotify.com/v1/me/player/recently-played',
    });
    return data.items;
  }
}
