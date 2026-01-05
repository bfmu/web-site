import { useState, useEffect } from 'react';
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

interface PostFormProps {
  post?: BlogPost;
  onSuccess?: () => void;
}

export function PostForm({ post, onSuccess }: PostFormProps) {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [description, setDescription] = useState(post?.description || '');
  const [content, setContent] = useState(post?.content || '');
  const [image, setImage] = useState(post?.image || '');
  const [category, setCategory] = useState(post?.category || '');
  const [tags, setTags] = useState(post?.tags || []);
  const [language, setLanguage] = useState(post?.language || 'es');
  const [published, setPublished] = useState(
    post?.published
      ? new Date(post.published).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [slugStatus, setSlugStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (title && !slug) {
      setSlug(generateSlug(title));
    }
  }, [title, slug]);

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

  const handleSubmit = async (isDraft: boolean) => {
    if (!title || !slug || !content) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const readingTime = calculateReadingTime(content);
      const postData = {
        title,
        slug,
        content,
        description: description || undefined,
        image: image || undefined,
        tags,
        category: category || undefined,
        draft: isDraft,
        published: new Date(published).toISOString(),
        language: language || 'es',
        readingTime,
      };

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
      alert(`Error al ${isDraft ? 'guardar' : 'publicar'} el post: ${error.message}`);
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
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
              onChange={(e) => setSlug(e.target.value)}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
              placeholder="url-del-post"
            />
            <button
              type="button"
              onClick={handleGenerateSlug}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Generar desde título"
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
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

      {/* Idioma y Fecha */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Idioma
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
          />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Guardar Borrador
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : post ? 'Actualizar' : 'Publicar'}
        </button>
      </div>
    </form>
  );
}

