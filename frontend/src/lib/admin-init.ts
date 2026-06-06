/**
 * Inicialización del panel admin. Se llama al cargar páginas /admin/* para
 * mostrar elementos admin-only (sidebar, header) según el rol del usuario
 * y configurar event listeners (logout, sidebar). Se ejecuta tanto en carga
 * directa como tras transiciones Swup.
 */
import { getUser, isAdmin, logout } from './auth';
import { getOptimizedImageUrl } from './image-utils';
import { navigateTo } from './navigation';

let adminListenersAttached = false;
let adminHeaderUserMenuInitialized = false;

function setupAdminEventListeners(): void {
  if (adminListenersAttached) return;
  adminListenersAttached = true;

  document.addEventListener('click', (e) => {
    if (!window.location.pathname.startsWith('/admin')) return;

    const target = e.target as HTMLElement;

    if (target.closest('#logout-btn')) {
      e.preventDefault();
      const modal = document.getElementById('logout-modal');
      const userDropdown = document.getElementById('admin-header-user-dropdown');
      if (userDropdown) userDropdown.classList.add('hidden');
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

    // Cerrar menú de usuario del header al hacer click fuera
    const dropdown = document.getElementById('admin-header-user-dropdown');
    const userBtn = document.getElementById('admin-header-user-btn');
    if (dropdown && userBtn && !userBtn.contains(target) && !dropdown.contains(target)) {
      dropdown.classList.add('hidden');
    }
  });
}

export function initAdmin(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/admin')) return;

  adminHeaderUserMenuInitialized = false;
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
    const logsLink = document.getElementById('logs-link');
    if (goToSiteLink) goToSiteLink.classList.remove('hidden');
    if (servicesLink) servicesLink.classList.remove('hidden');
    if (backupLink) backupLink.classList.remove('hidden');
    if (logsLink) logsLink.classList.remove('hidden');
  }

  function getAvatarUrl(avatar: string | undefined): string {
    if (!avatar || avatar === '/default-avatar.svg') return '/default-avatar.svg';
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/uploads/')) return getOptimizedImageUrl(avatar, 150);
    return avatar;
  }

  if (currentUser) {
    const avatarEl = document.getElementById('admin-header-avatar') as HTMLImageElement | null;
    const nameEl = document.getElementById('admin-header-user-name');
    const emailEl = document.getElementById('admin-header-user-email');
    if (avatarEl) {
      avatarEl.src = getAvatarUrl(currentUser.avatar);
      avatarEl.alt = currentUser.name;
      avatarEl.onerror = function () {
        this.src = '/default-avatar.svg';
        this.onerror = null;
      };
    }
    if (nameEl) nameEl.textContent = currentUser.name;
    if (emailEl) emailEl.textContent = currentUser.email;
  }

  setupAdminHeaderUserMenu();
}

function setupAdminHeaderUserMenu(): void {
  const userBtn = document.getElementById('admin-header-user-btn');
  const dropdown = document.getElementById('admin-header-user-dropdown');
  const menuContainer = document.getElementById('admin-header-user-menu');

  if (!userBtn || !dropdown || !menuContainer) return;
  if (adminHeaderUserMenuInitialized) return;
  adminHeaderUserMenuInitialized = true;

  let hideTimeout: number | null = null;

  function cancelHide(): void {
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function showDropdown(): void {
    dropdown!.classList.remove('hidden');
  }

  function hideDropdown(): void {
    dropdown!.classList.add('hidden');
  }

  function scheduleHide(): void {
    cancelHide();
    hideTimeout = window.setTimeout(() => {
      hideDropdown();
      hideTimeout = null;
    }, 150);
  }

  userBtn.addEventListener('mouseenter', () => {
    cancelHide();
    showDropdown();
  });

  menuContainer.addEventListener('mouseenter', () => {
    cancelHide();
    showDropdown();
  });

  menuContainer.addEventListener('mouseleave', scheduleHide);

  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    cancelHide();
    if (dropdown.classList.contains('hidden')) {
      showDropdown();
    } else {
      hideDropdown();
    }
  });
}
