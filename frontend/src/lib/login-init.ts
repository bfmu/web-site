/**
 * Inicialización del formulario de login.
 * Carga los OAuth providers disponibles. Se llama en carga directa y tras navegación Swup.
 * Usa delegación de eventos para el form submit, así funciona aunque el script no se re-ejecute con Swup.
 */
import { login, loginWithGoogle, loginWithGithub } from './auth';
import { getBackendApiUrl } from './env';
import { navigateTo } from './navigation';

let loginFormDelegateAttached = false;

function getReturnUrl(): string {
  const returnUrl = sessionStorage.getItem('returnUrl');
  sessionStorage.removeItem('returnUrl');
  if (!returnUrl || returnUrl.includes('/admin/login') || returnUrl.includes('/admin/register') || returnUrl.includes('/auth/')) {
    return '/';
  }
  return returnUrl;
}

/**
 * Configura la delegación de eventos para el form de login.
 * Se ejecuta una vez desde Layout; funciona aunque la página login se cargue vía Swup.
 */
export function initLoginForm(): void {
  if (loginFormDelegateAttached) return;
  loginFormDelegateAttached = true;

  document.addEventListener('submit', async (e) => {
    const form = (e.target as HTMLElement).closest?.('#login-form');
    if (!form || !(form instanceof HTMLFormElement)) return;

    e.preventDefault();
    e.stopPropagation();

    const emailInput = form.querySelector<HTMLInputElement>('input[name="email"], #email');
    const passwordInput = form.querySelector<HTMLInputElement>('input[name="password"], #password');
    const submitBtn = form.querySelector<HTMLButtonElement>('#submit-btn');

    const email = emailInput?.value?.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      const { showError } = await import('./notifications');
      showError('Email y contraseña son requeridos');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      await login({ email, password });
      const { showInfo } = await import('./notifications');
      showInfo('Sesión iniciada correctamente');
      const dest = getReturnUrl();
      setTimeout(() => navigateTo(dest), 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      const { showError } = await import('./notifications');
      showError(msg);
      if (submitBtn) submitBtn.disabled = false;
      console.error('[login] Error:', err);
    }
  });
}

export async function loadOAuthProviders(): Promise<void> {
  const oauthButtons = document.getElementById('oauth-buttons');
  const oauthLoading = document.getElementById('oauth-loading');
  const oauthError = document.getElementById('oauth-error');

  if (!oauthButtons || !oauthLoading || !oauthError) return;

  try {
    const response = await fetch(`${getBackendApiUrl()}/settings/oauth/public/available`);
    if (!response.ok) throw new Error('Failed to fetch OAuth providers');

    const providers = await response.json();
    oauthLoading.classList.add('hidden');

    if (providers.google || providers.github) {
      renderOAuthButtons(providers, oauthButtons, oauthError);
    } else {
      oauthButtons.classList.add('hidden');
      oauthError.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading OAuth providers:', error);
    oauthLoading.classList.add('hidden');
    oauthButtons.classList.add('hidden');
    oauthError.textContent = 'Error al cargar opciones de login';
    oauthError.classList.remove('hidden');
    const { showError } = await import('./notifications');
    showError('Error al cargar opciones de login');
  }
}

function renderOAuthButtons(
  providers: { google?: boolean; github?: boolean },
  oauthButtons: HTMLElement,
  oauthError: HTMLElement
): void {
  oauthButtons.innerHTML = '';
  oauthButtons.classList.remove('hidden');
  oauthError.classList.add('hidden');
  let hasProviders = false;

  if (providers.google) {
    hasProviders = true;
    const googleBtn = document.createElement('button');
    googleBtn.type = 'button';
    googleBtn.className =
      'flex w-full items-center justify-center gap-3 rounded-md border border-[var(--line-divider)] dark:border-gray-600 bg-[var(--btn-regular-bg)] dark:bg-gray-800 px-4 py-2 text-sm font-medium text-[var(--btn-content)] dark:text-gray-200 shadow-sm transition-colors hover:bg-[var(--btn-regular-bg-hover)] dark:hover:bg-gray-700';
    googleBtn.innerHTML = `
      <svg class="h-5 w-5" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Google
    `;
    googleBtn.addEventListener('click', loginWithGoogle);
    oauthButtons.appendChild(googleBtn);
  }

  if (providers.github) {
    hasProviders = true;
    const githubBtn = document.createElement('button');
    githubBtn.type = 'button';
    githubBtn.className =
      'flex w-full items-center justify-center gap-3 rounded-md border border-[var(--line-divider)] dark:border-gray-600 bg-[var(--btn-regular-bg)] dark:bg-gray-800 px-4 py-2 text-sm font-medium text-[var(--btn-content)] dark:text-gray-200 shadow-sm transition-colors hover:bg-[var(--btn-regular-bg-hover)] dark:hover:bg-gray-700';
    githubBtn.innerHTML = `
      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/>
      </svg>
      GitHub
    `;
    githubBtn.addEventListener('click', loginWithGithub);
    oauthButtons.appendChild(githubBtn);
  }

  if (!hasProviders) {
    oauthButtons.classList.add('hidden');
    oauthError.classList.remove('hidden');
  }
}
