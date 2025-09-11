import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';
import { DataTableComponent } from '../../components/data-table.component';
import { BlogPost } from '../../types/blog.types';
import { ColumnDef } from '@tanstack/angular-table';

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DataTableComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Navigation -->
      <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center space-x-8">
              <a routerLink="/dashboard" class="text-sm text-gray-500 hover:text-gray-700">
                ← Dashboard
              </a>
              <h1 class="text-xl font-semibold text-gray-900">
                Gestión de Posts
              </h1>
            </div>
            
            <div class="flex items-center space-x-4">
              <a 
                routerLink="/posts/new"
                class="btn-primary"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Nuevo Post
              </a>
              
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
        <div class="px-4 py-6 sm:px-0">
          <!-- Header -->
          <div class="mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Posts</h2>
                <p class="mt-1 text-sm text-gray-600">
                  Administra todos los posts de tu blog
                </p>
              </div>
              
              <div class="flex items-center space-x-4">
                <div class="flex items-center space-x-2">
                  <label class="text-sm text-gray-700">Mostrar:</label>
                  <select 
                    class="input text-sm py-1"
                    (change)="onFilterChange($event)"
                  >
                    <option value="all">Todos</option>
                    <option value="published">Publicados</option>
                    <option value="draft">Borradores</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Posts Table -->
          @if (blogService.isLoading()) {
            <div class="card p-8">
              <div class="flex items-center justify-center">
                <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-2 text-gray-600">Cargando posts...</span>
              </div>
            </div>
          } @else {
            <app-data-table
              [data]="posts()"
              [columns]="columns"
              (onEdit)="editPost($event)"
              (onDelete)="deletePost($event)"
            />
          }
        </div>
      </div>
    </div>
  `
})
export class PostsListComponent implements OnInit {
  protected readonly blogService = inject(BlogService);
  private readonly authService = inject(AuthService);

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
        const isDraft = info.getValue();
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isDraft 
            ? 'bg-yellow-100 text-yellow-800' 
            : 'bg-green-100 text-green-800'
        }">
          ${isDraft ? 'Borrador' : 'Publicado'}
        </span>`;
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
    // Navigate to edit
    window.location.href = `/posts/edit/${post.slug}`;
  }

  deletePost(post: BlogPost): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el post "${post.title}"?`)) {
      this.blogService.deletePost(post.slug).subscribe({
        next: () => {
          // Remove from local state
          const currentPosts = this.posts();
          this.posts.set(currentPosts.filter(p => p._id !== post._id));
        },
        error: (error) => {
          console.error('Error deleting post:', error);
          alert('Error al eliminar el post');
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}