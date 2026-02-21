import React, { useState, useEffect, useCallback } from 'react';
import { getOptimizedImageUrl, getOriginalImageUrl } from '../lib/image-utils';

interface Image {
  id: string;
  url: string;
  alt: string;
  description?: string;
}

interface AlbumCarouselProps {
  images: Image[];
  albumTitle: string;
}

export default function AlbumCarousel({ images, albumTitle }: AlbumCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const currentImage = images[currentIndex];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToPrevious, goToNext]);

  // Initialize PhotoSwipe for lightbox
  useEffect(() => {
    if (images.length === 0) return;

    let lightbox: any = null;

    const initPhotoSwipe = async () => {
      if (typeof window !== 'undefined') {
        try {
          const PhotoSwipeLightbox = (await import('photoswipe/lightbox')).default;
          await import('photoswipe/style.css');

          lightbox = new PhotoSwipeLightbox({
            gallery: '.album-carousel-image',
            children: 'a',
            pswpModule: () => import('photoswipe'),
            closeSVG: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z"/></svg>',
            zoomSVG: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M340-540h-40q-17 0-28.5-11.5T260-580q0-17 11.5-28.5T300-620h40v-40q0-17 11.5-28.5T380-700q17 0 28.5 11.5T420-660v40h40q17 0 28.5 11.5T500-580q0 17-11.5 28.5T460-540h-40v40q0 17-11.5 28.5T380-460q-17 0-28.5-11.5T340-500v-40Zm40 220q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l224 224q11 11 11 28t-11 28q-11 11-28 11t-28-11L532-372q-30 24-69 38t-83 14Zm0-80q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>',
            padding: { top: 20, bottom: 20, left: 20, right: 20 },
            wheelToZoom: true,
            arrowPrev: false,
            arrowNext: false,
            imageClickAction: 'close',
            tapAction: 'close',
            doubleTapAction: 'zoom',
          });

          lightbox.addFilter('domItemData', (itemData, element) => {
            if (element instanceof HTMLImageElement) {
              itemData.src = element.src;
              itemData.w = Number(element.naturalWidth || window.innerWidth);
              itemData.h = Number(element.naturalHeight || window.innerHeight);
              itemData.msrc = element.src;
            }
            return itemData;
          });

          lightbox.init();
        } catch (error) {
          console.error('Error initializing PhotoSwipe:', error);
        }
      }
    };

    initPhotoSwipe();

    return () => {
      if (lightbox) {
        lightbox.destroy();
      }
    };
  }, [images]);

  if (images.length === 0) {
    return <div className="text-center text-gray-500 dark:text-gray-400">No hay imágenes</div>;
  }

  return (
    <div className="album-carousel-image space-y-4">
      {/* Main Image */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        <a
          href={getOriginalImageUrl(currentImage.url)}
          data-pswp-width={1920}
          data-pswp-height={1080}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={getOptimizedImageUrl(currentImage.url, 2560, 95)}
            alt={currentImage.alt}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.onerror = null;
              img.src = '/default-avatar.svg';
            }}
          />
        </a>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
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
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
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
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Image Description */}
      {currentImage.description && (
        <div className="text-center text-gray-600 dark:text-gray-400">
          {currentImage.description}
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => goToImage(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-indigo-600 ring-2 ring-indigo-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
              }`}
              aria-label={`Ver imagen ${index + 1}`}
            >
              <img
                src={getOptimizedImageUrl(image.url, 160)}
                alt={image.alt}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.svg';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

