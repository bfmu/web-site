/**
 * Inicialización del panel admin. Se llama al cargar páginas /admin/* para
 * mostrar elementos admin-only (sidebar, header) según el rol del usuario
 * y configurar event listeners (logout, sidebar). Se ejecuta tanto en carga
 * directa como tras transiciones Swup.
 */
import { getUser, isAdmin, logout } from './auth';
import { getBackendResourceUrl } from './env';
import { navigateTo } from './navigation';

let adminListenersAttached = false;

function setupAdminEventListeners(): void {
  if (adminListenersAttached) return;
  adminListenersAttached = true;

  document.addEventListener('click', (e) => {
    if (!window.location.pathname.startsWith('/admin')) return;

    const target = e.target as HTMLElement;

    if (target.closest('#logout-btn')) {
      e.preventDefault();
      const modal = document.getElementById('logout-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
      return;
    }

    if (target.closest('#logout-cancel-btn')) {
      e.preventDefault();
      const modal = document.getElementById('logout-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      return;
    }

    if (target.closest('#logout-confirm-btn')) {
      e.preventDefault();
      const modal = document.getElementById('logout-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      (async () => {
        try {
          const { showInfo } = await import('./notifications');
          showInfo('Cerrando sesión...');
          await logout();
          setTimeout(() => navigateTo('/'), 800);
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
          try {
            const { showError } = await import('./notifications');
            showError('Error al cerrar sesión, pero se limpió la sesión local');
          } catch {
            // ignore
          }
          setTimeout(() => navigateTo('/'), 1500);
        }
      })();
      return;
    }

    if (target.closest('#sidebar-overlay')) {
      const sidebar = document.getElementById('admin-sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.add('-translate-x-full');
      if (overlay) {
        overlay.classList.add('opacity-0');
        overlay.style.setProperty('pointer-events', 'none');
      }
      return;
    }

    if (target.closest('#sidebar-toggle')) {
      e.preventDefault();
      const sidebar = document.getElementById('admin-sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) {
        if (sidebar.classList.contains('-translate-x-full')) {
          sidebar.classList.remove('-translate-x-full');
          if (overlay) {
            overlay.classList.remove('opacity-0');
            overlay.style.setProperty('pointer-events', 'auto');
          }
        } else {
          sidebar.classList.add('-translate-x-full');
          if (overlay) {
            overlay.classList.add('opacity-0');
            overlay.style.setProperty('pointer-events', 'none');
          }
        }
      }
      return;
    }

    if (target.closest('#admin-sidebar a') && window.innerWidth < 1024) {
      const sidebar = document.getElementById('admin-sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.add('-translate-x-full');
      if (overlay) {
        overlay.classList.add('opacity-0');
        overlay.style.setProperty('pointer-events', 'none');
      }
    }

    if (target.id === 'logout-modal') {
      const modal = document.getElementById('logout-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }
  });
}

export function initAdmin(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/admin')) return;

  setupAdminEventListeners();

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
