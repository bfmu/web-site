import React, { useEffect, useState } from 'react';

interface Track {
  name: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  spotifyUrl: string | null;
}

interface NowPlayingData {
  playing: boolean;
  track: Track | null;
}

const POLL_INTERVAL = 30_000;

function getApiUrl(): string {
  const base =
    (import.meta as any).env?.PUBLIC_BACKEND_URL ||
    (import.meta as any).env?.BACKEND_URL ||
    'http://localhost:3000/';
  return `${base.replace(/\/$/, '')}/api/spotify/now-playing`;
}

export default function NowListening() {
  const [data, setData] = useState<NowPlayingData | null>(null);

  useEffect(() => {
    const url = getApiUrl();
    let cancelled = false;

    async function fetch_() {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json: NowPlayingData = await res.json();
        if (!cancelled) setData(json);
      } catch {}
    }

    fetch_();
    const id = setInterval(fetch_, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!data?.track) return null;

  const { track, playing } = data;

  return (
    <a
      href={track.spotifyUrl ?? '/music/'}
      target={track.spotifyUrl ? '_blank' : undefined}
      rel={track.spotifyUrl ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-4 rounded-[var(--radius-large)] bg-[var(--card-bg)] px-5 py-4 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
    >
      {track.coverUrl ? (
        <img
          src={track.coverUrl}
          alt={track.name}
          className="h-14 w-14 shrink-0 rounded-lg object-cover shadow"
        />
      ) : (
        <div className="h-14 w-14 shrink-0 rounded-lg bg-[var(--btn-regular-bg)] flex items-center justify-center text-2xl">
          🎵
        </div>
      )}

      <div className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--deep-text)] opacity-70">
          {playing ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Escuchando ahora
            </>
          ) : (
            'Última canción escuchada'
          )}
        </p>
        <p className="mt-0.5 truncate font-semibold text-[var(--primary)] dark:text-[var(--title-active)]">
          {track.name}
        </p>
        <p className="truncate text-sm text-[var(--deep-text)] dark:text-gray-400">
          {track.artist}
          {track.album ? ` · ${track.album}` : ''}
        </p>
      </div>

      <span className="shrink-0 text-[var(--primary)]">→</span>
    </a>
  );
}
