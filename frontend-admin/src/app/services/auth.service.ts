import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  AuthTokens 
} from '../types/auth.types';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  private readonly API_URL = `${environment.apiUrl}/auth`;
  
  // Signals para estado moderno
  private readonly _user = signal<User | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  
  // Computed signals
  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly isEditor = computed(() => {
    const role = this._user()?.role;
    return role === 'admin' || role === 'editor';
  });

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      this.getProfile().subscribe({
        next: (user) => this._user.set(user),
        error: () => this.logout()
      });
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._error.set(null);
    
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          this.setTokens(response.tokens);
          this._user.set(response.user);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._error.set(error.error?.message || 'Error al iniciar sesión');
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._error.set(null);
    
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        tap(response => {
          this.setTokens(response.tokens);
          this._user.set(response.user);
          this._isLoading.set(false);
        }),
        catchError(error => {
          this._error.set(error.error?.message || 'Error al registrarse');
          this._isLoading.set(false);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    const token = this.getAccessToken();
    if (token) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe();
    }
    
    this.clearTokens();
    this._user.set(null);
    this._error.set(null);
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    const userId = this._user()?._id;
    
    if (!refreshToken || !userId) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    return this.http.post<AuthTokens>(`${this.API_URL}/refresh`, {
      refreshToken,
      userId
    }).pipe(
      tap(tokens => this.setTokens(tokens)),
      catchError(() => {
        this.logout();
        return throwError(() => new Error('Token refresh failed'));
      })
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/profile`);
  }

  // OAuth methods
  loginWithGoogle(): void {
    window.location.href = `${this.API_URL}/google`;
  }

  loginWithGithub(): void {
    window.location.href = `${this.API_URL}/github`;
  }

  handleOAuthCallback(token: string, refreshToken: string): void {
    this.setTokens({ accessToken: token, refreshToken });
    this.getProfile().subscribe({
      next: (user) => {
        this._user.set(user);
        this.router.navigate(['/dashboard']);
      },
      error: () => this.logout()
    });
  }

  // Token management
  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  // Utility methods
  clearError(): void {
    this._error.set(null);
  }
}
