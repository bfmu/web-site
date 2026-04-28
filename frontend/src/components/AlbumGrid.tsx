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
}

interface AlbumGridProps {
  images: Image[];
  albumTitle: string;
}

export default function AlbumGrid({ images, albumTitle }: AlbumGridProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-8">No hay imágenes</div>;
  }

  // Calcular tamaños para el grid estilo bento (Pinterest)
  const getImageSize = (index: number, total: number): string => {
    // Patrón más variado y visualmente interesante
    const pattern = index % 8;
    switch (pattern) {
      case 0:
        return 'col-span-2 row-span-2'; // Grande cuadrada
      case 1:
      case 2:
        return 'col-span-1 row-span-1'; // Pequeñas
      case 3:
        return 'col-span-1 row-span-2'; // Vertical alta
      case 4:
        return 'col-span-2 row-span-1'; // Horizontal ancha
      case 5:
      case 6:
        return 'col-span-1 row-span-1'; // Pequeñas
      case 7:
        return 'col-span-1 row-span-2'; // Vertical alta
      default:
        return 'col-span-1 row-span-1';
    }
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 auto-rows-[150px] md:auto-rows-[200px]">
        {images.map((image, index) => {
          const sizeClass = getImageSize(index, images.length);
          return (
            <div
              key={image.id}
              onClick={() => handleImageClick(index)}
              className={`group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ${sizeClass} cursor-pointer`}
            >
              <img
                src={getOptimizedImageUrl(image.url, 600, 90)}
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

