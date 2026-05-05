import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../music/playerStore';

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

function getApiUrl(): string {
  const base = (import.meta as any).env?.PUBLIC_BACKEND_URL || 'http://localhost:3000/';
  return `${base.replace(/\/$/, '')}/api/spotify/now-playing`;
}

function extractTrackId(spotifyUrl: string): string | null {
  return spotifyUrl.match(/\/track\/([A-Za-z0-9]+)/)?.[1] ?? null;
}

/* RAF-based bar visualizer — heights updated via refs (zero re-renders) */
function VisualizerBars({ playing }: { playing: boolean }) {
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const heightsRef = useRef<number[]>([0.25, 0.55, 0.85, 0.4, 0.7, 0.35]);
  const rafRef = useRef<number>(0);

  const STATIC_H = [0.3, 0.6, 0.95, 0.5, 0.75, 0.4];

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      barRefs.current.forEach((bar, i) => {
        if (bar) bar.style.height = `${STATIC_H[i] * 20}px`;
      });
      return;
    }

    function animate() {
      heightsRef.current = heightsRef.current.map((h) => {
        const next = h + (Math.random() - 0.5) * 0.32;
        return Math.max(0.12, Math.min(1, next));
      });
      barRefs.current.forEach((bar, i) => {
        if (bar) bar.style.height = `${heightsRef.current[i] * 20}px`;
      });
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: '2px',
        height: '20px',
        flexShrink: 0,
      }}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          ref={(el) => { barRefs.current[i] = el; }}
          style={{
            display: 'block',
            width: '3px',
            height: `${STATIC_H[i] * 20}px`,
            borderRadius: '2px',
            background: playing ? '#06b6d4' : 'currentColor',
            opacity: playing ? 1 : 0.35,
            transition: playing ? 'none' : 'height 0.3s ease',
          }}
        />
      ))}
    </span>
  );
}

export default function SpotifyChip() {
  const [data, setData] = useState<NowPlayingData | null>(null);

  useEffect(() => {
    const url = getApiUrl();
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json: NowPlayingData = await res.json();
        if (!cancelled) setData(json);
      } catch {}
    }

    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (!data?.track) return null;

  const { track, playing } = data;

  const handleClick = () => {
    const trackId = track.spotifyUrl ? extractTrackId(track.spotifyUrl) : null;
    if (trackId) {
      usePlayerStore.getState().playTrack(trackId, {
        id: trackId,
        name: track.name,
        artist: track.artist,
        coverUrl: track.coverUrl ?? '',
        spotifyUrl: track.spotifyUrl ?? undefined,
      });
    } else {
      window.location.href = '/music/';
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.6rem 0.85rem',
        borderRadius: '0.75rem',
        background: 'var(--card-bg)',
        border: '1px solid var(--line-divider)',
        textDecoration: 'none',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        flexShrink: 0,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#06b6d4';
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 4px 16px -4px rgba(6,182,212,0.3)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '';
        el.style.transform = '';
        el.style.boxShadow = '';
      }}
    >
      {/* Cover image */}
      {track.coverUrl ? (
        <img
          src={track.coverUrl}
          alt=""
          style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.4rem', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🎵</span>
      )}

      {/* Text */}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--deep-text)',
            opacity: 0.6,
          }}
        >
          {playing && (
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '9999px',
                background: '#22c55e',
                boxShadow: '0 0 5px #22c55e',
              }}
            />
          )}
          {playing ? 'Escuchando ahora' : 'Última canción'}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}
        >
          {track.name}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: '0.72rem',
            color: 'var(--deep-text)',
            opacity: 0.7,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {track.artist}
        </span>
      </span>

      {/* Visualizer */}
      <VisualizerBars playing={playing} />
    </button>
  );
}
