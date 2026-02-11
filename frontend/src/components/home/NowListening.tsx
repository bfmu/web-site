import React from 'react';
import { usePlayerStore } from '../music/playerStore';

export default function NowListening() {
  const trackInfo = usePlayerStore((s) => s.trackInfo);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  if (!trackInfo) return null;

  return (
    <a
      href="/music/"
      className="flex items-center gap-4 rounded-[var(--radius-large)] bg-[var(--card-bg)] p-4 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        <img
          src={trackInfo.coverUrl}
          alt={trackInfo.name}
          className="h-full w-full object-cover"
        />
        {isPlaying && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs font-medium">
            ▶
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--deep-text)] dark:text-gray-400">
          Ahora escuchando
        </p>
        <p className="truncate font-semibold text-[var(--primary)] dark:text-[var(--title-active)]">
          {trackInfo.name}
        </p>
        <p className="truncate text-sm text-[var(--deep-text)] dark:text-gray-400">
          {trackInfo.artist}
        </p>
      </div>
      <span className="shrink-0 text-[var(--primary)]">→</span>
    </a>
  );
}
