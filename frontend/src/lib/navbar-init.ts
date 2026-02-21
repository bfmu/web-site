/**
 * Inicialización del Navbar. Se llama tras transiciones Swup (content:replace)
 * cuando el Navbar está en el DOM. No se ejecuta en páginas auth (login/register)
 * que tienen una barra mínima sin el Navbar completo.
 */
import { getOptimizedImageUrl } from './image-utils';

let userMenuInitialized = false;
let storageListenerAttached = false;

function switchTheme(): void {
  if (localStorage.theme === 'dark') {
    document.documentElement.classList.remove('dark');
    localStorage.theme = 'light';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.theme = 'dark';
  }
}

function loadButtonScript(): void {
  const switchBtn = document.getElementById('scheme-switch');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => switchTheme());
  }

  const settingBtn = document.getElementById('display-settings-switch');
  if (settingBtn) {
    settingBtn.addEventListener('click', () => {
      const settingPanel = document.getElementById('display-setting');
      if (settingPanel) {
        settingPanel.classList.toggle('float-panel-closed');
      }
    });
  }

  const menuBtn = document.getElementById('nav-menu-switch');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const menuPanel = document.getElementById('nav-menu-panel');
      if (menuPanel) {
        menuPanel.classList.toggle('float-panel-closed');
      }
    });
  }
}

function updateAdminButton(): void {
  const adminBtn = document.getElementById('admin-login-btn') as HTMLAnchorElement | null;
  const userMenu = document.getElementById('admin-user-menu') as HTMLDivElement | null;
  const userAvatar = document.getElementById('admin-user-avatar') as HTMLImageElement | null;

  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);

      if (adminBtn) adminBtn.classList.add('hidden');
      if (userMenu) userMenu.classList.remove('hidden');

      const dashboardLink = document.getElementById('admin-dashboard-link');
      const dashboardDivider = document.getElementById('admin-dashboard-divider');
      if (user.role !== 'admin') {
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (dashboardDivider) dashboardDivider.style.display = 'none';
      } else {
        if (dashboardLink) dashboardLink.style.display = '';
        if (dashboardDivider) dashboardDivider.style.display = '';
      }

      if (userAvatar) {
        let avatarUrl = user.avatar || '/default-avatar.svg';
        if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
          avatarUrl = getOptimizedImageUrl(avatarUrl, 150);
        } else if (!avatarUrl || avatarUrl === '/default-avatar.png' || avatarUrl === '/default-avatar.svg') {
          avatarUrl = '/default-avatar.svg';
        } else if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('/default-avatar')) {
          avatarUrl = getOptimizedImageUrl(avatarUrl, 150);
        }
        userAvatar.src = avatarUrl;
        userAvatar.onerror = function () {
          this.src = '/default-avatar.svg';
          this.onerror = null;
        };
      }

      userMenuInitialized = false;
      setTimeout(setupUserMenu, 100);
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  } else {
    if (adminBtn) adminBtn.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
  }
}

function showUserMenu(): void {
  const dropdown = document.getElementById('admin-user-dropdown');
  if (dropdown) {
    dropdown.classList.remove('float-panel-closed');
  }
}

function hideUserMenu(): void {
  const dropdown = document.getElementById('admin-user-dropdown');
  if (dropdown) {
    dropdown.classList.add('float-panel-closed');
  }
}

