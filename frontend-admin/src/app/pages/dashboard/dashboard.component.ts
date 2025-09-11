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
    <div class="min-h-screen bg-gray-50">
      <!-- Navigation -->
      <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <h1 class="text-xl font-semibold text-gray-900">
                Admin Panel
              </h1>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-3">
                <img 
                  [src]="authService.user()?.avatar || getAvatarUrl(authService.user()?.name || 'User')" 
                  [alt]="authService.user()?.name"
                  class="h-8 w-8 rounded-full"
                />
                <div class="hidden md:block">
                  <div class="text-sm font-medium text-gray-900">
                    {{ authService.user()?.name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ authService.user()?.role | titlecase }}
                  </div>
                </div>
              </div>
              
              <button
                (click)="logout()"
                class="btn-outline text-sm"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <!-- Welcome Section -->
        <div class="px-4 py-6 sm:px-0">
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900">
              ¡Bienvenido, {{ authService.user()?.name }}!
            </h2>
            <p class="mt-1 text-sm text-gray-600">
              Administra tu blog desde aquí
            </p>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <!-- Total Posts -->
            <div class="card p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Total Posts
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ totalPosts() }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Published Posts -->
            <div class="card p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Publicados
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ publishedPosts() }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Draft Posts -->
            <div class="card p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Borradores
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ draftPosts() }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Views -->
            <div class="card p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Total Vistas
                    </dt>
                    <dd class="text-lg font-medium text-gray-900">
                      {{ totalViews() }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Quick Actions Card -->
            <div class="card p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Acciones Rápidas
              </h3>
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
                  Ver Todos los Posts
                </a>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="card p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Acciones Rápidas
              </h3>
              <div class="space-y-3">
                <button 
                  (click)="navigateTo('/posts')"
                  class="w-full flex items-center p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <div class="w-5 h-5 text-blue-500 mr-3 flex items-center justify-center">📝</div>
                  <span class="text-sm font-medium text-blue-900">Gestionar Posts</span>
                </button>
                
                @if (isAdmin()) {
                  <button 
                    (click)="navigateTo('/users')"
                    class="w-full flex items-center p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <div class="w-5 h-5 text-purple-500 mr-3 flex items-center justify-center">👥</div>
                    <span class="text-sm font-medium text-purple-900">Gestionar Usuarios</span>
                  </button>
                }
              </div>
            </div>

            <!-- Recent Posts -->
            <div class="card p-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">
                Posts Recientes
              </h3>
              @if (recentPosts().length > 0) {
                <div class="space-y-3">
                  @for (post of recentPosts(); track post._id) {
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div class="flex-1">
                        <h4 class="text-sm font-medium text-gray-900 truncate">
                          {{ post.title }}
                        </h4>
                        <p class="text-xs text-gray-500">
                          {{ formatDate(post.published) }}
                        </p>
                      </div>
                      <div class="flex items-center space-x-2">
                        <span 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          [class.bg-green-100]="!post.draft"
                          [class.text-green-800]="!post.draft"
                          [class.bg-yellow-100]="post.draft"
                          [class.text-yellow-800]="post.draft"
                        >
                          {{ post.draft ? 'Borrador' : 'Publicado' }}
                        </span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-6">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900">No hay posts</h3>
                  <p class="mt-1 text-sm text-gray-500">Comienza creando tu primer post.</p>
                </div>
              }
            </div>
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
