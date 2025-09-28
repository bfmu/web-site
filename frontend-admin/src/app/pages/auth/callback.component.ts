import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full text-center">
        <div class="card p-8">
          @if (isProcessing) {
            <div class="animate-spin mx-auto h-12 w-12 text-primary-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              Procesando autenticación...
            </h2>
            <p class="text-gray-600">
              Por favor espera mientras completamos tu inicio de sesión.
            </p>
          } @else if (hasError) {
            <div class="text-red-600 mb-4">
              <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              Error de autenticación
            </h2>
            <p class="text-gray-600 mb-6">
              Hubo un problema al procesar tu autenticación. Por favor intenta nuevamente.
            </p>
            <a 
              href="/auth/login" 
              class="btn-primary inline-flex items-center">
              Volver al login
            </a>
          } @else {
            <div class="text-green-600 mb-4">
              <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              ¡Autenticación exitosa!
            </h2>
            <p class="text-gray-600">
              Redirigiendo al dashboard...
            </p>
          }
        </div>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  protected isProcessing = true;
  protected hasError = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const refreshToken = params['refresh'];

      if (token && refreshToken) {
        try {
          this.authService.handleOAuthCallback(token, refreshToken);
          this.isProcessing = false;
        } catch (error) {
          this.isProcessing = false;
          this.hasError = true;
        }
      } else {
        this.isProcessing = false;
        this.hasError = true;
      }
    });
  }
}
