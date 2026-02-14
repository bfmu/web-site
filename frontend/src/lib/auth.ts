/**
 * Utilidades de autenticación
 * Maneja login, logout, tokens y sesión
 */

import { getBackendApiUrl } from './env';

export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'user';
  isActive: boolean;
  provider: 'local' | 'google' | 'github';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

const API_BASE = `${getBackendApiUrl()}/auth`;

/**
 * Verificar si estamos en el cliente (navegador)
 */
function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Guardar tokens en localStorage
 */
export function setTokens(tokens: AuthTokens): void {
  if (!isClient()) return;
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/**
 * Obtener access token
 */
export function getAccessToken(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Obtener refresh token
 */
export function getRefreshToken(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Limpiar tokens del localStorage
 */
export function clearTokens(): void {
  if (!isClient()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Guardar usuario en localStorage
 */
export function setUser(user: User): void {
  if (!isClient()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Obtener usuario del localStorage
 */
export function getUser(): User | null {
  if (!isClient()) return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    // Asegurar que siempre haya un avatar (por defecto si no existe)
    if (!user.avatar) {
      user.avatar = '/default-avatar.svg';
    }
    return user;
  } catch {
    return null;
  }
}

/**
 * Verificar si el usuario está autenticado
 */
export function isAuthenticated(): boolean {
  if (!isClient()) return false;
  return !!getAccessToken() && !!getUser();
}

/**
 * Verificar si el usuario es admin
 */
export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === 'admin';
}

/**
 * Verificar si el usuario es editor o admin
 */
export function isEditor(): boolean {
  const user = getUser();
  return user?.role === 'admin' || user?.role === 'editor';
}

/**
 * Registro con email, contraseña y nombre
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al registrarse' }));
    throw new Error(error.message || 'Error al registrarse');
  }

  const data: AuthResponse = await response.json();
  setTokens(data.tokens);
  setUser(data.user);
  return data;
}

/**
 * Login con email y password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al iniciar sesión' }));
    throw new Error(error.message || 'Error al iniciar sesión');
  }

  const data: AuthResponse = await response.json();
  setTokens(data.tokens);
  setUser(data.user);
  return data;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const token = getAccessToken();
  
  // Intentar hacer logout en el servidor
  if (token) {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Ignorar errores de logout en servidor
      console.warn('Error al hacer logout en servidor:', error);
    }
  }

  clearTokens();
}

/**
 * Refresh token
 */
export async function refreshToken(): Promise<AuthTokens> {
  const refreshTokenValue = getRefreshToken();
  const user = getUser();

  if (!refreshTokenValue || !user?._id) {
    clearTokens();
    throw new Error('No hay refresh token disponible');
  }

  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken: refreshTokenValue,
      userId: user._id,
    }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error('Error al renovar token');
  }

  const tokens: AuthTokens = await response.json();
  setTokens(tokens);
  return tokens;
}

/**
 * Obtener perfil del usuario
 */
export async function getProfile(): Promise<User> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No autenticado');
  }

  const response = await fetch(`${API_BASE}/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Intentar refresh token
      try {
        await refreshToken();
        // Reintentar con nuevo token
        const newToken = getAccessToken();
        if (!newToken) throw new Error('No se pudo renovar el token');
        
        const retryResponse = await fetch(`${API_BASE}/profile`, {
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
        });
        
        if (!retryResponse.ok) {
          clearTokens();
          throw new Error('Error al obtener perfil');
        }
        
        const user: User = await retryResponse.json();
        setUser(user);
        return user;
      } catch {
        clearTokens();
        throw new Error('Sesión expirada');
      }
    }
    throw new Error('Error al obtener perfil');
  }

  const user: User = await response.json();
  setUser(user);
  return user;
}

/**
 * Inicializar autenticación (verificar si hay sesión válida)
 */
export async function initializeAuth(): Promise<User | null> {
  if (!isAuthenticated()) {
    return null;
  }

  try {
    const user = await getProfile();
    return user;
  } catch (error) {
    clearTokens();
    return null;
  }
}

/**
 * Guardar URL actual como returnUrl para redirección después del login
 */
function saveReturnUrl(): void {
  if (!isClient()) return;
  
  // Obtener la URL actual sin incluir páginas de auth
  const currentUrl = window.location.pathname;
  
  // No guardar si ya estamos en páginas de auth
  if (!currentUrl.includes('/admin/login') && !currentUrl.includes('/admin/register') && !currentUrl.includes('/auth/')) {
    sessionStorage.setItem('returnUrl', currentUrl);
  }
}

/**
 * Login con Google (redirige a OAuth)
 */
export function loginWithGoogle(): void {
  saveReturnUrl();
  window.location.href = `${API_BASE}/google`;
}

/**
 * Login con GitHub (redirige a OAuth)
 */
export function loginWithGithub(): void {
  saveReturnUrl();
  window.location.href = `${API_BASE}/github`;
}

/**
 * Manejar callback de OAuth
 */
export async function handleOAuthCallback(accessToken: string, refreshToken: string): Promise<void> {
  setTokens({ accessToken, refreshToken });
  const user = await getProfile();
  setUser(user);
}

