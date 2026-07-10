import { useState, useEffect, type ReactElement } from "react";
import { getBackendUrl } from "../../lib/env";
import { usePlayerStore } from "./playerStore";
import { showError } from "@/lib/notifications";

const backendUrl = getBackendUrl();

// Función para calcular el tiempo transcurrido
function timeAgo(dateString: string) {
  const now: Date = new Date();
  const playedTime: Date = new Date(dateString);
  const diffMs = now.getTime() - playedTime.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} día${days !== 1 ? "s" : ""} atrás`;
  if (hours > 0) return `${hours} hora${hours !== 1 ? "s" : ""} atrás`;
  if (minutes > 0) return `${minutes} minuto${minutes !== 1 ? "s" : ""} atrás`;
  return `${seconds} segundo${seconds !== 1 ? "s" : ""} atrás`;
}

/** Encabezado editorial de sección: número mono + regla + título display */
function SectionHeader({ number, title }: { number: number; title: string }): ReactElement {
  return (
    <div className="flex items-center gap-4 mb-4">
      <span className="font-mono text-[0.7rem] tracking-[0.22em] text-[var(--primary)] flex-shrink-0">
        {String(number).padStart(2, "0")}
      </span>
      <span className="h-px flex-1 bg-[var(--line-divider)]" aria-hidden="true" />
      <h2 className="font-display font-semibold tracking-tight text-xl text-black/90 dark:text-white/90 flex-shrink-0">
        {title}
      </h2>
    </div>
  );
}

/** Fila de track: cover + título display + artista mono, hover con acento */
function TrackRow({
  cover,
  name,
  artist,
  meta,
  onClick,
}: {
  cover: string;
  name: string;
  artist: string;
  meta?: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 py-3 text-left border-b border-[var(--line-divider)] transition hover:bg-[var(--btn-plain-bg-hover)] px-2 -mx-2"
    >
      <img
        src={cover || "https://via.placeholder.com/150"}
        alt=""
        className="w-14 h-14 flex-shrink-0 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold tracking-tight text-base text-black/90 dark:text-white/90 truncate transition-colors group-hover:text-[var(--primary)]">
          {name}
        </p>
        <p className="font-mono text-[0.72rem] tracking-wide text-black/45 dark:text-white/45 truncate mt-0.5">
          {artist}{meta ? ` · ${meta}` : ""}
        </p>
      </div>
      <span className="font-mono text-[0.65rem] tracking-widest uppercase text-black/25 dark:text-white/25 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        reproducir
      </span>
    </button>
  );
}

export const FeedMusic = (): ReactElement | null => {
  const [data, setData] = useState({
    lastPlayed: null,
    topArtists: null,
    recentlyPlayed: null,
    topTracks: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // ✅ Función de carga resiliente con manejo de errores
    async function fetchData(endpoint: string) {
      try {
        const url = `${backendUrl}${endpoint}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error(`Error en ${endpoint}: ${res.status}`);

        return await res.json();
      } catch (error) {
        console.error(error);
        return null;
      }
    }

    // ✅ Cargar todas las peticiones en paralelo
    async function loadAllData() {
      try {
        const [lastPlayed, topArtists, recentlyPlayed, topTracks] =
          await Promise.all([
            fetchData("api/spotify/last-played"),
            fetchData("api/spotify/top-artists"),
            fetchData("api/spotify/recently-played"),
            fetchData("api/spotify/top-tracks"),
          ]);

        setData({
          lastPlayed,
          topArtists,
          recentlyPlayed,
          topTracks,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        showError('Error al cargar datos de Spotify');
      }
    }

    loadAllData();
  }, []);

  const playTrack = usePlayerStore((s) => s.playTrack);

  // Manejar clics en elementos de música
  const handleMusicClick = (type: string, id: string, trackInfo?: { name: string; artists: { name: string }[]; album: { images: { url: string }[] } }) => {
    if (type === "track") {
      if (trackInfo) {
        playTrack(id, {
          id,
          name: trackInfo.name,
          artist: trackInfo.artists?.[0]?.name ?? "",
          coverUrl: trackInfo.album?.images?.[0]?.url ?? "",
          spotifyUrl: `https://open.spotify.com/track/${id}`,
        });
      } else {
        playTrack(id);
      }
    } else if (type === "artist" || type === "playlist") {
      window.open(`https://open.spotify.com/${type}/${id}`, "_blank");
    }
  };

  const { lastPlayed, topArtists, recentlyPlayed, topTracks, loading, error } =
    data;

  if (loading)
    return (
      <div className="text-center py-16 font-mono text-xs tracking-widest uppercase text-black/40 dark:text-white/40">
        Cargando datos de Spotify…
      </div>
    );
  if (error)
    return (
      <div className="text-center py-16 font-mono text-xs tracking-widest uppercase text-red-500">
        Error: {error}
      </div>
    );

  return (
    <div className="relative max-w-[var(--page-width)] mx-auto pointer-events-auto">
      <div className="transition duration-700 w-full left-0 right-0 mx-auto gap-4 px-0 md:px-4 onload-animation">
        <header className="mb-6 px-2 md:px-0">
          <p className="inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-[var(--primary)] mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" aria-hidden="true" />
            Ahora escuchando
          </p>
          <h1 className="font-display font-semibold tracking-tight text-[clamp(2.2rem,5vw,3.6rem)] leading-none text-black/90 dark:text-white/90">
            Música
          </h1>
        </header>

        <p className="mb-8 px-2 md:px-0 font-mono text-[0.72rem] tracking-wide text-[var(--deep-text)] opacity-60">
          Toca una canción para escucharla en el reproductor de la parte inferior. Puedes seguir navegando y la música seguirá sonando.
        </p>

        {/* Última Canción Escuchada — pieza destacada, sin chrome de card */}
        {lastPlayed && (
          <section className="mb-10 px-2 md:px-0">
            <SectionHeader number={1} title="Última canción" />
            <button
              type="button"
              className="group flex items-center gap-5 w-full text-left"
              data-type="track"
              data-id={(lastPlayed as any).id}
              onClick={() => handleMusicClick("track", (lastPlayed as any).id, lastPlayed as any)}
            >
              <img
                src={(lastPlayed as any).album.images[0].url}
                alt={(lastPlayed as any).album.name}
                className="w-24 h-24 flex-shrink-0 object-cover"
              />
              <div className="min-w-0">
                <p className="font-display font-semibold tracking-tight text-2xl text-black/90 dark:text-white/90 truncate transition-colors group-hover:text-[var(--primary)]">
                  {(lastPlayed as any).name}
                </p>
                <p className="font-mono text-xs tracking-wide text-black/45 dark:text-white/45 mt-1.5">
                  <a
                    href={(lastPlayed as any).artists[0].external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-[var(--primary)] hover:underline"
                  >
                    {(lastPlayed as any).artists[0].name}
                  </a>
                </p>
              </div>
            </button>
          </section>
        )}

        {recentlyPlayed && (
          <section className="mb-10 px-2 md:px-0">
            <SectionHeader number={2} title="Últimas escuchadas" />
            <div>
              {(recentlyPlayed as any[])
                .sort(
                  (a, b) =>
                    new Date(b.played_at).getTime() -
                    new Date(a.played_at).getTime(),
                )
                .map((data, index) => (
                  <TrackRow
                    key={data.track.id + index}
                    cover={data.track.album.images[0]?.url}
                    name={data.track.name}
                    artist={data.track.artists[0].name}
                    meta={timeAgo(data.played_at)}
                    onClick={() => handleMusicClick("track", data.track.id, data.track)}
                  />
                ))}
            </div>
          </section>
        )}

        {/* Top Canciones */}
        {topTracks && (
          <section className="mb-10 px-2 md:px-0">
            <SectionHeader number={3} title="Top canciones" />
            <div>
              {(topTracks as any[]).map((track) => (
                <TrackRow
                  key={track.id}
                  cover={track.album.images[0]?.url}
                  name={track.name}
                  artist={track.artists[0].name}
                  onClick={() => handleMusicClick("track", track.id, track)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Top Artistas */}
        {topArtists && (
          <section className="mb-16 px-2 md:px-0">
            <SectionHeader number={4} title="Top artistas" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
              {((topArtists as any).items as any[]).map((artist) => (
                <button
                  type="button"
                  key={artist.id}
                  className="group text-left"
                  data-type="artist"
                  data-id={artist.id}
                  onClick={() => handleMusicClick("artist", artist.id)}
                >
                  <div className="aspect-square overflow-hidden bg-[var(--btn-regular-bg)]">
                    <img
                      src={artist.images[0].url}
                      alt={artist.name}
                      className="w-full h-full object-cover scale-[1.02] transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                  </div>
                  <p className="mt-2 font-mono text-xs tracking-wide text-black/70 dark:text-white/70 truncate transition-colors group-hover:text-[var(--primary)]">
                    {artist.name}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
