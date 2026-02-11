import { getBackendApiUrl } from './env';

export interface HomepageSection {
  id: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
}

export interface HomepageConfigResponse {
  sections: HomepageSection[];
}

const HOMEPAGE_CONFIG_URL = `${getBackendApiUrl()}/homepage`;

/**
 * Obtiene la configuración de la página de inicio desde la API.
 * Si falla, retorna null para que el frontend use valores por defecto.
 */
export async function fetchHomepageConfig(): Promise<HomepageConfigResponse | null> {
  try {
    const res = await fetch(HOMEPAGE_CONFIG_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
