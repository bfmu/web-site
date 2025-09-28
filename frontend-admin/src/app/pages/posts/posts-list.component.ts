import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';
import { DataTableComponent } from '../../components/data-table.component';
import { BlogPost } from '../../types/blog.types';
import { ColumnDef } from '@tanstack/angular-table';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DataTableComponent],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Gestión de Posts</h1>
            <p class="text-gray-600 text-lg">
              Administra todos los posts de tu blog desde aquí
            </p>
          </div>
          
          <a 
            routerLink="/posts/new"
            class="btn-primary"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Nuevo Post
          </a>
        </div>
      </div>

      <!-- Filters -->
      <div class="mb-6">
        <div class="card p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"></path>
                </svg>
                <label class="text-sm font-medium text-gray-700">Filtrar por estado:</label>
                <select 
                  class="select text-sm"
                  (change)="onFilterChange($event)"
                >
                  <option value="all">Todos los posts</option>
                  <option value="published">Solo publicados</option>
                  <option value="draft">Solo borradores</option>
                </select>
              </div>
            </div>
            
            <div class="flex items-center space-x-2 text-sm text-gray-500">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              {{ posts().length }} posts encontrados
            </div>
          </div>
        </div>
      </div>

      <!-- Posts Content -->
      @if (blogService.isLoading()) {
        <div class="card p-12">
          <div class="flex flex-col items-center justify-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p class="text-gray-600 text-lg">Cargando posts...</p>
            <p class="text-gray-500 text-sm mt-1">Esto puede tomar unos segundos</p>
          </div>
        </div>
      } @else if (posts().length === 0) {
        <div class="card p-12">
          <div class="text-center">
            <div class="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <svg class="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No hay posts disponibles</h3>
            <p class="text-gray-600 mb-6">Comienza creando tu primer post para ver contenido aquí.</p>
            <a routerLink="/posts/new" class="btn-primary">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Crear tu primer post
            </a>
          </div>
        </div>
      } @else {
        <div class="card overflow-hidden">
          <app-data-table
            [data]="posts()"
            [columns]="columns"
            (onEdit)="editPost($event)"
            (onDelete)="deletePost($event)"
          />
        </div>
      }
    </div>
  `
})
export class PostsListComponent implements OnInit {
  protected readonly blogService = inject(BlogService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  protected readonly posts = signal<BlogPost[]>([]);

  protected readonly columns: ColumnDef<BlogPost>[] = [
    {
      header: 'Título',
      accessorKey: 'title',
      cell: (info: any) => {
        const post = info.row.original;
        return `<div class="max-w-xs">
          <div class="font-medium text-gray-900 truncate">${post.title}</div>
          <div class="text-sm text-gray-500 truncate">${post.description || 'Sin descripción'}</div>
        </div>`;
      }
    },
    {
      header: 'Estado',
      accessorKey: 'draft',
      cell: (info: any) => {
        const post = info.row.original;
        const isDraft = info.getValue();
        return `<div class="flex items-center space-x-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isDraft 
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-green-100 text-green-800'
          }">
            ${isDraft ? 'Borrador' : 'Publicado'}
          </span>
          <button 
            onclick="window.togglePostStatus('${post.slug}', ${!isDraft})"
            class="text-xs px-2 py-1 rounded transition-colors ${
              isDraft 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }"
            title="${isDraft ? 'Publicar post' : 'Mover a borrador'}"
          >
            ${isDraft ? '📤 Publicar' : '📝 A borrador'}
          </button>
        </div>`;
      }
    },
    {
      header: 'Categoría',
      accessorKey: 'category',
      cell: (info: any) => info.getValue() || 'Sin categoría'
    },
    {
      header: 'Fecha',
      accessorKey: 'published',
      cell: (info: any) => {
        const date = new Date(info.getValue());
        return date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    {
      header: 'Vistas',
      accessorKey: 'views',
      cell: (info: any) => (info.getValue() || 0).toLocaleString()
    }
  ];

  ngOnInit(): void {
    this.loadPosts();
    this.setupGlobalToggleFunction();
  }

  private loadPosts(): void {
    this.blogService.getPosts({ draft: true }).subscribe({
      next: (response) => {
        this.posts.set(response.posts);
      },
      error: (error) => {
        console.error('Error loading posts:', error);
      }
    });
  }

  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const filter = target.value;
    
    let queryParams: any = {};
    
    if (filter === 'published') {
      queryParams.draft = false;
    } else if (filter === 'draft') {
      queryParams.draft = true;
    } else {
      queryParams.draft = true; // Show all including drafts
    }

    this.blogService.getPosts(queryParams).subscribe({
      next: (response) => {
        this.posts.set(response.posts);
      },
      error: (error) => {
        console.error('Error filtering posts:', error);
      }
    });
  }

  editPost(post: BlogPost): void {
    // Navigate to edit using Angular router
    this.router.navigate(['/posts/edit', post.slug]);
  }

  deletePost(post: BlogPost): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el post "${post.title}"?`)) {
      this.blogService.deletePost(post.slug).subscribe({
        next: () => {
          // Remove from local state
          const currentPosts = this.posts();
          this.posts.set(currentPosts.filter(p => p._id !== post._id));
          this.notificationService.success('Post eliminado', `"${post.title}" ha sido eliminado correctamente`);
        },
        error: (error) => {
          console.error('Error deleting post:', error);
          this.notificationService.error('Error al eliminar', 'No se pudo eliminar el post');
        }
      });
    }
  }

  protected setupGlobalToggleFunction(): void {
    // Configurar función global para el toggle de estado
    (window as any).togglePostStatus = (slug: string, publish: boolean) => {
      this.togglePostStatus(slug, publish);
    };
  }

  private togglePostStatus(slug: string, publish: boolean): void {
    const post = this.posts().find(p => p.slug === slug);
    if (!post) return;

    const updateData = {
      draft: !publish,
      title: post.title,
      content: post.content,
      description: post.description,
      category: post.category,
      language: post.language,
      image: post.image,
      tags: post.tags,
      published: new Date().toISOString()
    };

    this.blogService.updatePost(slug, updateData).subscribe({
      next: () => {
        this.notificationService.success(
          'Estado actualizado',
          `El post "${post.title}" ahora está ${publish ? 'publicado' : 'en borrador'}`
        );
        this.loadPosts(); // Recargar la lista
      },
      error: (error) => {
        console.error('Error updating post status:', error);
        this.notificationService.error(
          'Error al actualizar',
          'No se pudo cambiar el estado del post'
        );
      }
    });
  }
}