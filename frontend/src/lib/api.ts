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
 * En SSR (servidor), usar el nombre del servicio Docker 'backend'
 * En el cliente (navegador), usar localhost
 */
function getApiBaseUrl(): string {
  // Verificar si estamos en el navegador
  const isClient = typeof window !== 'undefined';
  
  if (!isClient) {
    // En el servidor (SSR), usar el nombre del servicio Docker
    const dockerApiUrl = import.meta.env.PUBLIC_API_URL_DOCKER || 'http://backend:3000/';
    const baseUrl = dockerApiUrl.endsWith('/') ? dockerApiUrl : `${dockerApiUrl}/`;
    return `${baseUrl}api`;
  }
  
  // En el cliente, usar la URL pública (localhost desde el navegador)
  const publicApiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/';
  const baseUrl = publicApiUrl.endsWith('/') ? publicApiUrl : `${publicApiUrl}/`;
  return `${baseUrl}api`;
}

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

  // Construir URL dinámicamente
  const apiBase = getApiBaseUrl();
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${apiBase}/${endpoint.replace(/^\//, '')}`;

  console.log(`[apiFetch] URL: ${url}, requireAuth: ${requireAuth}`);

  // Headers por defecto
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  // Agregar token si es necesario
  if (requireAuth) {
    const token = getAccessToken();
    console.log(`[apiFetch] Token exists: ${!!token}`);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Realizar petición
  console.log(`[apiFetch] Making request...`);
  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });
  console.log(`[apiFetch] Response received: ${response.status}`);

  // Si es 401 y requiere auth, intentar refresh
  if (response.status === 401 && requireAuth && !skipRefresh) {
    try {
      const refreshTokenValue = getRefreshToken();
      const user = getUser();

      if (refreshTokenValue && user?._id) {
        // Intentar refresh
        const apiBase = getApiBaseUrl();
        const refreshResponse = await fetch(`${apiBase}/auth/refresh`, {
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
          const retryHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers as Record<string, string> || {}),
            'Authorization': `Bearer ${tokens.accessToken}`,
          };
          response = await fetch(url, {
            ...fetchOptions,
            headers: retryHeaders,
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
  console.log(`[apiGet] Fetching: ${endpoint}`);
  const response = await apiFetch(endpoint, { ...options, method: 'GET' });
  console.log(`[apiGet] Response status: ${response.status}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    console.error(`[apiGet] Error:`, error);
    throw new ApiException(
      error.message || `Error ${response.status}`,
      response.status,
      error
    );
  }

  const data = await response.json();
  console.log(`[apiGet] Success:`, data);
  return data;
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
 * PUT request
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any,
  options?: FetchOptions
): Promise<T> {
  console.log(`[apiPut] Endpoint: ${endpoint}`, data);
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    console.error(`[apiPut] Error:`, error);
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

  const result = await response.json();
  console.log(`[apiPut] Success:`, result);
  return result;
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

  const apiBase = getApiBaseUrl();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${apiBase}/${endpoint.replace(/^\//, '')}`;

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  
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

