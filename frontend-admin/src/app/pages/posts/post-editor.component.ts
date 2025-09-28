import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { BlogService } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';
import { BlogPost } from '../../types/blog.types';
import { AutocompleteComponent } from '../../components/autocomplete.component';
import { TagsInputComponent } from '../../components/tags-input.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AutocompleteComponent, TagsInputComponent],
  template: `
    <div class="p-6 max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center space-x-3 mb-2">
              <a routerLink="/posts" class="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Volver a Posts
              </a>
            </div>
            <h1 class="text-3xl font-bold text-gray-900">
              {{ isEditing() ? 'Editar Post' : 'Crear Nuevo Post' }}
            </h1>
            <p class="text-gray-600 mt-1">
              {{ isEditing() ? 'Modifica tu post y guarda los cambios' : 'Escribe y publica tu nuevo contenido' }}
            </p>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex items-center space-x-3">
            <button
              type="button"
              (click)="togglePreview()"
              class="btn-secondary"
              title="{{ showPreview() ? 'Volver al editor' : 'Ver vista previa' }}"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (showPreview()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                }
              </svg>
              {{ showPreview() ? 'Editor' : 'Vista Previa' }}
            </button>
            
            <!-- Draft/Publish Toggle -->
            <div class="flex items-center bg-gray-100 rounded-full p-1">
              <button
                type="button"
                (click)="setDraftMode(true)"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                [class.bg-white]="isDraftMode()"
                [class.text-gray-900]="isDraftMode()"
                [class.shadow-sm]="isDraftMode()"
                [class.text-gray-600]="!isDraftMode()"
                [class.hover:text-gray-900]="!isDraftMode()"
              >
                <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
                Borrador
              </button>
              <button
                type="button"
                (click)="setDraftMode(false)"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                [class.bg-white]="!isDraftMode()"
                [class.text-gray-900]="!isDraftMode()"
                [class.shadow-sm]="!isDraftMode()"
                [class.text-gray-600]="isDraftMode()"
                [class.hover:text-gray-900]="isDraftMode()"
              >
                <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                Publicar
              </button>
            </div>
            
            <button
              type="button"
              (click)="savePost()"
              [disabled]="isLoading() || postForm.invalid"
              class="btn-primary"
              title="{{ isEditing() ? 'Actualizar post' : (isDraftMode() ? 'Guardar borrador' : 'Publicar post') }}"
            >
              @if (isLoading()) {
                <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              } @else {
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  @if (isDraftMode()) {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"></path>
                  } @else {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  }
                </svg>
              }
              {{ isEditing() ? 'Actualizar' : (isDraftMode() ? 'Guardar Borrador' : 'Publicar') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      @if (postForm.get('title')?.value) {
        <div class="mb-6">
          <div class="card p-4 bg-blue-50 border-blue-200">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center space-x-6">
                <div class="flex items-center space-x-2">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span class="text-blue-800 font-medium">{{ getWordCount() }} palabras</span>
                </div>
                <div class="flex items-center space-x-2">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span class="text-blue-800">{{ getReadingTime() }} min de lectura</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 rounded-full" [class]="postForm.valid ? 'bg-green-500' : 'bg-yellow-500'"></div>
                  <span class="text-blue-800">{{ postForm.valid ? 'Listo para publicar' : 'Faltan campos requeridos' }}</span>
                </div>
              </div>
              
              @if (lastSaved()) {
                <div class="text-blue-600">
                  <span>Guardado {{ lastSaved() }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Error Alert -->
      @if (error()) {
        <div class="mb-6">
          <div class="card p-4 bg-red-50 border-red-200">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <span class="text-red-800">{{ error() }}</span>
            </div>
          </div>
        </div>
      }

      <form [formGroup]="postForm" class="space-y-8">
        <!-- Basic Information -->
        <div class="card p-6">
          <div class="flex items-center mb-4">
            <div class="p-2 bg-blue-100 rounded-lg mr-3">
              <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-gray-900">Información Básica</h2>
          </div>
          
          <div class="space-y-6">
            <!-- Title -->
            <div>
              <label for="title" class="block text-sm font-semibold text-gray-700 mb-2">
                Título del Post *
              </label>
              <input
                id="title"
                type="text"
                formControlName="title"
                class="input text-lg font-medium"
                placeholder="Escribe un título atractivo para tu post..."
                (input)="onTitleChange()"
              />
              @if (postForm.get('title')?.invalid && postForm.get('title')?.touched) {
                <p class="mt-2 text-sm text-red-600 flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  El título es requerido
                </p>
              }
            </div>

            <!-- Slug -->
            <div>
              <label for="slug" class="block text-sm font-semibold text-gray-700 mb-2">
                URL del Post (Slug) *
              </label>
              <div class="flex items-center">
                <span class="text-gray-500 text-sm mr-2">/posts/</span>
                <div class="flex-1 relative">
                  <input
                    id="slug"
                    type="text"
                    formControlName="slug"
                    class="input pr-8"
                    [class.border-red-300]="postForm.get('slug')?.invalid && postForm.get('slug')?.touched"
                    [class.border-yellow-300]="slugValidation() && !slugValidation()?.isValid"
                    [class.border-green-300]="slugValidation()?.isValid"
                    placeholder="url-amigable-del-post"
                    (input)="onSlugInput()"
                  />
                  <!-- Loading indicator -->
                  @if (isValidatingSlug()) {
                    <div class="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <svg class="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  }
                  <!-- Status indicator -->
                  @if (!isValidatingSlug() && slugValidation()) {
                    <div class="absolute right-2 top-1/2 transform -translate-y-1/2">
                      @if (slugValidation()?.isValid) {
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      } @else {
                        <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                      }
                    </div>
                  }
                </div>
              </div>
              
              <p class="mt-1 text-xs text-gray-500">
                La URL se genera automáticamente desde el título, pero puedes personalizarla
              </p>
              
              <!-- Slug validation messages -->
              @if (slugValidation() && slugValidation()?.message) {
                <div class="mt-2">
                  @if (slugValidation()?.isValid) {
                    <p class="text-sm text-green-600 flex items-center">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {{ slugValidation()?.message }}
                    </p>
                  } @else {
                    <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p class="text-sm text-yellow-800 mb-2">{{ slugValidation()?.message }}</p>
                      @if (slugValidation()?.suggestedSlug) {
                        <button
                          type="button"
                          (click)="useSuggestedSlug()"
                          class="text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-md font-medium transition-colors"
                        >
                          Usar "{{ slugValidation()?.suggestedSlug }}"
                        </button>
                      }
                    </div>
                  }
                </div>
              }
              
              @if (postForm.get('slug')?.invalid && postForm.get('slug')?.touched) {
                <p class="mt-2 text-sm text-red-600 flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  El slug es requerido
                </p>
              }
            </div>

            <!-- Description -->
            <div>
              <label for="description" class="block text-sm font-semibold text-gray-700 mb-2">
                Descripción Breve
              </label>
              <textarea
                id="description"
                formControlName="description"
                rows="3"
                class="textarea"
                placeholder="Una breve descripción que aparecerá en las previews y resultados de búsqueda..."
              ></textarea>
              <p class="mt-1 text-xs text-gray-500">
                Recomendado: entre 120-160 caracteres para mejor SEO
              </p>
            </div>
          </div>
        </div>

        <!-- Metadata -->
        <div class="card p-6">
          <div class="flex items-center mb-4">
            <div class="p-2 bg-purple-100 rounded-lg mr-3">
              <svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-gray-900">Categorización</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Categoría
              </label>
              <app-autocomplete
                [options]="categories()"
                [value]="categoryValue()"
                placeholder="ej. Tecnología, Tutorial, Opinión"
                [allowCreate]="true"
                (optionSelected)="onCategorySelected($event)"
                (valueChange)="categoryValue.set($event)"
              />
              <p class="mt-1 text-xs text-gray-500">
                Selecciona una categoría existente o crea una nueva
              </p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Etiquetas (Tags)
              </label>
              <app-tags-input
                [options]="tags()"
                [value]="selectedTagsArray()"
                placeholder="javascript, web, tutorial"
                (valueChange)="onTagsArrayChange($event)"
                (tagAdded)="onTagAdded($event)"
              />
            </div>

            <div>
              <label for="language" class="block text-sm font-semibold text-gray-700 mb-2">
                Idioma
              </label>
              <select
                id="language"
                formControlName="language"
                class="select"
              >
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇺🇸 English</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Featured Image -->
        <div class="card p-6">
          <div class="flex items-center mb-4">
            <div class="p-2 bg-green-100 rounded-lg mr-3">
              <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-gray-900">Imagen Destacada</h2>
          </div>

          <div>
            <label for="image" class="block text-sm font-semibold text-gray-700 mb-2">
              URL de la Imagen
            </label>
            <input
              id="image"
              type="url"
              formControlName="image"
              class="input"
              placeholder="https://ejemplo.com/mi-imagen.jpg"
            />
            <p class="mt-1 text-xs text-gray-500">
              Proporciona la URL de una imagen que represente tu post (opcional)
            </p>
            
            @if (postForm.get('image')?.value) {
              <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                <p class="text-sm text-gray-600 mb-2">Vista previa:</p>
                <img 
                  [src]="postForm.get('image')?.value" 
                  alt="Vista previa de la imagen"
                  class="w-full max-w-sm h-32 object-cover rounded-lg border border-gray-200"
                  (error)="onImageError()"
                />
              </div>
            }
          </div>
        </div>

        <!-- Content Editor -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <div class="p-2 bg-orange-100 rounded-lg mr-3">
                <svg class="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </div>
              <h2 class="text-lg font-semibold text-gray-900">Contenido del Post *</h2>
            </div>
            
            <!-- Markdown Toolbar -->
            <div class="flex items-center space-x-2">
              <button
                type="button"
                (click)="insertMarkdown('**', '**', 'texto en negrita')"
                class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Negrita"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
                </svg>
              </button>
              
              <button
                type="button"
                (click)="insertMarkdown('*', '*', 'texto en cursiva')"
                class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Cursiva"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4l6 16M4 4l6 16"></path>
                </svg>
              </button>
              
              <button
                type="button"
                (click)="insertMarkdown('## ', '', 'Título de sección')"
                class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Título"
              >
                H2
              </button>
              
              <button
                type="button"
                (click)="insertMarkdown('[', '](https://)', 'texto del enlace')"
                class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Enlace"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                </svg>
              </button>
            </div>
          </div>
          
          @if (!showPreview()) {
            <!-- Split Editor View -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <!-- Editor -->
              <div class="space-y-3">
                <div class="flex items-center justify-between text-sm text-gray-500">
                  <span>Editor Markdown</span>
                  <span>Ctrl+P para vista previa</span>
                </div>
                <textarea
                  id="content"
                  formControlName="content"
                  rows="25"
                  class="textarea font-mono text-sm resize-none"
                  placeholder="# Mi Nuevo Post

Bienvenido a mi blog! Aquí puedes escribir usando Markdown.

## Que es Markdown?

Markdown es un lenguaje de marcado ligero que te permite formatear texto de manera sencilla:

- Negrita con doble asterisco
- Cursiva con asterisco simple
- Enlaces con corchetes y parentesis
- Codigo con comillas invertidas

### Lista de tareas
- Escribir el titulo
- Agregar introduccion
- Desarrollar el contenido
- Revisar y publicar

> Una cita inspiradora para motivar a tus lectores.

Comienza a escribir tu contenido aquí!"
                  (input)="onContentChange()"
                  (keydown)="onEditorKeydown($event)"
                ></textarea>
                @if (postForm.get('content')?.invalid && postForm.get('content')?.touched) {
                  <p class="text-sm text-red-600 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    El contenido es requerido
                  </p>
                }
              </div>
              
              <!-- Live Preview -->
              <div class="hidden xl:block">
                <div class="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>Vista Previa en Vivo</span>
                  <button 
                    type="button" 
                    (click)="togglePreview()" 
                    class="text-blue-600 hover:text-blue-800"
                  >
                    Ver pantalla completa
                  </button>
                </div>
                <div class="border border-gray-200 rounded-lg p-6 bg-white min-h-96 max-h-96 overflow-y-auto">
                  <div 
                    class="prose prose-sm max-w-none"
                    [innerHTML]="previewHtml() || '<p class=&quot;text-gray-400 italic&quot;>La vista previa aparecerá aquí mientras escribes...</p>'"
                  ></div>
                </div>
              </div>
            </div>
          } @else {
            <!-- Full Screen Preview -->
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm text-gray-500">
                <span>Vista Previa Completa</span>
                <button 
                  type="button" 
                  (click)="togglePreview()" 
                  class="text-blue-600 hover:text-blue-800"
                >
                  Volver al editor
                </button>
              </div>
              <div class="border border-gray-200 rounded-lg p-8 bg-white min-h-96">
                <div class="prose max-w-none" [innerHTML]="previewHtml()"></div>
              </div>
            </div>
          }
          
          <!-- Help Text -->
          <div class="mt-4 p-4 bg-blue-50 rounded-lg">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="text-sm text-blue-800">
                <p class="font-medium mb-1">Consejos para escribir:</p>
                <ul class="space-y-1 text-blue-700">
                  <li>• Usa títulos (##) para estructurar tu contenido</li>
                  <li>• Incluye ejemplos de código con código o bloques de código</li>
                  <li>• Agrega enlaces relevantes para más información</li>
                  <li>• Usa listas para organizar ideas</li>
                </ul>
                <p class="mt-2">
                  <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium">
                    Ver guía completa de Markdown →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `
})
export class PostEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly blogService = inject(BlogService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEditing = signal(false);
  protected readonly tagsValue = signal('');
  protected readonly showPreview = signal(false);
  protected readonly previewHtml = signal('');
  protected readonly lastSaved = signal<string | null>(null);
  protected readonly isDraftSave = signal(false);
  
  // Autocompletado y validación
  protected readonly categories = signal<string[]>([]);
  protected readonly tags = signal<string[]>([]);
  protected readonly categoryValue = signal('');
  protected readonly selectedTagsArray = signal<string[]>([]);
  protected readonly slugValidation = signal<{ isValid: boolean; suggestedSlug?: string; message?: string } | null>(null);
  protected readonly isValidatingSlug = signal(false);
  
  // Draft/Publish mode
  protected readonly isDraftMode = signal(true);
  
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
    // Cargar categorías y tags existentes
    this.loadCategoriesAndTags();
    
    // Configurar validación de slug
    this.setupSlugValidation();
    
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.isEditing.set(true);
      this.currentSlug.set(slug);
      this.loadPost(slug);
    }
  }

  private loadCategoriesAndTags(): void {
    // Cargar categorías
    this.blogService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
      },
      error: (error) => {
        console.warn('Error al cargar categorías:', error);
      }
    });
    
    // Cargar tags
    this.blogService.getTags().subscribe({
      next: (tags) => {
        this.tags.set(tags);
      },
      error: (error) => {
        console.warn('Error al cargar tags:', error);
      }
    });
  }
  
  private setupSlugValidation(): void {
    this.postForm.get('slug')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((slug: string | null) => {
        // Resetear validación inmediatamente cuando cambia el slug
        this.slugValidation.set(null);
        this.isValidatingSlug.set(false);
        
        if (!slug || slug.length < 3) {
          return [];
        }
        
        // Verificar si el usuario está autenticado
        if (!this.authService.isAuthenticated()) {
          this.slugValidation.set({
            isValid: false,
            message: 'Debes iniciar sesión para validar slugs'
          });
          return [];
        }
        
        this.isValidatingSlug.set(true);
        console.log('Validating slug:', slug, 'Current slug:', this.currentSlug());
        console.log('User authenticated:', this.authService.isAuthenticated());
        console.log('Access token exists:', !!this.authService.getAccessToken());
        return this.blogService.validateSlug(slug, this.currentSlug() || undefined);
      })
    ).subscribe({
      next: (result) => {
        console.log('Slug validation result:', result);
        this.isValidatingSlug.set(false);
        
        if (result && typeof result.isValid === 'boolean') {
          if (result.isValid) {
            this.slugValidation.set({ 
              isValid: true, 
              message: 'Slug disponible' 
            });
          } else {
            this.slugValidation.set({
              isValid: false,
              suggestedSlug: result.suggestedSlug,
              message: `Este slug ya existe. ¿Usar "${result.suggestedSlug}" en su lugar?`
            });
          }
        }
      },
      error: (error) => {
        console.error('Error validating slug:', error);
        this.isValidatingSlug.set(false);
        
        if (error.status === 401) {
          this.slugValidation.set({
            isValid: false,
            message: 'Error de autenticación. Inicia sesión nuevamente.'
          });
        } else if (error.status === 403) {
          this.slugValidation.set({
            isValid: false,
            message: 'No tienes permisos para validar slugs.'
          });
        } else {
          this.slugValidation.set({
            isValid: false,
            message: 'Error al validar el slug'
          });
        }
      }
    });
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
        this.selectedTagsArray.set(post.tags || []);
        this.categoryValue.set(post.category || '');
        this.isDraftMode.set(post.draft || false);
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
  
  protected onSlugInput(): void {
    // Resetear validación inmediatamente cuando el usuario empieza a escribir
    this.slugValidation.set(null);
    this.isValidatingSlug.set(false);
  }

  protected onTagsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.tagsValue.set(target.value);
  }
  
  protected onTagsArrayChange(tags: string[]): void {
    this.selectedTagsArray.set(tags);
    this.tagsValue.set(tags.join(', '));
  }
  
  protected onTagAdded(event: { tag: string; isNew: boolean }): void {
    if (event.isNew) {
      // Agregar el nuevo tag a la lista para futuros usos
      this.tags.update(tags => [...tags, event.tag]);
    }
  }
  
  protected onCategorySelected(event: { value: string; isNew: boolean }): void {
    this.categoryValue.set(event.value);
    this.postForm.patchValue({ category: event.value });
    
    if (event.isNew) {
      // Agregar la nueva categoría a la lista para futuros usos
      this.categories.update(categories => [...categories, event.value]);
    }
  }
  
  protected useSuggestedSlug(): void {
    const validation = this.slugValidation();
    if (validation?.suggestedSlug) {
      this.postForm.patchValue({ slug: validation.suggestedSlug });
    }
  }
  
  protected setDraftMode(isDraft: boolean): void {
    this.isDraftMode.set(isDraft);
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
    const tags = this.selectedTagsArray().filter(tag => tag.trim().length > 0);

    return {
      title: formValue.title!,
      slug: formValue.slug!,
      content: formValue.content!,
      description: formValue.description || undefined,
      category: this.categoryValue() || undefined,
      language: formValue.language || 'es',
      image: formValue.image || undefined,
      tags: tags.length > 0 ? tags : undefined,
      draft: isDraft,
      published: new Date().toISOString()
    };
  }

  protected savePost(): void {
    if (this.postForm.get('title')?.invalid || this.postForm.get('slug')?.invalid) {
      this.notificationService.error('Campos requeridos', 'El título y slug son requeridos');
      return;
    }

    if (!this.isDraftMode() && this.postForm.invalid) {
      this.notificationService.error('Campos incompletos', 'Por favor completa todos los campos requeridos para publicar');
      this.postForm.markAllAsTouched();
      return;
    }

    this.savePostWithMode(this.isDraftMode());
  }

  private savePostWithMode(isDraft: boolean): void {
    this.isLoading.set(true);
    this.isDraftSave.set(isDraft);
    this.error.set(null);

    const postData = this.preparePostData(isDraft);

    if (this.isEditing()) {
      const slug = this.currentSlug()!;
      this.blogService.updatePost(slug, postData).subscribe({
        next: () => {
          this.updateLastSaved();
          this.notificationService.success(
            'Post actualizado',
            isDraft ? 'El borrador se ha guardado correctamente' : 'El post se ha publicado correctamente'
          );
          this.router.navigate(['/posts']);
        },
        error: (error) => {
          console.error('Error al actualizar el post:', error);
          let errorTitle = 'Error al actualizar';
          let errorMessage = 'No se pudo actualizar el post';
          
          if (error.status === 400 && error.error?.message?.includes('slug')) {
            errorTitle = 'Slug duplicado';
            errorMessage = 'El slug ya existe. Por favor elige otro.';
          } else if (error.status === 400) {
            errorTitle = 'Datos inválidos';
            errorMessage = 'Revisa los campos requeridos.';
          } else if (error.status === 403) {
            errorTitle = 'Sin permisos';
            errorMessage = 'No tienes permisos para actualizar este post.';
          } else if (error.status === 404) {
            errorTitle = 'Post no encontrado';
            errorMessage = 'El post que intentas actualizar no existe.';
          }
          
          this.notificationService.error(errorTitle, errorMessage);
          this.isLoading.set(false);
          this.isDraftSave.set(false);
        }
      });
    } else {
      this.blogService.createPost(postData).subscribe({
        next: () => {
          this.updateLastSaved();
          this.notificationService.success(
            'Post creado',
            isDraft ? 'El borrador se ha guardado correctamente' : 'El post se ha publicado correctamente'
          );
          this.router.navigate(['/posts']);
        },
        error: (error) => {
          console.error('Error al crear el post:', error);
          let errorTitle = 'Error al crear';
          let errorMessage = 'No se pudo crear el post';
          
          if (error.status === 400 && error.error?.message?.includes('slug')) {
            errorTitle = 'Slug duplicado';
            errorMessage = 'El slug ya existe. El sistema generará uno alternativo automáticamente.';
          } else if (error.status === 400) {
            errorTitle = 'Datos inválidos';
            errorMessage = 'Revisa los campos requeridos.';
          } else if (error.status === 403) {
            errorTitle = 'Sin permisos';
            errorMessage = 'No tienes permisos para crear posts.';
          } else if (error.status === 401) {
            errorTitle = 'Sesión expirada';
            errorMessage = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
          }
          
          this.notificationService.error(errorTitle, errorMessage);
          this.isLoading.set(false);
          this.isDraftSave.set(false);
        }
      });
    }
  }

  private updateLastSaved(): void {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    this.lastSaved.set('a las ' + timeString);
  }

  protected onImageError(): void {
    // Handle image load error
    console.warn('Error loading image preview');
  }

  protected insertMarkdown(before: string, after: string, placeholder: string): void {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = selectedText || placeholder;
    
    const newText = before + replacement + after;
    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    
    // Update form control
    this.postForm.get('content')?.setValue(newValue);
    this.onContentChange();
    
    // Set cursor position
    setTimeout(() => {
      const newStart = start + before.length;
      const newEnd = newStart + replacement.length;
      textarea.setSelectionRange(newStart, newEnd);
      textarea.focus();
    });
  }

  protected onEditorKeydown(event: KeyboardEvent): void {
    // Handle Ctrl+P for preview
    if (event.ctrlKey && event.key === 'p') {
      event.preventDefault();
      this.togglePreview();
    }
  }
}

