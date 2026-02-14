/**
 * Inicialización del panel admin. Se llama al cargar páginas /admin/* para
 * mostrar elementos admin-only (sidebar, header) según el rol del usuario.
 * Se ejecuta tanto en carga directa como tras transiciones Swup.
 */
import { getUser, isAdmin } from './auth';
import { getBackendResourceUrl } from './env';

export function initAdmin(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/admin')) return;

  const currentUser = getUser();
  const userIsAdmin = currentUser && isAdmin();
  const userIsEditor = currentUser && currentUser.role === 'editor';
  const hasAdminAccess = userIsAdmin || userIsEditor;

  if (hasAdminAccess) {
    const adminElements = document.querySelectorAll('[data-admin-only="true"]');
    adminElements.forEach((element) => {
      element.classList.remove('hidden');
    });
  }

  if (userIsAdmin) {
    const goToSiteLink = document.getElementById('go-to-site-link');
    const servicesLink = document.getElementById('services-link');
    const backupLink = document.getElementById('backup-link');
    if (goToSiteLink) goToSiteLink.classList.remove('hidden');
    if (servicesLink) servicesLink.classList.remove('hidden');
    if (backupLink) backupLink.classList.remove('hidden');
  }

  const userInfo = document.getElementById('user-info');
  if (currentUser && userInfo) {
    function getAvatarUrl(avatar: string | undefined): string {
      if (!avatar || avatar === '/default-avatar.svg') return '/default-avatar.svg';
      if (avatar.startsWith('http')) return avatar;
      if (avatar.startsWith('/uploads/')) return getBackendResourceUrl(avatar);
      return avatar;
    }
    const avatarUrl = getAvatarUrl(currentUser.avatar);
    userInfo.innerHTML = `
      <img 
        src="${avatarUrl}" 
        alt="${currentUser.name}" 
        class="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
        onerror="this.src='/default-avatar.svg'"
      />
      <div class="flex-1 min-w-0">
        <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
          ${currentUser.name}
        </p>
        <p class="truncate text-xs text-gray-500 dark:text-gray-400">
          ${currentUser.email}
        </p>
      </div>
    `;
  }
}
