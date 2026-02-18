import { getBackendApiUrl } from './env';

export interface NavBarLink {
  name: string;
  url: string;
  external?: boolean;
  openInNewTab?: boolean;
  children?: NavBarLink[];
}

export interface NavbarConfigResponse {
  links: NavBarLink[];
}

const NAVBAR_CONFIG_URL = `${getBackendApiUrl()}/navbar`;

/**
 * Obtiene la configuración del navbar desde la API.
 * Si falla o retorna links vacíos, el consumidor debe usar el fallback de config.ts.
 */
export async function fetchNavbarConfig(): Promise<NavbarConfigResponse | null> {
  try {
    const res = await fetch(NAVBAR_CONFIG_URL);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.links?.length) return null;
    return data;
  } catch {
    return null;
  }
}
