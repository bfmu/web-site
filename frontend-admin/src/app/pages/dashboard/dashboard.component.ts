import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          ¡Bienvenido, {{ authService.user()?.name }}!
        </h1>
        <p class="text-gray-600 text-lg">
          Administra tu blog desde aquí. Aquí tienes un resumen de tu actividad reciente.
        </p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <!-- Total Posts -->
        <div class="card-elevated p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-blue-600 mb-1">Total Posts</p>
              <p class="text-3xl font-bold text-blue-900">{{ totalPosts() }}</p>
            </div>
            <div class="p-3 bg-blue-500 rounded-xl">
              <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Published Posts -->
        <div class="card-elevated p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-green-600 mb-1">Publicados</p>
              <p class="text-3xl font-bold text-green-900">{{ publishedPosts() }}</p>
            </div>
            <div class="p-3 bg-green-500 rounded-xl">
              <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Draft Posts -->
        <div class="card-elevated p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-yellow-600 mb-1">Borradores</p>
              <p class="text-3xl font-bold text-yellow-900">{{ draftPosts() }}</p>
            </div>
            <div class="p-3 bg-yellow-500 rounded-xl">
              <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Views -->
        <div class="card-elevated p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-purple-600 mb-1">Total Vistas</p>
              <p class="text-3xl font-bold text-purple-900">{{ totalViews() }}</p>
            </div>
            <div class="p-3 bg-purple-500 rounded-xl">
              <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Quick Actions -->
        <div class="lg:col-span-1">
          <div class="card p-6">
            <div class="flex items-center mb-4">
              <div class="p-2 bg-blue-100 rounded-lg mr-3">
                <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">Acciones Rápidas</h3>
            </div>
            
            <div class="space-y-3">
              <a 
                routerLink="/posts/new"
                class="btn-primary w-full justify-center"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Crear Nuevo Post
              </a>
              
              <a 
                routerLink="/posts"
                class="btn-outline w-full justify-center"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                Gestionar Posts
              </a>

              @if (isAdmin()) {
                <a 
                  routerLink="/users"
                  class="btn-secondary w-full justify-center"
                >
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                  Gestionar Usuarios
                </a>
              }
            </div>
          </div>
        </div>

        <!-- Recent Posts -->
        <div class="lg:col-span-2">
          <div class="card p-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center">
                <div class="p-2 bg-green-100 rounded-lg mr-3">
                  <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">Posts Recientes</h3>
              </div>
              <a routerLink="/posts" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver todos →</a>
            </div>
            
            @if (recentPosts().length > 0) {
              <div class="space-y-4">
                @for (post of recentPosts(); track post._id) {
                  <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div class="flex-1 min-w-0">
                      <h4 class="text-sm font-semibold text-gray-900 truncate mb-1">
                        {{ post.title }}
                      </h4>
                      <p class="text-xs text-gray-500 mb-2">
                        {{ formatDate(post.published) }}
                      </p>
                      @if (post.description) {
                        <p class="text-xs text-gray-600 truncate">
                          {{ post.description }}
                        </p>
                      }
                    </div>
                    <div class="flex items-center space-x-2 ml-4">
                      <span 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class]="post.draft 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'"
                      >
                        {{ post.draft ? 'Borrador' : 'Publicado' }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="text-center py-12">
                <div class="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 class="text-sm font-medium text-gray-900 mb-1">No hay posts aún</h3>
                <p class="text-sm text-gray-500 mb-4">Comienza creando tu primer post para ver la actividad aquí.</p>
                <a routerLink="/posts/new" class="btn-primary">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Crear tu primer post
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly blogService = inject(BlogService);
  private readonly router = inject(Router);

  protected readonly recentPosts = signal<any[]>([]);
  protected readonly totalPosts = signal(0);
  protected readonly publishedPosts = signal(0);
  protected readonly draftPosts = signal(0);
  protected readonly totalViews = signal(0);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // Cargar posts recientes
    this.blogService.getRecentPosts(5).subscribe({
      next: (posts) => {
        this.recentPosts.set(posts);
      },
      error: (error) => console.error('Error loading recent posts:', error)
    });

    // Cargar estadísticas
    this.blogService.getPosts({ draft: true, limit: 1000 }).subscribe({
      next: (response) => {
        const posts = response.posts;
        this.totalPosts.set(posts.length);
        this.publishedPosts.set(posts.filter(p => !p.draft).length);
        this.draftPosts.set(posts.filter(p => p.draft).length);
        this.totalViews.set(posts.reduce((sum, p) => sum + (p.views || 0), 0));
      },
      error: (error) => console.error('Error loading stats:', error)
    });
  }

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  protected getAvatarUrl(name: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  protected isAdmin(): boolean {
    return this.authService.user()?.role === 'admin';
  }
}
