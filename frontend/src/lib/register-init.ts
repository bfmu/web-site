/**
 * Inicialización de la página de Registro. Se llama al cargar /admin/register tanto
 * en carga directa como tras transiciones Swup (content:replace).
 */
import { register, isAuthenticated } from './auth';

let registerListenersAttached = false;

function getReturnUrl(): string {
  const returnUrl = sessionStorage.getItem('returnUrl');
  sessionStorage.removeItem('returnUrl');

  if (!returnUrl || returnUrl.includes('/admin/login') || returnUrl.includes('/admin/register') || returnUrl.includes('/auth/')) {
    return '/';
  }

  return returnUrl;
}

export function initRegisterPage(): void {
  if (typeof window === 'undefined') return;
  const isRegisterPage = window.location.pathname.replace(/\/$/, '').endsWith('/admin/register');
  if (!isRegisterPage) {
    registerListenersAttached = false;
    return;
  }

  if (isAuthenticated()) {
    window.location.href = getReturnUrl();
    return;
  }

  const form = document.getElementById('register-form') as HTMLFormElement;
  if (!form) return;

  if (registerListenersAttached) return;
  registerListenersAttached = true;

  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = (document.getElementById('name') as HTMLInputElement).value.trim();
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const passwordConfirm = (document.getElementById('password-confirm') as HTMLInputElement).value;

    const { showError, showWarning } = await import('./notifications');

    if (password !== passwordConfirm) {
      showError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      showWarning('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      await register({ email, password, name });
      window.location.href = getReturnUrl();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Error al registrarse');
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
