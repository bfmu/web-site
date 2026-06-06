import { useState, useEffect, type ReactElement } from 'react';
import { PostEditor } from './PostEditor';
import { ImageUpload } from './ImageUpload';
import { CategoryInput } from './CategoryInput';
import { TagInput } from './TagInput';
import {
  createPost,
  updatePost,
  generateSlug,
  calculateReadingTime,
  validateSlug,
  type BlogPost,
} from '../../lib/admin-api';
import { getPostUrlBySlug } from '@/utils/url-utils';
import { showError, showWarning } from '@/lib/notifications';

interface PostFormProps {
  post?: BlogPost;
  onSuccess?: () => void;
}

export function PostForm({ post, onSuccess }: PostFormProps): ReactElement {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [description, setDescription] = useState(post?.description || '');
  const [content, setContent] = useState(post?.content || '');
  const [image, setImage] = useState(post?.image || '');
  const [category, setCategory] = useState(post?.category || '');
  const [tags, setTags] = useState(post?.tags || []);
  const [language, setLanguage] = useState(post?.language || 'es');
  const [draft, setDraft] = useState(post?.draft ?? true);
  const [published, setPublished] = useState(
    post?.published
      ? new Date(post.published).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [slugStatus, setSlugStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [lastTitleForSlug, setLastTitleForSlug] = useState(post?.title || '');

  // Generar slug automáticamente cuando cambia el título
  useEffect(() => {
    if (title && !slugManuallyEdited) {
      // Si el slug está vacío o coincide con el slug del título anterior, actualizarlo
      const newSlug = generateSlug(title);
      if (!slug || slug === generateSlug(lastTitleForSlug)) {
        setSlug(newSlug);
      }
      setLastTitleForSlug(title);
    } else if (!title) {
      // Si se borra el título, limpiar también el slug
      setSlug('');
      setLastTitleForSlug('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const handleValidateSlug = async () => {
    if (!slug.trim()) {
      setSlugStatus('');
      return;
    }

    try {
      const result = await validateSlug(slug, post?.slug);
      if (result.isValid) {
        setSlugStatus('✓ Slug disponible');
      } else {
        setSlugStatus(`⚠ Slug no disponible. Sugerencia: ${result.suggestedSlug}`);
      }
    } catch (error) {
      setSlugStatus('');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleValidateSlug();
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const handleGenerateSlug = () => {
    setSlug(generateSlug(title));
  };

  const handleSubmit = async () => {
    if (!title || !slug || !content) {
      showWarning('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const readingTime = calculateReadingTime(content);
      
      // Limpiar datos antes de enviar
      // Si image es string vacío, enviarlo explícitamente para eliminar la imagen
      const postData = {
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        description: description?.trim() || undefined,
        image: image === '' ? '' : (image?.trim() || undefined),
        tags: tags && tags.length > 0 ? tags : undefined,
        category: category?.trim() || undefined,
        draft: draft,
        published: new Date(published).toISOString(),
        language: language || 'es',
        readingTime,
      };
      
      console.log('Enviando post:', { ...postData, content: content.substring(0, 100) + '...' });

      if (post) {
        await updatePost(post.slug, postData);
      } else {
        await createPost(postData);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = '/admin/posts';
      }
    } catch (error: any) {
      console.error('Error al crear/actualizar post:', error);
      const errorMessage = error?.message || error?.data?.message || error?.statusText || 'Error desconocido';
      const errorDetails = error?.data ? JSON.stringify(error.data, null, 2) : '';
      showError(`Error al ${draft ? 'guardar' : 'publicar'} el post: ${errorMessage}${errorDetails ? '\n\nDetalles: ' + errorDetails : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {/* Título y Slug */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Título *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            placeholder="Título del post"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Slug *
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              required
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              placeholder="url-del-post"
            />
            <button
              type="button"
              onClick={() => {
                setSlug(generateSlug(title));
                setSlugManuallyEdited(false);
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Regenerar desde título"
            >
              🔄
            </button>
          </div>
          {slugStatus && (
            <p
              className={`mt-1 text-xs ${
                slugStatus.startsWith('✓')
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}
            >
              {slugStatus}
            </p>
          )}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Descripción
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          placeholder="Breve descripción del post"
        />
      </div>

      {/* Categoría y Tags */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryInput value={category} onChange={setCategory} />
        <TagInput value={tags} onChange={setTags} />
      </div>

      {/* Imagen de portada */}
      <ImageUpload currentImage={image} onUploadComplete={setImage} />

      {/* Editor de contenido */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Contenido *
        </label>
        <PostEditor content={content} onChange={setContent} />
      </div>

      {/* Estado del post, Idioma y Fecha */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estado del post
          </label>
          <div className="flex items-center">
            <button
              type="button"
              role="switch"
              aria-checked={!draft}
              onClick={() => setDraft(!draft)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                !draft ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  !draft ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {draft ? 'Borrador' : 'Publicado'}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Idioma
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        <div>
          <label htmlFor="published" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha de publicación
          </label>
          <input
            type="datetime-local"
            id="published"
            value={published}
            onChange={(e) => setPublished(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Botón de acción */}
      <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
        {post && slug && (
          <a
            href={getPostUrlBySlug(slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Ver post en la web (abre en nueva pestaña)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1={10} y1={14} x2={21} y2={3} />
            </svg>
            Ver post
          </a>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : post ? 'Actualizar' : draft ? 'Guardar Borrador' : 'Publicar'}
        </button>
      </div>
    </form>
  );
}