function setupUserMenu(): void {
  const userBtn = document.getElementById('admin-user-btn');
  const dropdown = document.getElementById('admin-user-dropdown');
  const logoutBtn = document.getElementById('logout-menu-btn');
  const menuContainer = document.getElementById('admin-user-menu');

  if (!userBtn || !dropdown || !menuContainer) {
    if (!userMenuInitialized) {
      setTimeout(setupUserMenu, 100);
    }
    return;
  }

  if (userMenuInitialized) return;
  userMenuInitialized = true;

  let hideTimeout: number | null = null;

  function cancelHide(): void {
    if (hideTimeout !== null) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function scheduleHide(): void {
    cancelHide();
    hideTimeout = window.setTimeout(() => {
      hideUserMenu();
      hideTimeout = null;
    }, 150);
  }

  userBtn.addEventListener('mouseenter', () => {
    cancelHide();
    showUserMenu();
  });

  menuContainer.addEventListener('mouseenter', () => {
    cancelHide();
    showUserMenu();
  });

  menuContainer.addEventListener('mouseleave', scheduleHide);

  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    cancelHide();
    if (dropdown.classList.contains('float-panel-closed')) {
      showUserMenu();
    } else {
      hideUserMenu();
    }
  });

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    if (userBtn && dropdown && !userBtn.contains(target) && !dropdown.contains(target)) {
      cancelHide();
      hideUserMenu();
    }
  };

  document.addEventListener('click', handleClickOutside);

  const navbarLogoutModal = document.getElementById('navbar-logout-modal');
  const navbarLogoutConfirmBtn = document.getElementById('navbar-logout-confirm-btn');
  const navbarLogoutCancelBtn = document.getElementById('navbar-logout-cancel-btn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (navbarLogoutModal) {
        navbarLogoutModal.classList.remove('hidden');
        navbarLogoutModal.classList.add('flex');
      }
    });
  }

  navbarLogoutCancelBtn?.addEventListener('click', () => {
    if (navbarLogoutModal) {
      navbarLogoutModal.classList.add('hidden');
      navbarLogoutModal.classList.remove('flex');
    }
  });

  navbarLogoutConfirmBtn?.addEventListener('click', async () => {
    if (navbarLogoutModal) {
      navbarLogoutModal.classList.add('hidden');
      navbarLogoutModal.classList.remove('flex');
    }

    try {
      const { showInfo } = await import('./notifications');
      showInfo('Cerrando sesión...');
      const { logout } = await import('./auth');
      await logout();
      const { navigateTo } = await import('./navigation');
      setTimeout(() => navigateTo('/'), 800);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      try {
        const { showError } = await import('./notifications');
        showError('Error al cerrar sesión, pero se limpió la sesión local');
      } catch {
        // ignore
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      const { navigateTo } = await import('./navigation');
      setTimeout(() => navigateTo('/'), 1500);
    }
  });

  navbarLogoutModal?.addEventListener('click', (e) => {
    if (e.target === navbarLogoutModal) {
      navbarLogoutModal.classList.add('hidden');
      navbarLogoutModal.classList.remove('flex');
    }
  });
}

function hideAdminLinksInIframe(): void {
  if (window.self !== window.top) {
    const adminMenu = document.getElementById('admin-user-menu');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    if (adminMenu) adminMenu.style.display = 'none';
    if (adminLoginBtn) adminLoginBtn.style.display = 'none';
  }
}

export function initNavbar(): void {
  if (typeof window === 'undefined') return;

  // Páginas auth (login/register) no tienen el Navbar completo
  const path = window.location.pathname.replace(/\/$/, '');
  if (path.endsWith('/admin/login') || path.endsWith('/admin/register')) {
    return;
  }

  // Si no existe el navbar, no hacer nada
  if (!document.getElementById('navbar')) return;

  userMenuInitialized = false;

  loadButtonScript();
  hideAdminLinksInIframe();
  updateAdminButton();

  const adminLoginBtn = document.getElementById('admin-login-btn') as HTMLAnchorElement | null;
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', () => {
      const currentUrl = window.location.pathname;
      if (!currentUrl.includes('/admin/login') && !currentUrl.includes('/auth/')) {
        sessionStorage.setItem('returnUrl', currentUrl);
      }
    });
  }

  if (!storageListenerAttached) {
    storageListenerAttached = true;
    window.addEventListener('storage', () => {
      updateAdminButton();
      userMenuInitialized = false;
      setTimeout(setupUserMenu, 100);
    });
  }

  setTimeout(setupUserMenu, 100);
}
