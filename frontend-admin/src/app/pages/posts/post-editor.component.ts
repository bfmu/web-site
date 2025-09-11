import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';
import { BlogPost } from '../../types/blog.types';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Navigation -->
      <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center space-x-8">
              <a routerLink="/posts" class="text-sm text-gray-500 hover:text-gray-700">
                ← Volver a Posts
              </a>
              <h1 class="text-xl font-semibold text-gray-900">
                {{ isEditing() ? 'Editar Post' : 'Nuevo Post' }}
              </h1>
            </div>
            
            <div class="flex items-center space-x-4">
              <button
                type="button"
                (click)="togglePreview()"
                class="btn-outline text-sm"
              >
                {{ showPreview() ? '📝 Editor' : '👁️ Vista Previa' }}
              </button>
              
              <button
                type="button"
                (click)="saveDraft()"
                [disabled]="isLoading()"
                class="btn-outline"
              >
                💾 Guardar Borrador
              </button>
              
              <button
                type="button"
                (click)="publish()"
                [disabled]="isLoading() || postForm.invalid"
                class="btn-primary"
              >
                {{ isEditing() ? '🔄 Actualizar' : '🚀 Publicar' }}
              </button>
              
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
      <div class="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-6 sm:px-0">
          @if (error()) {
            <div class="mb-6 rounded-md bg-red-50 p-4">
              <div class="text-sm text-red-700">
                {{ error() }}
              </div>
            </div>
          }

          <form [formGroup]="postForm" class="space-y-6">
            <!-- Title -->
            <div class="card p-6">
              <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <label for="title" class="block text-sm font-medium text-gray-700">
                    Título *
                  </label>
                  <input
                    id="title"
                    type="text"
                    formControlName="title"
                    class="input mt-1"
                    placeholder="Título del post"
                    (input)="onTitleChange()"
                  />
                  @if (postForm.get('title')?.invalid && postForm.get('title')?.touched) {
                    <p class="mt-1 text-sm text-red-600">
                      El título es requerido
                    </p>
                  }
                </div>

                <div>
                  <label for="slug" class="block text-sm font-medium text-gray-700">
                    Slug *
                  </label>
                  <input
                    id="slug"
                    type="text"
                    formControlName="slug"
                    class="input mt-1"
                    placeholder="url-del-post"
                  />
                  @if (postForm.get('slug')?.invalid && postForm.get('slug')?.touched) {
                    <p class="mt-1 text-sm text-red-600">
                      El slug es requerido
                    </p>
                  }
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="card p-6">
              <label for="description" class="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="description"
                formControlName="description"
                rows="3"
                class="input mt-1"
                placeholder="Breve descripción del post..."
              ></textarea>
            </div>

            <!-- Meta -->
            <div class="card p-6">
              <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div>
                  <label for="category" class="block text-sm font-medium text-gray-700">
                    Categoría
                  </label>
                  <input
                    id="category"
                    type="text"
                    formControlName="category"
                    class="input mt-1"
                    placeholder="Categoría"
                  />
                </div>

                <div>
                  <label for="tags" class="block text-sm font-medium text-gray-700">
                    Tags
                  </label>
                  <input
                    id="tags"
                    type="text"
                    [value]="tagsValue()"
                    (input)="onTagsChange($event)"
                    class="input mt-1"
                    placeholder="tag1, tag2, tag3"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Separa los tags con comas
                  </p>
                </div>

                <div>
                  <label for="language" class="block text-sm font-medium text-gray-700">
                    Idioma
                  </label>
                  <select
                    id="language"
                    formControlName="language"
                    class="input mt-1"
                  >
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="card p-6">
              <div class="flex justify-between items-center mb-4">
                <label for="content" class="block text-sm font-medium text-gray-700">
                  Contenido (Markdown) *
                </label>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">{{ getWordCount() }} palabras</span>
                  <span class="text-xs text-gray-500">•</span>
                  <span class="text-xs text-gray-500">{{ getReadingTime() }} min lectura</span>
                </div>
              </div>
              
              @if (!showPreview()) {
                <!-- Editor Mode -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <textarea
                      id="content"
                      formControlName="content"
                      rows="25"
                      class="input font-mono text-sm resize-none"
                      placeholder="# Mi Post

Escribe tu contenido en **Markdown** aquí...

## Subtítulo

- Lista item 1
- Lista item 2

[Enlace](https://ejemplo.com)"
                      (input)="onContentChange()"
                    ></textarea>
                    @if (postForm.get('content')?.invalid && postForm.get('content')?.touched) {
                      <p class="mt-1 text-sm text-red-600">
                        El contenido es requerido
                      </p>
                    }
                  </div>
                  
                  <!-- Live Preview -->
                  <div class="border rounded-md p-4 bg-white max-h-96 lg:max-h-none overflow-y-auto">
                    <div class="text-sm text-gray-500 mb-2 border-b pb-2">Vista Previa</div>
                    <div 
                      class="prose prose-sm max-w-none"
                      [innerHTML]="previewHtml()"
                    ></div>
                  </div>
                </div>
              } @else {
                <!-- Full Preview Mode -->
                <div class="border rounded-md p-6 bg-white min-h-96">
                  <div class="prose max-w-none" [innerHTML]="previewHtml()"></div>
                </div>
              }
              
              <p class="mt-2 text-xs text-gray-500">
                Puedes usar Markdown para formatear tu contenido. 
                <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" class="text-blue-600 hover:text-blue-800">
                  Ver guía de Markdown
                </a>
              </p>
            </div>

            <!-- Image -->
            <div class="card p-6">
              <label for="image" class="block text-sm font-medium text-gray-700">
                Imagen de portada (URL)
              </label>
              <input
                id="image"
                type="url"
                formControlName="image"
                class="input mt-1"
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class PostEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly blogService = inject(BlogService);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEditing = signal(false);
  protected readonly tagsValue = signal('');
  protected readonly showPreview = signal(false);
  protected readonly previewHtml = signal('');
  
  private readonly currentSlug = signal<string | null>(null);

  protected readonly postForm = this.fb.group({
    title: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    content: ['', [Validators.required]],
    description: [''],
    category: [''],
    language: ['es'],
    image: [''],
    draft: [true]
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.isEditing.set(true);
      this.currentSlug.set(slug);
      this.loadPost(slug);
    }
  }

  private loadPost(slug: string): void {
    this.isLoading.set(true);
    this.blogService.getPost(slug).subscribe({
      next: (post) => {
        this.postForm.patchValue({
          title: post.title,
          slug: post.slug,
          content: post.content,
          description: post.description || '',
          category: post.category || '',
          language: post.language || 'es',
          image: post.image || '',
          draft: post.draft
        });
        this.tagsValue.set(post.tags?.join(', ') || '');
        this.updatePreview();
        this.isLoading.set(false);
      },
      error: (error) => {
        this.error.set('Error al cargar el post');
        this.isLoading.set(false);
      }
    });
  }

  protected onTitleChange(): void {
    const title = this.postForm.get('title')?.value || '';
    if (!this.isEditing() && title) {
      const slug = this.generateSlug(title);
      this.postForm.patchValue({ slug });
    }
  }

  protected onTagsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.tagsValue.set(target.value);
  }

  protected onContentChange(): void {
    this.updatePreview();
  }

  protected togglePreview(): void {
    this.showPreview.set(!this.showPreview());
    this.updatePreview();
  }

  protected getWordCount(): number {
    const content = this.postForm.get('content')?.value || '';
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  protected getReadingTime(): number {
    const wordCount = this.getWordCount();
    return Math.ceil(wordCount / 200); // Asumiendo 200 palabras por minuto
  }

  private updatePreview(): void {
    const content = this.postForm.get('content')?.value || '';
    // Conversión básica de Markdown a HTML
    const html = this.markdownToHtml(content);
    this.previewHtml.set(html);
  }

  private markdownToHtml(markdown: string): string {
    return markdown
      // Headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code inline
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:text-blue-800">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Lists
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Wrap in paragraphs
      .replace(/^(?!<[h|u|o|l])(.*)(?!<\/[h|u|o|l]>)$/gm, '<p>$1</p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<[h|u|o|l])/g, '$1')
      .replace(/(<\/[h|u|o|l]>)<\/p>/g, '$1');
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private preparePostData(isDraft: boolean) {
    const formValue = this.postForm.value;
    const tags = this.tagsValue()
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    return {
      title: formValue.title!,
      slug: formValue.slug!,
      content: formValue.content!,
      description: formValue.description || undefined,
      category: formValue.category || undefined,
      language: formValue.language || 'es',
      image: formValue.image || undefined,
      tags: tags.length > 0 ? tags : undefined,
      draft: isDraft,
      published: new Date().toISOString()
    };
  }

  protected saveDraft(): void {
    if (this.postForm.get('title')?.invalid || this.postForm.get('slug')?.invalid) {
      this.error.set('El título y slug son requeridos');
      return;
    }

    this.savePost(true);
  }

  protected publish(): void {
    if (this.postForm.invalid) {
      this.error.set('Por favor completa todos los campos requeridos');
      this.postForm.markAllAsTouched();
      return;
    }

    this.savePost(false);
  }

  private savePost(isDraft: boolean): void {
    this.isLoading.set(true);
    this.error.set(null);

    const postData = this.preparePostData(isDraft);

    if (this.isEditing()) {
      const slug = this.currentSlug()!;
      this.blogService.updatePost(slug, postData).subscribe({
        next: () => {
          this.router.navigate(['/posts']);
        },
        error: (error) => {
          this.error.set('Error al actualizar el post');
          this.isLoading.set(false);
        }
      });
    } else {
      this.blogService.createPost(postData).subscribe({
        next: () => {
          this.router.navigate(['/posts']);
        },
        error: (error) => {
          this.error.set('Error al crear el post');
          this.isLoading.set(false);
        }
      });
    }
  }

  protected logout(): void {
    this.authService.logout();
  }
}
