declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: {
      createController: (
        element: HTMLElement,
        options: { uri: string; width?: number; height?: number },
        callback: (EmbedController: SpotifyEmbedController) => void,
      ) => void
    }) => void
  }
}

export interface SpotifyEmbedController {
  loadUri: (uri: string, preferVideo?: boolean, startAt?: number) => void
  play: () => void
  pause: () => void
  resume: () => void
  togglePlay: () => void
  seek: (seconds: number) => void
  addListener: (
    event: string,
    cb: (e: {
      data?: { isPaused?: boolean; position?: number; duration?: number }
    }) => void,
  ) => void
  destroy?: () => void
}

const SPOTIFY_SCRIPT_ID = 'spotify-iframe-api'

// Compartido entre PersistentPlayer (reproductor de la página) e InstagramModal
// (canción anclada a una foto) — ambos necesitan la misma Spotify IFrame API.
// Cacheamos la promesa (no solo el resultado) a nivel de módulo: si los dos
// consumidores la llaman casi al mismo tiempo (típico al abrir una foto con
// canción justo después de que la página cargó), antes cada uno re-leía el
// DOM/window por su cuenta y podía terminar creando un <script> duplicado
// — el SDK de Spotify detecta el duplicado, loguea "already initialized" y
// NO vuelve a disparar onSpotifyIframeApiReady, dejando esa segunda promesa
// colgada para siempre. Memorizando la promesa, el segundo llamador reusa
// exactamente la misma en vez de recrear el race.
let scriptPromise: Promise<any> | null = null

export function loadSpotifyScript(): Promise<
  typeof window extends { onSpotifyIframeApiReady?: (api: infer A) => void }
    ? A
    : never
> {
  if (scriptPromise) return scriptPromise as any

  scriptPromise = new Promise(resolve => {
    const cachedApi = (window as any).__spotifyIframeApi
    if (cachedApi) {
      resolve(cachedApi)
      return
    }
    const prev = window.onSpotifyIframeApiReady
    window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
      ;(window as any).__spotifyIframeApi = IFrameAPI
      prev?.(IFrameAPI)
      resolve(IFrameAPI)
    }
    if (document.getElementById(SPOTIFY_SCRIPT_ID)) return
    const script = document.createElement('script')
    script.id = SPOTIFY_SCRIPT_ID
    script.src = 'https://open.spotify.com/embed/iframe-api/v1'
    script.async = true
    document.body.appendChild(script)
  })

  return scriptPromise
}
