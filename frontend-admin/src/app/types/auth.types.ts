export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  role: 'admin' | 'editor' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  avatar?: string;
}
