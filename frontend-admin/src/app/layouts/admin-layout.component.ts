import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationComponent } from '../components/notification.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-white shadow-sm border-r border-gray-200 fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0" 
             [class.translate-x-0]="sidebarOpen()" 
             [class.-translate-x-full]="!sidebarOpen()">
        
        <!-- Logo/Brand -->
        <div class="flex items-center justify-center h-16 px-4 border-b border-gray-200">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <span class="text-xl font-bold text-gray-900">Admin</span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="mt-6 px-3">
          <div class="space-y-1">
            <!-- Dashboard -->
            <a routerLink="/dashboard" 
               routerLinkActive="bg-blue-50 border-r-2 border-blue-500 text-blue-700"
               class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"></path>
              </svg>
              Dashboard
            </a>

            <!-- Posts Section -->
            <div class="pt-4">
              <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Contenido
              </h3>
              <div class="mt-2 space-y-1">
                <a routerLink="/posts" 
                   routerLinkActive="bg-blue-50 border-r-2 border-blue-500 text-blue-700"
                   class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                  <svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Todos los Posts
                </a>
                
                <a routerLink="/posts/new" 
                   routerLinkActive="bg-blue-50 border-r-2 border-blue-500 text-blue-700"
                   class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                  <svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Crear Post
                </a>
              </div>
            </div>

            <!-- Admin Section -->
            @if (isAdmin()) {
              <div class="pt-4">
                <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administración
                </h3>
                <div class="mt-2 space-y-1">
                  <a routerLink="/users" 
                     routerLinkActive="bg-blue-50 border-r-2 border-blue-500 text-blue-700"
                     class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    <svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                    </svg>
                    Usuarios
                  </a>
                </div>
              </div>
            }
          </div>
        </nav>

        <!-- User Profile -->
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div class="flex items-center space-x-3">
            <img 
              [src]="authService.user()?.avatar || getAvatarUrl(authService.user()?.name || 'User')" 
              [alt]="authService.user()?.name"
              class="h-8 w-8 rounded-full border border-gray-200"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">
                {{ authService.user()?.name }}
              </div>
              <div class="text-xs text-gray-500 truncate">
                {{ authService.user()?.role | titlecase }}
              </div>
            </div>
            <button
              (click)="logout()"
              class="text-gray-400 hover:text-gray-500 transition-colors"
              title="Cerrar sesión"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Mobile sidebar overlay -->
      @if (sidebarOpen()) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden" 
             (click)="closeSidebar()"></div>
      }

      <!-- Main content -->
      <div class="flex-1 lg:ml-0">
        <!-- Mobile header -->
        <div class="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div class="flex items-center justify-between h-16 px-4">
            <button
              (click)="toggleSidebar()"
              class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <span class="text-xl font-bold text-gray-900">Admin</span>
            <div></div>
          </div>
        </div>

        <!-- Page content -->
        <main class="flex-1">
          <router-outlet />
        </main>
      </div>
    </div>
    
    <!-- Floating Notifications -->
    <app-notifications />
  `
})
export class AdminLayoutComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  protected readonly sidebarOpen = signal(false);

  protected toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected getAvatarUrl(name: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected isAdmin(): boolean {
    return this.authService.user()?.role === 'admin';
  }
}
