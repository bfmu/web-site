import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getOriginalImageUrl } from '../lib/image-utils';
import { getVisitorId } from '../lib/visitor-id';
import { toggleImageLike, getImageLikeStatus } from '../utils/api-blog';
import { showError, showSuccess } from '../lib/notifications';
import { usePlayerStore } from './music/playerStore';

interface Image {
  id: string;
  url: string;
  alt: string;
  description?: string;
  width?: number;
  height?: number;
  orientation?: number;
  likesCount?: number;
  spotifyTrackId?: string;
  type?: string;
  thumbnailUrl?: string;
}

interface InstagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Image[];
  initialIndex: number;
  albumTitle: string;
}

export default function InstagramModal({
  isOpen,
  onClose,
  images,
  initialIndex,
  albumTitle,
}: InstagramModalProps): React.ReactElement | null {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setImageLoaded(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setImageLoaded(false);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setImageLoaded(false);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose]);

  useEffect(() => {
    const img = images[currentIndex];
    if (!isOpen || !img) return;

    setLikesCount(img.likesCount ?? 0);
    let cancelled = false;
    getImageLikeStatus(img.id, getVisitorId())
      .then((res) => {
        if (!cancelled) setLiked(res.liked);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentIndex, images]);

  // Mantener la URL sincronizada con la foto actual, para que "Compartir"
  // (que usa window.location.href) apunte siempre a la imagen exacta.
  useEffect(() => {
    if (!isOpen) return;
    const img = images[currentIndex];
    if (!img) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get('foto') === img.id) return;
    url.searchParams.set('foto', img.id);
    window.history.replaceState(null, '', url);
  }, [isOpen, currentIndex, images]);

  // Al cerrar/desmontar el modal, limpiar el ?foto= de la URL
  useEffect(() => {
    return () => {
      const url = new URL(window.location.href);
      if (url.searchParams.has('foto')) {
        url.searchParams.delete('foto');
        window.history.replaceState(null, '', url);
      }
    };
  }, []);

  // La canción anclada a la foto es exclusiva del modal (embed aislado, no toca
  // el estado del reproductor persistente). Si la página tenía música sonando,
  // se pausa para darle prioridad a la de la foto y se retoma al cerrar/cambiar
  // de foto — pero solo si nosotros fuimos quienes la pausaron.
  useEffect(() => {
    const trackId = isOpen ? images[currentIndex]?.spotifyTrackId : undefined;
    if (!trackId) return;

    const { isPlaying, controller } = usePlayerStore.getState();
    let pausedPageMusic = false;
    if (isPlaying && controller) {
      controller.pause();
      pausedPageMusic = true;
    }

    return () => {
      if (pausedPageMusic) {
        usePlayerStore.getState().controller?.play();
      }
    };
  }, [isOpen, currentIndex, images]);

  if (!isOpen || images.length === 0 || !mounted) return null;

  const currentImage = images[currentIndex];

  const handleToggleLike = async () => {
    const wasLiked = liked;
    const prevCount = likesCount;
    setLiked(!wasLiked);
    setLikesCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await toggleImageLike(currentImage.id, getVisitorId());
      setLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch {
      setLiked(wasLiked);
      setLikesCount(prevCount);
      showError('No se pudo actualizar el like');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: albumTitle, url: shareUrl });
      } catch {
        // El usuario canceló el share, no es un error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess('Link copiado al portapapeles');
    } catch {
      showError('No se pudo copiar el link');
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      {/* Modal Container - Estilo Instagram Web */}
      <div
        className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden flex flex-col md:flex-row shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
          aria-label="Cerrar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image Section (Left) - Estilo Instagram */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[50vh] md:min-h-0 h-full">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}
          {currentImage.type === 'video' ? (
            // biome-ignore lint/a11y/useMediaCaption: video subido por el usuario, no hay pista de subtítulos disponible
            <video
              key={currentImage.id}
              src={currentImage.url}
              poster={currentImage.thumbnailUrl}
              controls
              playsInline
              width={currentImage.width}
              height={currentImage.height}
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoadedData={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          ) : (
            <img
              src={getOriginalImageUrl(currentImage.url, currentImage.orientation ?? 0)}
              alt={currentImage.alt}
              width={currentImage.width}
              height={currentImage.height}
              className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                img.src = '/default-avatar.svg';
                setImageLoaded(true);
              }}
            />
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                aria-label="Imagen anterior"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
                aria-label="Imagen siguiente"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full font-mono text-xs tracking-wider">
              {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Side Panel (Right) - Estilo Instagram */}
        <div className="w-full md:w-96 flex flex-col bg-white dark:bg-gray-900 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-display font-semibold tracking-tight text-gray-900 dark:text-white text-xl">
              {albumTitle}
            </h2>
            <p className="font-mono text-xs tracking-wider text-gray-500 dark:text-gray-400 mt-1">
              {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
            </p>
          </div>

          {/* Image Info - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {currentImage.spotifyTrackId && (
              <div className="mb-4">
                <iframe
                  key={currentIndex}
                  title="Reproductor de Spotify"
                  src={`https://open.spotify.com/embed/track/${currentImage.spotifyTrackId}?utm_source=generator&autoplay=1`}
                  width="100%"
                  height="152"
                  style={{ borderRadius: '12px', border: 0 }}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            )}
            {currentImage.description && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {currentImage.description}
                </p>
              </div>
            )}
            {!currentImage.description && (
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <p className="text-sm">Sin descripción</p>
              </div>
            )}
          </div>

          {/* Actions Bar (Bottom) */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleLike}
                className={`transition-colors ${
                  liked
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400'
                }`}
                aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
                aria-pressed={liked}
                title={liked ? 'Quitar me gusta' : 'Me gusta'}
              >
                <svg
                  className="w-6 h-6"
                  fill={liked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              <button
                onClick={handleShare}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ml-auto"
                aria-label="Compartir"
                title="Compartir"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>

            {/* Likes Count */}
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">{likesCount}</span> me gusta
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

