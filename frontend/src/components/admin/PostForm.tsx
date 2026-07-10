import { useState, useEffect, useRef, type ReactElement } from 'react';
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
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; slug?: string; content?: string }>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [recoveredAt, setRecoveredAt] = useState<string | null>(null);
  const [lastAutosaved, setLastAutosaved] = useState<Date | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const slugInputRef = useRef<HTMLInputElement>(null);
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const pendingDraftRef = useRef<Record<string, any> | null>(null);
  const draftStorageKey = `admin-post-draft-${post?.slug || 'new'}`;

  const initialSnapshotRef = useRef(
    JSON.stringify({
      title: post?.title || '',
      slug: post?.slug || '',
      description: post?.description || '',
      content: post?.content || '',
      image: post?.image || '',
      category: post?.category || '',
      tags: post?.tags || [],
      language: post?.language || 'es',
      draft: post?.draft ?? true,
    })
  );

  // Detectar cambios sin guardar
  useEffect(() => {
    const current = JSON.stringify({
      title,
      slug,
      description,
      content,
      image,
      category,
      tags,
      language,
      draft,
    });
    setIsDirty(current !== initialSnapshotRef.current);
  }, [title, slug, description, content, image, category, tags, language, draft]);

  // Avisar antes de cerrar/navegar si hay cambios sin guardar
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Ofrecer recuperar un borrador autoguardado de una sesión anterior
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        pendingDraftRef.current = saved;
        setRecoveredAt(saved.savedAt || null);
        setShowRecoveryBanner(true);
      }
    } catch {
      // Ignorar borrador corrupto
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoguardar borrador mientras haya cambios sin guardar
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            title,
            slug,
            description,
            content,
            image,
            category,
            tags,
            language,
            draft,
            published,
            savedAt: new Date().toISOString(),
          })
        );
        setLastAutosaved(new Date());
      } catch {
        // localStorage lleno o no disponible: no interrumpir al usuario
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [title, slug, description, content, image, category, tags, language, draft, published, isDirty, draftStorageKey]);

  const handleRestoreDraft = () => {
    const saved = pendingDraftRef.current;
    if (!saved) return;
    setTitle(saved.title || '');
    setSlug(saved.slug || '');
    setSlugManuallyEdited(true);
    setDescription(saved.description || '');
    setContent(saved.content || '');
    setEditorKey((k) => k + 1);
    setImage(saved.image || '');
    setCategory(saved.category || '');
    setTags(saved.tags || []);
    setLanguage(saved.language || 'es');
    setDraft(saved.draft ?? true);
    if (saved.published) setPublished(saved.published);
    setShowRecoveryBanner(false);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // no-op
    }
    pendingDraftRef.current = null;
    setShowRecoveryBanner(false);
  };

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
    const errors: { title?: string; slug?: string; content?: string } = {};
    const isContentEmpty = !content.trim() || content.trim() === '<p></p>';
    if (!title.trim()) errors.title = 'El título es obligatorio';
    if (!slug.trim()) errors.slug = 'El slug es obligatorio';
    if (isContentEmpty) errors.content = 'El contenido no puede estar vacío';

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      showWarning('Revisá los campos marcados en rojo');
      if (errors.title) {
        titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInputRef.current?.focus();
      } else if (errors.slug) {
        slugInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        slugInputRef.current?.focus();
      } else if (errors.content) {
        contentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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

      setIsDirty(false);
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // no-op
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
      {showRecoveryBanner && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 sm:flex-row sm:items-center">
          <span>
            Encontramos un borrador sin guardar
            {recoveredAt ? ` del ${new Date(recoveredAt).toLocaleString('es-AR')}` : ''}. ¿Querés recuperarlo?
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Restaurar
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-transparent dark:text-indigo-200 dark:hover:bg-indigo-900"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Título y Slug */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Título *
          </label>
          <input
            ref={titleInputRef}
            type="text"
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            required
            aria-invalid={Boolean(fieldErrors.title)}
            className={`mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
              fieldErrors.title
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600'
            }`}
            placeholder="Título del post"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Slug *
          </label>
          <div className="mt-1 flex gap-2">
            <input
              ref={slugInputRef}
              type="text"
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
                if (fieldErrors.slug) setFieldErrors((prev) => ({ ...prev, slug: undefined }));
              }}
              required
              aria-invalid={Boolean(fieldErrors.slug)}
              className={`block w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                fieldErrors.slug
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600'
              }`}
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
          {fieldErrors.slug ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.slug}</p>
          ) : (
            slugStatus && (
              <p
                className={`mt-1 text-xs ${
                  slugStatus.startsWith('✓')
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}
              >
                {slugStatus}
              </p>
            )
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
      <div ref={contentSectionRef}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Contenido *
        </label>
        <div
          className={fieldErrors.content ? 'rounded-md ring-1 ring-red-500' : undefined}
        >
          <PostEditor
            key={editorKey}
            content={content}
            onChange={(value) => {
              setContent(value);
              if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: undefined }));
            }}
          />
        </div>
        {fieldErrors.content && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.content}</p>
        )}
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
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-4 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-700 dark:bg-gray-900/95 dark:supports-[backdrop-filter]:bg-gray-900/80 lg:-mx-6 lg:px-6">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isDirty
            ? `Tenés cambios sin guardar${
                lastAutosaved
                  ? ` · autoguardado ${lastAutosaved.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                  : ''
              }`
            : ' '}
        </span>
        <div className="flex items-center gap-4">
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
      </div>
    </form>
  );
}

