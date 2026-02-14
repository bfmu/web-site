import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  spotifyUrl?: string;
}

export interface SpotifyController {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
}

export interface PlayerPosition {
  x: number;
  y: number;
}

interface PlayerState {
  trackId: string | null;
  trackInfo: TrackInfo | null;
  isPlaying: boolean;
  isVisible: boolean;
  /** Posición del reproductor flotante (null = por defecto esquina inferior derecha) */
  playerPosition: PlayerPosition | null;
  /** Posición guardada por trackId (en ms) para reanudar donde iba */
  savedPositions: Record<string, number>;
  controller: SpotifyController | null;
  setController: (ctrl: SpotifyController | null) => void;
  setPlayerPosition: (x: number, y: number) => void;
  playTrack: (trackId: string, trackInfo?: TrackInfo | null) => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  savePosition: (trackId: string, positionMs: number) => void;
  close: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      trackId: null,
      trackInfo: null,
      isPlaying: false,
      isVisible: false,
      playerPosition: null,
      savedPositions: {},
      controller: null,

      setController: (controller) => set({ controller }),

      setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),

      playTrack: (trackId, trackInfo = null) => {
        const { controller, savedPositions } = get();
        set({
          trackId,
          trackInfo,
          isVisible: true,
          isPlaying: true,
        });
        // Llamar loadUri + play en el mismo tick que el clic del usuario
        // (contexto de gesto) para evitar bloqueo de autoplay del navegador
        if (controller) {
          const uri = `spotify:track:${trackId}`;
          controller.loadUri(uri);
          const savedPos = savedPositions[trackId];
          if (savedPos && savedPos > 0) {
            controller.seek(Math.floor(savedPos / 1000));
          }
          controller.play();
        }
      },

      setPlaying: (isPlaying) => set({ isPlaying }),

      /** Para evitar closure obsoleta; pasar true/false explícitamente */
      togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),

      savePosition: (trackId, positionMs) =>
        set((s) => ({
          savedPositions: { ...s.savedPositions, [trackId]: positionMs },
        })),

      close: () =>
        set({
          isVisible: false,
          trackId: null,
          trackInfo: null,
          isPlaying: false,
        }),
    }),
    {
      name: "music-player",
      partialize: (s) => ({
        trackId: s.trackId,
        trackInfo: s.trackInfo,
        isVisible: s.isVisible,
        playerPosition: s.playerPosition,
        savedPositions: s.savedPositions,
      }),
    }
  )
);
