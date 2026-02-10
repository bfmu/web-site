import React, { useState, useEffect } from 'react';
import {
  getMediaList,
  uploadMedia,
  addImagesToAlbumBatch,
  type MediaFile,
  type Album,
} from '../../lib/admin-api';
import { getBackendResourceUrl } from '../../lib/env';

interface AddPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album;
  onSuccess: (updatedAlbum: Album) => void;
}

export function AddPhotosModal({
  isOpen,
  onClose,
  album,
  onSuccess,
}: AddPhotosModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    isPublic: false,
    alt: '',
    description: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const albumImageIds = new Set(
    (Array.isArray(album.images) ? album.images : []).map((img: MediaFile | string) =>
      typeof img === 'string' ? img : (img as MediaFile)._id,
    ),
  );

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      setPage(1);
      setMedia([]);
      setHasMore(true);
      loadMedia(1, true);
    }
  }, [isOpen, activeTab, album._id]);

  useEffect(() => {
    if (isOpen && activeTab === 'library' && page > 1) {
      loadMedia(page, false);
    }
  }, [page]);

  const loadMedia = async (pageNum: number = 1, replace: boolean = true) => {
    try {
      setLoading(true);
      const response = await getMediaList({
        type: 'image',
        page: pageNum,
        limit: 50,
        search: search || undefined,
      });
      const filtered = response.media.filter((m) => !albumImageIds.has(m._id));
      setMedia((prev) => (replace ? filtered : [...prev, ...filtered]));
      setHasMore(response.pagination.page < response.pagination.pages);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadMedia(1, true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === media.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(media.map((m) => m._id)));
    }
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      setAdding(true);
      setMessage(null);
      const updatedAlbum = await addImagesToAlbumBatch(album.slug, Array.from(selectedIds));
      onSuccess(updatedAlbum);
      setSelectedIds(new Set());
      setMessage({ type: 'success', text: `${selectedIds.size} imagen(es) agregada(s) al álbum` });
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al agregar imágenes' });
    } finally {
      setAdding(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setUploadPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleClearFile = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadMetadata({ isPublic: false, alt: '', description: '' });
    const input = document.getElementById('add-photos-upload-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);
      setMessage(null);
      const result = await uploadMedia(uploadFile, uploadMetadata);
      const updatedAlbum = await addImagesToAlbumBatch(album.slug, [result._id]);
      onSuccess(updatedAlbum);
      setMessage({ type: 'success', text: 'Imagen subida y agregada al álbum' });
      handleClearFile();
      loadMedia(1, true);
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al subir imagen' });
    } finally {
      setUploading(false);
    }
  };

  const getImageUrl = (m: MediaFile): string => {
    if (m.url.startsWith('http')) return m.url;
    return getBackendResourceUrl(m.url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agregar fotos a "{album.title}"
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
            Biblioteca de medios
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Subir nueva
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mx-5 mt-3 rounded-lg p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar imágenes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleSearch}
                  className="rounded-lg bg-gray-200 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Buscar
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Las imágenes que ya están en el álbum no se muestran aquí.
              </p>

              {loading && media.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-12">Cargando...</div>
              ) : media.length === 0 ? (
                <div className="text-center py-12 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    No hay imágenes disponibles para agregar
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Sube nuevas imágenes desde la pestaña "Subir nueva" o en la sección Media.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === media.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Seleccionar todo en esta página
                      </span>
                    </label>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedIds.size} seleccionada(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {media.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => toggleSelect(item._id)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          selectedIds.has(item._id)
                            ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-gray-800'
                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                        }`}
                      >
                        <img
                          src={getImageUrl(item)}
                          alt={item.alt || item.originalName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-avatar.svg';
                          }}
                        />
                        {selectedIds.has(item._id) && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={loading}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 text-sm font-medium"
                      >
                        {loading ? 'Cargando...' : 'Cargar más'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="add-photos-upload-input"
                />
                <label htmlFor="add-photos-upload-input" className="cursor-pointer block">
                  {uploadPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={uploadPreview}
                        alt="Vista previa"
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
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg
                        className="mx-auto h-14 w-14 text-gray-400"
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
                        Haz clic para seleccionar o arrastra una imagen
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Se subirá y se agregará automáticamente al álbum
                      </p>
                    </div>
                  )}
                </label>
              </div>
              {uploadFile && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Texto alternativo (alt)
                    </label>
                    <input
                      type="text"
                      value={uploadMetadata.alt}
                      onChange={(e) => setUploadMetadata({ ...uploadMetadata, alt: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={uploadMetadata.isPublic}
                      onChange={(e) => setUploadMetadata({ ...uploadMetadata, isPublic: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Público (visible en galería)</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          {activeTab === 'library' ? (
            <button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0 || adding}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'Agregando...' : `Agregar ${selectedIds.size} al álbum`}
            </button>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Subiendo...' : 'Subir y agregar al álbum'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
