import React, { useState, useEffect } from 'react';
import {
  getMediaList,
  deleteMedia,
  renameMedia,
  checkMediaUsage,
  updateMedia,
  uploadMedia,
  type MediaFile,
  type MediaQuery,
} from '../../lib/admin-api';

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<MediaQuery>({
    type: 'image',
    page: 1,
    limit: 50,
  });
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [editData, setEditData] = useState<Partial<MediaFile>>({});
  const [usageInfo, setUsageInfo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMedia();
  }, [filters]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await getMediaList(filters);
      setMedia(response.media);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Error loading media:', error);
      setMessage({ type: 'error', text: 'Error al cargar medios' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMedia) return;

    try {
      // Verificar uso antes de eliminar
      const usage = await checkMediaUsage(selectedMedia._id);
      setUsageInfo(usage);

      if (usage.inUse) {
        setMessage({
          type: 'error',
          text: `No se puede eliminar: la imagen está en uso en ${usage.usedInPosts.length} post(s) y ${usage.usedInAlbums.length} álbum(es)`,
        });
        setShowDeleteModal(false);
        return;
      }

      await deleteMedia(selectedMedia._id);
      setMessage({ type: 'success', text: 'Imagen eliminada correctamente' });
      setShowDeleteModal(false);
      setSelectedMedia(null);
      loadMedia();
    } catch (error: any) {
      console.error('Error deleting media:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar imagen' });
    }
  };

  const handleRename = async () => {
    if (!selectedMedia || !newFilename.trim()) return;

    try {
      await renameMedia(selectedMedia._id, newFilename.trim());
      setMessage({ type: 'success', text: 'Imagen renombrada correctamente' });
      setShowRenameModal(false);
      setSelectedMedia(null);
      setNewFilename('');
      loadMedia();
    } catch (error: any) {
      console.error('Error renaming media:', error);
      setMessage({ type: 'error', text: error.message || 'Error al renombrar imagen' });
    }
  };

  const handleUpdate = async () => {
    if (!selectedMedia) return;

    try {
      await updateMedia(selectedMedia._id, editData);
      setMessage({ type: 'success', text: 'Metadata actualizada correctamente' });
      setShowEditModal(false);
      setSelectedMedia(null);
      setEditData({});
      loadMedia();
    } catch (error: any) {
      console.error('Error updating media:', error);
      setMessage({ type: 'error', text: error.message || 'Error al actualizar metadata' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadMedia(file, {
        isPublic: filters.isPublic === true,
      });
      setMessage({ type: 'success', text: 'Imagen subida correctamente' });
      loadMedia();
    } catch (error: any) {
      console.error('Error uploading media:', error);
      setMessage({ type: 'error', text: error.message || 'Error al subir imagen' });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getImageUrl = (media: MediaFile): string => {
    if (media.url.startsWith('http')) return media.url;
    const baseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}${media.url}`;
  };

  return (
    <div className="space-y-6">
      {/* Header con filtros y upload */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.type || 'image'}
            onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="image">Imágenes</option>
            <option value="video">Videos</option>
            <option value="document">Documentos</option>
          </select>
          <select
            value={filters.isPublic === undefined ? 'all' : filters.isPublic ? 'public' : 'private'}
            onChange={(e) => {
              const isPublic = e.target.value === 'all' ? undefined : e.target.value === 'public';
              setFilters({ ...filters, isPublic, page: 1 });
            }}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="public">Públicos</option>
            <option value="private">Privados</option>
          </select>
          <input
            type="text"
            placeholder="Buscar..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <label className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
          {uploading ? 'Subiendo...' : 'Subir Imagen'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Mensajes */}
      {message && (
        <div
          className={`rounded-md p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Grid de imágenes */}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">Cargando...</div>
      ) : media.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400">No hay medios disponibles</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {media.map((item) => (
              <div
                key={item._id}
                className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedMedia(item)}
              >
                <img
                  src={getImageUrl(item)}
                  alt={item.alt || item.originalName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-avatar.svg';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-white text-sm font-medium">{item.originalName}</div>
                </div>
                {item.isPublic && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    Público
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Paginación */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.pages}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de detalles/acciones */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedMedia.originalName}
                </h3>
                <button
                  onClick={() => {
                    setSelectedMedia(null);
                    setShowDeleteModal(false);
                    setShowRenameModal(false);
                    setShowEditModal(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <img
                src={getImageUrl(selectedMedia)}
                alt={selectedMedia.alt || selectedMedia.originalName}
                className="w-full rounded-lg mb-4"
              />

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div>
                  <strong>Tamaño:</strong> {formatFileSize(selectedMedia.size)}
                </div>
                <div>
                  <strong>Tipo:</strong> {selectedMedia.mimeType}
                </div>
                {selectedMedia.width && selectedMedia.height && (
                  <div>
                    <strong>Dimensiones:</strong> {selectedMedia.width} × {selectedMedia.height}
                  </div>
                )}
                <div>
                  <strong>Subido:</strong>{' '}
                  {selectedMedia.createdAt
                    ? new Date(selectedMedia.createdAt).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setEditData({
                      alt: selectedMedia.alt || '',
                      description: selectedMedia.description || '',
                      isPublic: selectedMedia.isPublic,
                    });
                    setShowEditModal(true);
                  }}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setNewFilename(selectedMedia.filename);
                    setShowRenameModal(true);
                  }}
                  className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Renombrar
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de eliminar */}
      {showDeleteModal && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ¿Eliminar imagen?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Esta acción no se puede deshacer. La imagen será eliminada permanentemente.
            </p>
            {usageInfo?.inUse && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  <strong>Advertencia:</strong> Esta imagen está en uso en:
                </p>
                {usageInfo.usedInPosts.length > 0 && (
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
                    Posts: {usageInfo.usedInPosts.join(', ')}
                  </p>
                )}
                {usageInfo.usedInAlbums.length > 0 && (
                  <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
                    Álbumes: {usageInfo.usedInAlbums.join(', ')}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUsageInfo(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de renombrar */}
      {showRenameModal && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Renombrar imagen
            </h3>
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 mb-4"
              placeholder="Nuevo nombre"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewFilename('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleRename}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Renombrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de editar */}
      {showEditModal && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Editar metadata
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Texto alternativo (alt)
                </label>
                <input
                  type="text"
                  value={editData.alt || ''}
                  onChange={(e) => setEditData({ ...editData, alt: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editData.isPublic || false}
                    onChange={(e) => setEditData({ ...editData, isPublic: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Público (visible en galería)
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditData({});
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

