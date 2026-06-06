import { create, type StoreApi, type UseBoundStore } from "zustand";
import { persist } from "zustand/middleware";

export interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  spotifyUrl?: string;
}

export interface SpotifyController {
  /** Carga una pista. startAt opcional (segundos) para reanudar donde iba. */
  loadUri: (uri: string, startAtSeconds?: number) => void;
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

export const usePlayerStore: UseBoundStore<StoreApi<PlayerState>> = create<PlayerState>()(
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
        if (controller) {
          const uri = `spotify:track:${trackId}`;
          const savedPos = savedPositions[trackId];
          const startAt = savedPos > 0 ? Math.floor(savedPos / 1000) : undefined;
          controller.loadUri(uri, startAt);
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
        isPlaying: s.isPlaying,
        playerPosition: s.playerPosition,
        savedPositions: s.savedPositions,
      }),
    }
  )
);
