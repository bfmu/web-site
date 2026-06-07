import React, { useState } from 'react';
import InstagramModal from './InstagramModal';
import { getOptimizedImageUrl } from '../lib/image-utils';

interface Image {
  id: string;
  url: string;
  alt: string;
  description?: string;
  width?: number;
  height?: number;
  orientation?: number;
}

interface AlbumGridProps {
  images: Image[];
  albumTitle: string;
}

export default function AlbumGrid({ images, albumTitle }: AlbumGridProps): React.ReactElement {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-8">No hay imágenes</div>;
  }

  // El span se determina por el aspect ratio real de cada imagen.
  // index 0 siempre es el hero (2×2). Dense rellena cualquier hueco restante.
  const getImageSize = (index: number, image: Image): string => {
    if (index === 0) return 'col-span-2 row-span-2';
    const ratio = (image.width || 1) / (image.height || 1);
    if (ratio >= 1.6) return 'col-span-2 row-span-1'; // landscape → wide
    if (ratio <= 0.65) return 'col-span-1 row-span-2'; // portrait → tall
    return 'col-span-1 row-span-1';
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 auto-rows-[150px] md:auto-rows-[200px] grid-flow-row-dense">
        {images.map((image, index) => {
          const sizeClass = getImageSize(index, image);
          return (
            <div
              key={image.id}
              onClick={() => handleImageClick(index)}
              className={`group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ${sizeClass} cursor-pointer`}
            >
              <img
                src={getOptimizedImageUrl(image.url, 600, 90, image.orientation ?? 0)}
                alt={image.alt}
                width={image.width}
                height={image.height}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/default-avatar.svg';
                }}
              />
              {/* Overlay con descripción si existe */}
              {image.description && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white text-sm">
                    {image.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instagram Modal */}
      {selectedImageIndex !== null && (
        <InstagramModal
          isOpen={selectedImageIndex !== null}
          onClose={handleCloseModal}
          images={images}
          initialIndex={selectedImageIndex}
          albumTitle={albumTitle}
        />
      )}
    </>
  );
}

