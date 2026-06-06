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
      <div className="text-center py-8 text-2xl font-semibold text-[var(--primary)] dark:text-neutral-50">
        Cargando datos de Spotify...
      </div>
    );
  if (error)
    return (
      <div className="text-center py-8 text-2xl font-semibold text-[var(--primary)] dark:text-neutral-50">
        Error: {error}
      </div>
    );

  return (
    <div className="relative max-w-[var(--page-width)] mx-auto pointer-events-auto">
      <div className="transition duration-700 w-full left-0 right-0 mx-auto gap-4 px-0 md:px-4 onload-animation">
        <p className="mb-4 rounded-lg bg-[var(--btn-regular-bg)] px-4 py-3 text-sm text-[var(--deep-text)] dark:text-neutral-50">
          Toca una canción para escucharla en el reproductor de la parte inferior. Puedes seguir navegando y la música seguirá sonando.
        </p>
        {/* Última Canción Escuchada */}
        {lastPlayed && (
          <section className="mt-4 bg-[var(--card-bg)] p-6 rounded-[var(--radius-large)] shadow-md">
            <h2 className="text-2xl font-semibold text-[var(--primary)] dark:text-neutral-50">
              Última Canción Escuchada
            </h2>
            <div
              className="flex items-center gap-4 p-4 bg-[var(--btn-regular-bg)] rounded-lg hover:bg-[var(--btn-regular-bg-hover)] cursor-pointer transition"
              data-type="track"
              data-id={(lastPlayed as any).id}
              onClick={() => handleMusicClick("track", (lastPlayed as any).id, lastPlayed as any)}
            >
              <img
                src={(lastPlayed as any).album.images[0].url}
                alt={(lastPlayed as any).album.name}
                className="w-20 h-20 rounded-md"
              />
              <div>
                <p className="text-lg font-bold text-[var(--deep-text)] dark:text-neutral-50">
                  {(lastPlayed as any).name}
                </p>
                <p className="text-sm text-[var(--meta-divider)] dark:text-gray-300">
                  de{" "}
                  <a
                    href={(lastPlayed as any).artists[0].external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    {(lastPlayed as any).artists[0].name}
                  </a>
                </p>
              </div>
            </div>
          </section>
        )}

        {recentlyPlayed && (
          <section className="mt-4 bg-[var(--card-bg)] p-6 rounded-[var(--radius-large)] shadow-md">
            <h2 className="text-2xl font-semibold text-[var(--primary)] dark:text-neutral-50">
              Ultimas Canciones Escuchadas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {(recentlyPlayed as any[])
                .sort(
                  (a, b) =>
                    new Date(b.played_at).getTime() -
                    new Date(a.played_at).getTime(),
                )
                .map((data, index) => (
                  <div
                    key={data.track.id + index}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-[var(--btn-card-bg-hover)] bg-[var(--btn-regular-bg)] transition cursor-pointer"
                    data-type="track"
                    data-id={data.track.id}
                    onClick={() => handleMusicClick("track", data.track.id, data.track)}
                  >
                    <img
                      src={
                        data.track.album.images[0].url
                          ? data.track.album.images[0].url
                          : "https://via.placeholder.com/150"
                      }
                      alt={data.track.name}
                      className="w-16 h-16 rounded-md"
                    />
                    <div>
                      <p className="text-[var(--deep-text)] font-bold dark:text-neutral-50">
                        {data.track.name}
                      </p>
                      <p className="text-sm text-[var(--primary)]">
                        {data.track.artists[0].name}
                      </p>
                      <p className="text-sm text-[var(--meta-divider)] dark:text-gray-300">
                        {timeAgo(data.played_at)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ✅ Top Canciones */}
        {topTracks && (
          <section className="mt-4 bg-[var(--card-bg)] p-6 rounded-[var(--radius-large)] shadow-md">
            <h2 className="text-2xl font-semibold text-[var(--primary)] dark:text-neutral-50">
              Top Canciones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {(topTracks as any[]).map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-[var(--btn-card-bg-hover)] bg-[var(--btn-regular-bg)] transition cursor-pointer"
                  data-type="track"
                  data-id={track.id}
                  onClick={() => handleMusicClick("track", track.id, track)}
                >
                  <img
                    src={track.album.images[0].url}
                    alt={track.name}
                    className="w-16 h-16 rounded-md"
                  />
                  <div>
                    <p className="text-[var(--deep-text)] font-bold dark:text-neutral-50">
                      {track.name}
                    </p>
                    <p className="text-sm text-[var(--primary)]">
                      {track.artists[0].name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top Artistas */}
        {topArtists && (
          <section className="mt-4 bg-[var(--card-bg)] p-6 rounded-[var(--radius-large)] shadow-md mb-10">
            <h2 className="text-2xl font-semibold text-[var(--primary)] dark:text-neutral-50">
              Top Artistas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {((topArtists as any).items as any[]).map((artist) => (
                <div
                  key={artist.id}
                  className="block p-4 rounded-lg hover:scale-105 transition bg-[var(--btn-regular-bg)] hover:bg-[var(--btn-card-bg-hover)] cursor-pointer"
                  data-type="artist"
                  data-id={artist.id}
                  onClick={() => handleMusicClick("artist", artist.id)}
                >
                  <img
                    src={artist.images[0].url}
                    alt={artist.name}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <p className="mt-2 text-[var(--deep-text)] text-center font-bold dark:text-neutral-50">
                    {artist.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
