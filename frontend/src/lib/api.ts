/**
 * Cliente API con manejo automático de autenticación
 * Incluye refresh automático de tokens y manejo de errores
 */

import { getAccessToken, getRefreshToken, clearTokens, setTokens, getUser } from './auth';

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

/**
 * Obtener URL base de la API
 */
function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:82/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

const API_BASE = `${getApiBaseUrl()}api`;

/**
 * Opciones para fetch con autenticación
 */
export interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  skipRefresh?: boolean;
}

/**
 * Clase de error personalizada para API
 */
export class ApiException extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

/**
 * Realizar petición fetch con autenticación automática
 */
export async function apiFetch(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { requireAuth = true, skipRefresh = false, ...fetchOptions } = options;

  // Construir URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE}/${endpoint.replace(/^\//, '')}`;

  // Headers por defecto
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Agregar token si es necesario
  if (requireAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Realizar petición
  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Si es 401 y requiere auth, intentar refresh
  if (response.status === 401 && requireAuth && !skipRefresh) {
    try {
      const refreshTokenValue = getRefreshToken();
      const user = getUser();

      if (refreshTokenValue && user?._id) {
        // Intentar refresh
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: refreshTokenValue,
            userId: user._id,
          }),
        });

        if (refreshResponse.ok) {
          const tokens = await refreshResponse.json();
          setTokens(tokens);

          // Reintentar petición original con nuevo token
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
          response = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        } else {
          // Refresh falló, limpiar tokens
          clearTokens();
          throw new ApiException('Sesión expirada', 401);
        }
      } else {
        clearTokens();
        throw new ApiException('No autenticado', 401);
      }
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      clearTokens();
      throw new ApiException('Error al renovar sesión', 401);
    }
  }

  return response;
}

/**
 * GET request
 */
export async function apiGet<T = any>(endpoint: string, options?: FetchOptions): Promise<T> {
  const response = await apiFetch(endpoint, { ...options, method: 'GET' });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    throw new ApiException(
      error.message || `Error ${response.status}`,
      response.status,
      error
    );
  }

  return response.json();
}

/**
 * POST request
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any,
  options?: FetchOptions
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    throw new ApiException(
      error.message || `Error ${response.status}`,
      response.status,
      error
    );
  }

  // Si la respuesta está vacía (204), retornar void
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * PATCH request
 */
export async function apiPatch<T = any>(
  endpoint: string,
  data?: any,
  options?: FetchOptions
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    throw new ApiException(
      error.message || `Error ${response.status}`,
      response.status,
      error
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * DELETE request
 */
export async function apiDelete<T = any>(endpoint: string, options?: FetchOptions): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    throw new ApiException(
      error.message || `Error ${response.status}`,
      response.status,
      error
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Upload de archivo
 */
export async function apiUpload(
  endpoint: string,
  file: File,
  options?: FetchOptions
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}/${endpoint.replace(/^\//, '')}`;

  const token = getAccessToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al subir archivo' }));
    throw new ApiException(
      error.message || `Error ${response.status}`,
      response.status,
      error
    );
  }

  return response.json();
}

