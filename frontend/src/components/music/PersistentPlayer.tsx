import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "./playerStore";

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: {
      createController: (
        element: HTMLElement,
        options: { uri: string; width?: number; height?: number },
        callback: (EmbedController: EmbedController) => void
      ) => void;
    }) => void;
  }
}

interface EmbedController {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  addListener: (event: string, cb: (e: { data?: { isPaused?: boolean; position?: number; duration?: number } }) => void) => void;
  destroy?: () => void;
}

const SPOTIFY_SCRIPT_ID = "spotify-iframe-api";
const DEFAULT_URI = "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"; // placeholder para pre-cargar

function loadSpotifyScript(): Promise<typeof window extends { onSpotifyIframeApiReady?: (api: infer A) => void } ? A : never> {
  return new Promise((resolve) => {
    if (document.getElementById(SPOTIFY_SCRIPT_ID)) {
      if (window.onSpotifyIframeApiReady) {
        const api = (window as any).__spotifyIframeApi;
        if (api) resolve(api);
        else {
          const orig = window.onSpotifyIframeApiReady;
          window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
            (window as any).__spotifyIframeApi = IFrameAPI;
            orig?.(IFrameAPI);
            resolve(IFrameAPI);
          };
        }
      }
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

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PersistentPlayer() {
  const { trackId, trackInfo, isPlaying, isVisible, setController, setPlaying, togglePlaying, savePosition, close } =
    usePlayerStore();
  const embedWrapperRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const lastPlaybackStartedAt = useRef(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Crear controlador UNA VEZ al montar (con track placeholder) para tenerlo listo
  // antes del primer clic del usuario → play() puede ejecutarse en contexto de gesto
  useEffect(() => {
    const wrapper = embedWrapperRef.current;
    if (!wrapper) return;

    let mounted = true;
    const target = document.createElement("div");
    wrapper.appendChild(target);

    loadSpotifyScript().then((IFrameAPI) => {
      if (!mounted || !embedWrapperRef.current) return;

      IFrameAPI.createController(
        target,
        { uri: DEFAULT_URI, width: 300, height: 80 },
        (EmbedController) => {
          if (!mounted) return;
          controllerRef.current = EmbedController;

          const ctrlForStore = {
            loadUri: (u: string) => EmbedController.loadUri(u),
            play: () => EmbedController.play(),
            pause: () => EmbedController.pause(),
            togglePlay: () => EmbedController.togglePlay(),
            seek: (s: number) => EmbedController.seek(s),
          };
          setController(ctrlForStore);

          EmbedController.addListener("playback_started", () => {
            lastPlaybackStartedAt.current = Date.now();
            setPlaying(true);
          });

          EmbedController.addListener("playback_update", (e) => {
            const { trackId: tid } = usePlayerStore.getState();
            const playingUri = (e.data as { playingURI?: string })?.playingURI;
            const isOurTrack = !tid || !playingUri || playingUri === `spotify:track:${tid}`;
            if (isOurTrack && e.data?.isPaused !== undefined) {
              const recentlyStarted = Date.now() - lastPlaybackStartedAt.current < 4000;
              // Ignorar isPaused: true en los ~4s tras playback_started (Spotify envía valores erróneos)
              if (!e.data.isPaused || !recentlyStarted) {
                setPlaying(!e.data.isPaused);
              }
            }
            if (e.data?.position !== undefined) {
              setPosition(e.data.position);
              if (tid) savePosition(tid, e.data.position);
            }
            if (e.data?.duration !== undefined) setDuration(e.data.duration);
            setIsReady(true);
          });

          EmbedController.addListener("ready", () => setIsReady(true));
        }
      );
    });

    return () => {
      mounted = false;
      setIsReady(false);
      setController(null);
      const ctrl = controllerRef.current;
      if (ctrl?.destroy) ctrl.destroy();
      controllerRef.current = null;
      wrapper.innerHTML = "";
    };
  }, [setController, setPlaying, savePosition]);

  const handleTogglePlay = () => {
    const ctrl = controllerRef.current;
    if (!ctrl || !isReady) return;
    const currentlyPlaying = usePlayerStore.getState().isPlaying;
    if (currentlyPlaying) {
      ctrl.pause();
    } else {
      ctrl.resume();
    }
    togglePlaying();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const ctrl = controllerRef.current;
    if (!ctrl || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const seconds = Math.floor((pct * duration) / 1000);
    ctrl.seek(seconds);
    setPosition(seconds * 1000);
  };

  const handleClose = () => {
    // No destruir el controlador: lo reutilizamos para la siguiente canción
    close();
  };

  return (
    <>
      {/* Embed siempre en DOM para tener controlador listo antes del primer clic */}
      <div
        ref={embedWrapperRef}
        className="absolute bottom-0 left-0 h-0 w-0 overflow-hidden opacity-0"
        aria-hidden="true"
      />
      {isVisible && trackId && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-2 md:px-4 md:pb-4"
          role="region"
          aria-label="Reproductor de música"
        >
          <div
            className={`mx-auto flex max-w-[var(--page-width)] items-center rounded-2xl border border-white/10 bg-[var(--card-bg)] px-2 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-[var(--card-bg)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] sm:px-3 md:px-4 ${isCollapsed ? "w-fit gap-2 sm:gap-3 md:gap-4" : "w-full justify-between gap-2"}`}
          >
            {isCollapsed ? (
              <>
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  disabled={!isReady}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--btn-regular-bg)] text-[var(--primary)] transition hover:scale-105 hover:bg-[var(--btn-regular-bg-hover)] disabled:cursor-not-allowed disabled:opacity-70 dark:text-neutral-50"
                  aria-label={isPlaying ? "Pausar" : "Reproducir"}
                >
                  {isPlaying ? (
                    <span className="flex h-6 w-5 items-end justify-center gap-0.5" aria-hidden>
                      <span className="player-bar w-0.5 rounded-full bg-current [animation-delay:0ms]" />
                      <span className="player-bar w-0.5 rounded-full bg-current [animation-delay:150ms]" />
                      <span className="player-bar w-0.5 rounded-full bg-current [animation-delay:300ms]" />
                      <span className="player-bar w-0.5 rounded-full bg-current [animation-delay:450ms]" />
                    </span>
                  ) : (
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--btn-regular-bg)] text-[var(--primary)] transition hover:bg-[var(--btn-regular-bg-hover)] dark:text-neutral-50"
                  aria-label="Expandir reproductor"
                >
                  <svg className="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--btn-regular-bg)] text-[var(--primary)] transition hover:bg-[var(--btn-regular-bg-hover)] dark:text-neutral-50"
                  aria-label="Cerrar reproductor"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* Izquierda: imagen + título + autor */}
                <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
                  {trackInfo?.coverUrl && (
                    <img
                      src={trackInfo.coverUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-md object-cover shadow-sm md:h-12 md:w-12"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--deep-text)] dark:text-neutral-50 md:text-sm">
                      {trackInfo?.name ?? "Cargando…"}
                    </p>
                    <p className="truncate text-[10px] text-[var(--meta-divider)] dark:text-gray-400 md:text-xs">
                      {trackInfo?.artist ?? ""}
                    </p>
                  </div>
                </div>

                {/* Centro: barra de tiempo */}
                {duration > 0 ? (
                  <div className="flex min-w-[80px] flex-1 flex-col justify-center gap-0.5 px-2 sm:min-w-[120px] sm:gap-1 sm:px-4 md:min-w-[160px] md:gap-1.5 md:px-6">
                    <div
                      role="slider"
                      aria-label="Posición en la pista"
                      aria-valuemin={0}
                      aria-valuemax={duration}
                      aria-valuenow={position}
                      tabIndex={0}
                      className="group h-1.5 w-full cursor-pointer rounded-full bg-[var(--btn-regular-bg)] shadow-inner transition hover:h-2 md:h-2 md:hover:h-2.5 dark:bg-black/20"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--primary)] shadow-sm transition-[width] duration-100 ease-linear dark:bg-neutral-400"
                        style={{ width: `${(position / duration) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-medium tabular-nums text-[var(--meta-divider)] dark:text-gray-400 sm:text-xs">
                      <span>{formatTime(position)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-[80px] flex-1 sm:min-w-[120px] md:min-w-[160px]" />
                )}

                {/* Derecha: controles */}
                <div className="flex shrink-0 items-center gap-1 md:gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    disabled={!isReady}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--btn-regular-bg)] text-[var(--primary)] transition hover:bg-[var(--btn-regular-bg-hover)] disabled:cursor-not-allowed disabled:opacity-70 dark:text-neutral-50 sm:h-9 sm:w-9 md:h-10 md:w-10"
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}
                  >
                    {isPlaying ? (
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <a
                    href="/music"
                    className="flex h-8 shrink-0 items-center justify-center rounded-full bg-[var(--btn-regular-bg)] px-2.5 text-xs font-medium text-[var(--primary)] transition hover:bg-[var(--btn-regular-bg-hover)] dark:text-neutral-50 sm:h-9 sm:px-3 sm:text-sm md:h-10 md:px-4"
                  >
                    Ir a Música
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsCollapsed(true)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--btn-regular-bg)] text-[var(--primary)] transition hover:bg-[var(--btn-regular-bg-hover)] dark:text-neutral-50 sm:h-9 sm:w-9 md:h-10 md:w-10"
                    aria-label="Minimizar reproductor"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--btn-regular-bg)] text-[var(--primary)] transition hover:bg-[var(--btn-regular-bg-hover)] dark:text-neutral-50 sm:h-9 sm:w-9 md:h-10 md:w-10"
                    aria-label="Cerrar reproductor"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
