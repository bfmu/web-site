/**
 * Inicialización del Dashboard (resumen de analytics de 7 días). Se llama al cargar
 * /admin tanto en carga directa como tras transiciones Swup (content:replace) — un
 * <script> inline dentro del .astro NO se re-ejecuta en content:replace.
 */
import { getAnalyticsStats } from './admin-api';

export async function initDashboardPage(): Promise<void> {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname.replace(/\/$/, '');
  if (path !== '/admin') return;

  const cardsEl = document.getElementById('analytics-summary-cards');
  if (!cardsEl) return;

  try {
    const data = await getAnalyticsStats(7);

    cardsEl.innerHTML = `
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total visitas</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${data.totalPageViews.toLocaleString()}</p>
          </div>
          <div class="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/20"><span class="text-2xl">📊</span></div>
        </div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Visitantes únicos (7d)</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${data.uniqueVisitors.toLocaleString()}</p>
          </div>
          <div class="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/20"><span class="text-2xl">👤</span></div>
        </div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Vistas hoy</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${data.viewsToday.toLocaleString()}</p>
          </div>
          <div class="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/20"><span class="text-2xl">📅</span></div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error loading analytics summary:', err);
    cardsEl.innerHTML = '<div class="col-span-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">Error al cargar analytics. Verifica que estés autenticado como admin.</div>';
  }
}
