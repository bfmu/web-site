import React, { useState, useEffect } from 'react';
import {
  getMediaList,
  uploadMedia,
  type MediaFile,
  type MediaQuery,
} from '../../lib/admin-api';
import { getBackendResourceUrl } from '../../lib/env';
import { getOptimizedImageUrl } from '../../lib/image-utils';
import { showError } from '@/lib/notifications';

interface ImageLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  allowUpload?: boolean;
  albumId?: string;
}

export function ImageLibraryModal({
  isOpen,
  onClose,
  onSelect,
  allowUpload = true,
  albumId,
}: ImageLibraryModalProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null);
  const [search, setSearch] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    isPublic: false,
    alt: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      loadMedia();
    }
  }, [isOpen, activeTab, albumId]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const query: MediaQuery = {
        type: 'image',
        page: 1,
        limit: 50,
        albumId: albumId,
      };
      if (search) {
        query.search = search;
      }
      const response = await getMediaList(query);
      setMedia(response.media);
    } catch (error) {
      console.error('Error loading media:', error);
      showError('Error al cargar medios');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearFile = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadMetadata({
      isPublic: false,
      alt: '',
      description: '',
    });
    // Limpiar el input file
    const fileInput = document.getElementById('upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);
      const result = await uploadMedia(uploadFile, {
        ...uploadMetadata,
        albumId: albumId,
      });
      
      // La URL ya viene completa desde uploadMedia
      onSelect(result.url);
      onClose();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError(error.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFromLibrary = () => {
    if (selectedImage) {
      onSelect(getBackendResourceUrl(selectedImage.url));
      onClose();
    }
  };

  const getImageUrl = (media: MediaFile): string => getOptimizedImageUrl(media.url, 200);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Seleccionar Imagen
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'library'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Librería
          </button>
          {allowUpload && (
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Subir Nueva
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Buscar imágenes..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  // Debounce search
                  setTimeout(() => {
                    if (e.target.value === search || e.target.value === '') {
                      loadMedia();
                    }
                  }, 500);
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />

              {/* Grid */}
              {loading ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Cargando...
                </div>
              ) : media.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No hay imágenes disponibles
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {media.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedImage(item)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedImage?._id === item._id
                          ? 'border-indigo-600 ring-2 ring-indigo-600'
                          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      <img
                        src={getImageUrl(item)}
                        alt={item.alt || item.originalName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.onerror = null;
                          img.src = '/default-avatar.svg';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="upload-input"
                />
                <label
                  htmlFor="upload-input"
                  className="cursor-pointer block"
                >
                  {uploadPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClearFile();
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-colors shadow-lg"
                        title="Eliminar selección"
                      >
                        <svg
                          className="w-5 h-5"
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
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click para seleccionar o arrastra una imagen aquí
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {/* Upload metadata */}
              {uploadFile && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Texto alternativo (alt)
                    </label>
                    <input
                      type="text"
                      value={uploadMetadata.alt}
                      onChange={(e) =>
                        setUploadMetadata({ ...uploadMetadata, alt: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={uploadMetadata.description}
                      onChange={(e) =>
                        setUploadMetadata({ ...uploadMetadata, description: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={uploadMetadata.isPublic}
                        onChange={(e) =>
                          setUploadMetadata({ ...uploadMetadata, isPublic: e.target.checked })
                        }
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Público (visible en galería)
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          {activeTab === 'library' ? (
            <button
              onClick={handleSelectFromLibrary}
              disabled={!selectedImage}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              Insertar
            </button>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : 'Subir e Insertar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

