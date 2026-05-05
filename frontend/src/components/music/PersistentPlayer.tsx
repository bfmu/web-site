import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const DRAG_THRESHOLD_PX = 5;
const SAVE_POSITION_DEBOUNCE_MS = 1500;

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function PersistentPlayer() {
  const { trackId, trackInfo, isPlaying, isVisible, playerPosition, setPlayerPosition, setController, setPlaying, togglePlaying, savePosition, close } =
    usePlayerStore();
  const embedWrapperRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const ignorePlaybackStateUntil = useRef(0);
  const dragRef = useRef<{ active: boolean; pending: boolean; startX: number; startY: number; startLeft: number; startTop: number; pointerId: number | null }>({ active: false, pending: false, startX: 0, startY: 0, startLeft: 0, startTop: 0, pointerId: null });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const savePositionDebounced = useMemo(
    () => debounce((tid: string, pos: number) => savePosition(tid, pos), SAVE_POSITION_DEBOUNCE_MS),
    [savePosition]
  );

  // Mostrar posición guardada al rehidratar mientras llega el primer playback_update
  const savedPositions = usePlayerStore((s) => s.savedPositions);
  const savedPos = trackId ? (savedPositions[trackId] ?? 0) : 0;
  const hasInitializedPosition = useRef(false);
  useEffect(() => {
    if (trackId && savedPos > 0 && !hasInitializedPosition.current) {
      hasInitializedPosition.current = true;
      setPosition(savedPos);
    }
    if (!trackId) hasInitializedPosition.current = false;
  }, [trackId, savedPos]);

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
            loadUri: (u: string, startAt?: number) => {
              if (startAt != null && startAt > 0) {
                EmbedController.loadUri(u, false, startAt);
              } else {
                EmbedController.loadUri(u);
              }
            },
            play: () => EmbedController.play(),
            pause: () => EmbedController.pause(),
            togglePlay: () => EmbedController.togglePlay(),
            seek: (s: number) => EmbedController.seek(s),
          };
          setController(ctrlForStore);

          // Rehidratar: cargar pista donde iba usando startAt (evita reinicio al recargar)
          const { trackId: persistedTrackId, savedPositions, isPlaying: wasPlaying } = usePlayerStore.getState();
          if (persistedTrackId) {
            const uri = `spotify:track:${persistedTrackId}`;
            const savedPos = savedPositions[persistedTrackId] ?? 0;
            const startAt = savedPos > 0 ? Math.floor(savedPos / 1000) : undefined;
            ctrlForStore.loadUri(uri, startAt);
            if (wasPlaying) EmbedController.play();
          }

          EmbedController.addListener("playback_started", () => {
            // Ignorar eventos de Spotify por 4s tras iniciar pista (evita falsos isPaused)
            ignorePlaybackStateUntil.current = Date.now() + 4000;
            setPlaying(true);
          });

          EmbedController.addListener("playback_update", (e) => {
            const { trackId: tid } = usePlayerStore.getState();
            const playingUri = (e.data as { playingURI?: string })?.playingURI;
            const isOurTrack = !tid || !playingUri || playingUri === `spotify:track:${tid}`;
            if (isOurTrack && e.data?.isPaused !== undefined) {
              if (Date.now() > ignorePlaybackStateUntil.current) {
                setPlaying(!e.data.isPaused);
              }
            }
            if (e.data?.position !== undefined) {
              setPosition(e.data.position);
              if (tid) savePositionDebounced(tid, e.data.position);
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

  // No hacer seek al volver a la pestaña: la posición local (positionRef) queda desactualizada
  // cuando la pestaña está en segundo plano (playback_update deja de dispararse), y hacer
  // seek(pos) provoca un salto audible hacia atrás.

  const handleTogglePlay = () => {
    const ctrl = controllerRef.current;
    if (!ctrl || !isReady) return;
    const currentlyPlaying = usePlayerStore.getState().isPlaying;
    // Bloquear eventos de Spotify 2s para que no sobreescriban el estado del usuario
    ignorePlaybackStateUntil.current = Date.now() + 2000;
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
    const posMs = Math.floor(pct * duration);
    const seconds = Math.floor(posMs / 1000);
    ctrl.seek(seconds);
    setPosition(posMs);
    if (trackId) savePosition(trackId, posMs);
  };

  const handleClose = () => {
    controllerRef.current?.pause();
    close();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const container = playerContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const currentLeft = playerPosition?.x ?? rect.left;
    const currentTop = playerPosition?.y ?? rect.top;
    dragRef.current = {
      active: false,
      pending: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: currentLeft,
      startTop: currentTop,
      pointerId: e.pointerId,
    };
  };

  const releaseDragState = () => {
    const { pointerId, active } = dragRef.current;
    const container = playerContainerRef.current;
    dragRef.current.active = false;
    dragRef.current.pending = false;
    dragRef.current.pointerId = null;
    setIsDragging(false);
    if (active && container && pointerId != null) {
      try {
        container.releasePointerCapture(pointerId);
      } catch {
        /* ignorar si ya se liberó */
      }
    }
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const { active, pending, startX, startY, startLeft, startTop, pointerId } = dragRef.current;
      const container = playerContainerRef.current;
      if (!container) return;

      if (pending) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= DRAG_THRESHOLD_PX) {
          dragRef.current.active = true;
          dragRef.current.pending = false;
          setIsDragging(true);
          try {
            container.setPointerCapture(pointerId ?? e.pointerId);
          } catch {
            /* fallback si pointerId es null */
          }
        } else {
          return;
        }
      }

      if (!dragRef.current.active) return;
      const rect = container.getBoundingClientRect();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = clamp(0, dragRef.current.startLeft + dx, window.innerWidth - rect.width);
      const newY = clamp(0, dragRef.current.startTop + dy, window.innerHeight - rect.height);
      setPlayerPosition(newX, newY);
    };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", releaseDragState);
    document.addEventListener("pointercancel", releaseDragState);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && (dragRef.current.active || dragRef.current.pending)) {
        releaseDragState();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleWindowBlur = () => {
      if (dragRef.current.active || dragRef.current.pending) {
        releaseDragState();
      }
    };
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", releaseDragState);
      document.removeEventListener("pointercancel", releaseDragState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [setPlayerPosition]);

  // Ajustar posición cuando se expande para que no quede fuera del viewport
  useLayoutEffect(() => {
    if (isCollapsed) return;
    const container = playerContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const margin = 16;
    let left = rect.left;
    let top = rect.top;
    if (left < margin) left = margin;
    if (top < margin) top = margin;
    if (left + rect.width > window.innerWidth - margin) left = window.innerWidth - rect.width - margin;
    if (top + rect.height > window.innerHeight - margin) top = window.innerHeight - rect.height - margin;
    if (left !== rect.left || top !== rect.top) {
      setPlayerPosition(left, top);
    }
  }, [isCollapsed, setPlayerPosition]);

  const positionStyle: React.CSSProperties = playerPosition
    ? { left: playerPosition.x, top: playerPosition.y }
    : { right: 16, bottom: 16 };

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
          ref={playerContainerRef}
          className={`fixed z-40 ${isCollapsed ? "w-fit" : "w-[min(calc(100vw-2rem),36rem)]"}`}
          style={positionStyle}
          role="region"
          aria-label="Reproductor de música"
        >
          <div
            className={`flex items-center rounded-2xl border border-white/10 bg-[var(--card-bg)] px-2 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-[var(--card-bg)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] sm:px-3 md:px-4 ${isCollapsed ? "w-fit gap-2 sm:gap-3 md:gap-4" : "w-full justify-between gap-2"} ${isDragging ? "cursor-grabbing" : "cursor-default"}`}
          >
            {/* Handle de arrastre - hover muestra cursor de manita para arrastrar */}
            <div
              data-player-drag-handle
              onPointerDown={handlePointerDown}
              className={`flex shrink-0 touch-none select-none items-center justify-center rounded p-1 cursor-grab active:cursor-grabbing text-[var(--meta-divider)] hover:text-[var(--primary)] dark:text-gray-400 dark:hover:text-neutral-50 ${isDragging ? "!cursor-grabbing" : ""}`}
              aria-label="Arrastrar reproductor"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <circle cx="9" cy="6" r="1.5" />
                <circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" />
                <circle cx="15" cy="18" r="1.5" />
              </svg>
            </div>
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
