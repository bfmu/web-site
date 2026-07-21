declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: {
      createController: (
        element: HTMLElement,
        options: { uri: string; width?: number; height?: number },
        callback: (EmbedController: SpotifyEmbedController) => void
      ) => void;
    }) => void;
  }
}

export interface SpotifyEmbedController {
  loadUri: (uri: string, preferVideo?: boolean, startAt?: number) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  addListener: (event: string, cb: (e: { data?: { isPaused?: boolean; position?: number; duration?: number } }) => void) => void;
  destroy?: () => void;
}

const SPOTIFY_SCRIPT_ID = "spotify-iframe-api";

// Compartido entre PersistentPlayer (reproductor de la página) e InstagramModal
// (canción anclada a una foto) — ambos necesitan la misma Spotify IFrame API,
// cacheada globalmente para no cargar el script dos veces ni perder el evento
// onSpotifyIframeApiReady si un consumidor se monta antes que otro.
export function loadSpotifyScript(): Promise<typeof window extends { onSpotifyIframeApiReady?: (api: infer A) => void } ? A : never> {
  return new Promise((resolve) => {
    if (document.getElementById(SPOTIFY_SCRIPT_ID)) {
      const api = (window as any).__spotifyIframeApi;
      if (api) {
        resolve(api);
        return;
      }
      const orig = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
        (window as any).__spotifyIframeApi = IFrameAPI;
        orig?.(IFrameAPI);
        resolve(IFrameAPI);
      };
      return;
    }
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
      (window as any).__spotifyIframeApi = IFrameAPI;
      prev?.(IFrameAPI);
      resolve(IFrameAPI);
    };
    const script = document.createElement("script");
    script.id = SPOTIFY_SCRIPT_ID;
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.body.appendChild(script);
  });
}
