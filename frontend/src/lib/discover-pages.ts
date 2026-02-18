import I18nKey from '@i18n/i18nKey';

export interface DiscoveredPage {
  path: string;
  i18nKey: I18nKey | null;
  suggestedName: string;
}

/**
 * Mapeo de rutas conocidas a claves i18n
 */
const ROUTE_TO_I18N: Record<string, I18nKey> = {
  '/': I18nKey.home,
  '/gallery': I18nKey.gallery,
  '/gallery/': I18nKey.gallery,
  '/blogs': I18nKey.blog,
  '/blogs/': I18nKey.blog,
  '/music': I18nKey.music,
  '/music/': I18nKey.music,
  '/about': I18nKey.about,
  '/about/': I18nKey.about,
  '/archive': I18nKey.archive,
  '/archive/': I18nKey.archive,
};

/**
 * Escanea las páginas del frontend usando import.meta.glob.
 * Excluye admin, auth, 404, test y rutas dinámicas.
 */
export function discoverPages(): DiscoveredPage[] {
  const glob = import.meta.glob('../pages/**/*.astro', { eager: false });
  const paths = Object.keys(glob);
  const seen = new Set<string>();
  const result: DiscoveredPage[] = [];

  for (const filePath of paths) {
    if (
      filePath.includes('/admin/') ||
      filePath.includes('/auth/') ||
      filePath.includes('404.astro') ||
      filePath.includes('/test/') ||
      filePath.includes('[') // rutas dinámicas
    ) {
      continue;
    }

    const match = filePath.match(/pages\/(.+?)\.astro$/);
    if (!match) continue;

    let base = match[1].replace(/\/index$/, '').replace(/^index$/, '');
    let routePath = base ? '/' + base + '/' : '/';
    if (routePath === '//') routePath = '/';

    if (seen.has(routePath)) continue;
    seen.add(routePath);

    const i18nKey = ROUTE_TO_I18N[routePath] ?? ROUTE_TO_I18N[routePath.replace(/\/$/, '')] ?? null;
    const suggestedName = i18nKey ? routePath : routePath.replace(/^\//, '').replace(/\/$/, '') || 'Inicio';
    result.push({
      path: routePath,
      i18nKey,
      suggestedName,
    });
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}
