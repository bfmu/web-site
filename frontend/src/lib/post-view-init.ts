/**
 * Inicialización de la vista de un post individual.
 * Muestra el botón de editar cuando el usuario es admin o editor.
 * Se llama en carga directa y tras transiciones Swup (content:replace).
 */
export function initPostViewPage(): void {
  if (typeof window === 'undefined') return;

  // Solo en páginas de post: /posts/slug
  const pathMatch = window.location.pathname.match(/^\/posts\/([^/]+)\/?$/);
  if (!pathMatch) return;

  const slug = pathMatch[1];
  const container = document.getElementById('post-edit-container');
  if (!container) return;

  import('./auth').then(({ isEditor }) => {
    if (!isEditor()) return;

    // Evitar inyectar dos veces
    if (container.querySelector('a[data-post-edit]')) return;

    const link = document.createElement('a');
    link.href = `/admin/posts/${slug}`;
    link.dataset.postEdit = '1';
    link.setAttribute('aria-label', 'Editar post');
    link.className =
      'inline-flex items-center justify-center rounded-lg p-2 text-black/40 hover:text-[var(--primary)] hover:bg-black/5 dark:text-white/40 dark:hover:text-[var(--primary)] dark:hover:bg-white/10 transition-colors';
    link.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    `;
    link.title = 'Editar post';

    // Navegación directa para evitar Swup y cargar estilos correctamente
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.assign(link.href);
    });

    container.appendChild(link);
  });
}
