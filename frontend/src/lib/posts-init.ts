/**
 * Inicialización de la página de listado de posts. Se llama al cargar /admin/posts
 * tanto en carga directa como tras transiciones Swup (content:replace).
 * Usa delegación de eventos en document para evitar duplicar listeners.
 */
let deleteHandlerAttached = false;

export function initPostsPage(): void {
  if (typeof window === 'undefined') return;
  const isPostsPage = window.location.pathname.replace(/\/$/, '').endsWith('/admin/posts');
  if (!isPostsPage) {
    return;
  }

  if (deleteHandlerAttached) return;
  deleteHandlerAttached = true;

  document.addEventListener('click', async (e) => {
    const target = (e.target as HTMLElement).closest('[data-action="delete"]') as HTMLElement | null;
    if (!target || target.dataset.action !== 'delete') return;

    e.preventDefault();
    const slug = target.dataset.slug;
    if (!slug) return;

    if (!confirm('¿Estás seguro de que quieres eliminar este post?')) {
      return;
    }

    try {
      const { deletePost } = await import('./admin-api');
      await deletePost(slug);
      window.location.reload();
    } catch (error: unknown) {
      const { showError } = await import('./notifications');
      showError(`Error al eliminar: ${(error as { message?: string })?.message || 'Error desconocido'}`);
    }
  });
}
