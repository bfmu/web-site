import React, { useState, useEffect } from 'react';
import {
  getAlbums,
  getAlbum,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  removeImageFromAlbum,
  setAlbumCover,
  type Album,
  type MediaFile,
} from '../../lib/admin-api';
import { getBackendResourceUrl } from '../../lib/env';
import { AddPhotosModal } from './AddPhotosModal';
import { showSuccess, showError, showWarning } from '@/lib/notifications';

type ViewMode = 'list' | 'album';

export default function AlbumManager() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumForm, setAlbumForm] = useState({
    slug: '',
    title: '',
    description: '',
    isPublic: true,
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [lastTitleForSlug, setLastTitleForSlug] = useState('');
  const [albumLoading, setAlbumLoading] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  useEffect(() => {
    if (selectedAlbum && viewMode === 'album') {
      refreshSelectedAlbum();
    }
  }, [viewMode, selectedAlbum?._id]);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const response = await getAlbums({});
      setAlbums(response.albums);
    } catch (error: any) {
      console.error('Error loading albums:', error);
      showError('Error al cargar álbumes');
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedAlbum = async () => {
    if (!selectedAlbum) return;
    try {
      setAlbumLoading(true);
      const fresh = await getAlbum(selectedAlbum.slug);
      setSelectedAlbum(fresh);
      setAlbums((prev) =>
        prev.map((a) => (a.slug === fresh.slug ? fresh : a)),
      );
    } catch (error) {
      console.error('Error refreshing album:', error);
    } finally {
      setAlbumLoading(false);
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreate = async () => {
    if (!albumForm.title.trim()) {
      showWarning('El título es requerido');
      return;
    }

    try {
      const slug = albumForm.slug || generateSlug(albumForm.title);
      await createAlbum({
        ...albumForm,
        slug,
      });
      showSuccess('Álbum creado correctamente');
      setShowCreateModal(false);
      setAlbumForm({ slug: '', title: '', description: '', isPublic: true });
      loadAlbums();
    } catch (error: any) {
      console.error('Error creating album:', error);
      showError(error.message || 'Error al crear álbum');
    }
  };

  const handleUpdate = async () => {
    if (!selectedAlbum || !albumForm.title.trim()) {
      return;
    }

    try {
      await updateAlbum(selectedAlbum.slug, albumForm);
      showSuccess('Álbum actualizado correctamente');
      setShowEditModal(false);
      const fresh = await getAlbum(selectedAlbum.slug);
      setSelectedAlbum(fresh);
      loadAlbums();
    } catch (error: any) {
      console.error('Error updating album:', error);
      showError(error.message || 'Error al actualizar álbum');
    }
  };

  const handleDelete = (slug: string) => {
    setAlbumToDelete(slug);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!albumToDelete) return;

    try {
      await deleteAlbum(albumToDelete);
      showSuccess('Álbum eliminado correctamente');
      if (selectedAlbum?.slug === albumToDelete) {
        setViewMode('list');
        setSelectedAlbum(null);
      }
      loadAlbums();
    } catch (error: any) {
      console.error('Error deleting album:', error);
      showError(error.message || 'Error al eliminar álbum');
    } finally {
      setShowDeleteModal(false);
      setAlbumToDelete(null);
    }
  };

  const handleManageImages = (album: Album) => {
    setSelectedAlbum(album);
    setViewMode('album');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAlbum(null);
    loadAlbums();
  };

  const handleRemoveImage = async (mediaId: string) => {
    if (!selectedAlbum) return;

    try {
      await removeImageFromAlbum(selectedAlbum.slug, mediaId);
      showSuccess('Imagen removida del álbum');
      refreshSelectedAlbum();
      loadAlbums();
    } catch (error: any) {
      console.error('Error removing image:', error);
      showError(error.message || 'Error al remover imagen');
    }
  };

  const handleSetCover = async (mediaId: string) => {
    if (!selectedAlbum) return;

    try {
      await setAlbumCover(selectedAlbum.slug, mediaId);
      showSuccess('Portada establecida');
      refreshSelectedAlbum();
      loadAlbums();
    } catch (error: any) {
      console.error('Error setting cover:', error);
      showError(error.message || 'Error al establecer portada');
    }
  };

  const handleAddPhotosSuccess = (updatedAlbum: Album) => {
    setSelectedAlbum(updatedAlbum);
    showSuccess('Fotos agregadas correctamente');
    loadAlbums();
    refreshSelectedAlbum();
  };

  const getImageUrl = (url: string): string => getBackendResourceUrl(url);

  // Vista dentro del álbum (navegación)
  if (viewMode === 'album' && selectedAlbum) {
    const images = Array.isArray(selectedAlbum.images) ? selectedAlbum.images : [];
    const imageCount = images.length;
    const isEmpty = imageCount === 0;
    const displayAsUnpublished = isEmpty || !selectedAlbum.isPublic;

    return (
      <div className="space-y-6">
        {/* Breadcrumb / Navegación */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a álbumes
          </button>
        </div>

        {/* Header del álbum */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedAlbum.title}
              </h2>
              {displayAsUnpublished ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  No publicado
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Público
                </span>
              )}
            </div>
            {selectedAlbum.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {selectedAlbum.description}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              {imageCount} imagen{imageCount !== 1 ? 'es' : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowAddPhotosModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar fotos
            </button>
            <button
              onClick={() => {
                setAlbumForm({
                  slug: selectedAlbum.slug,
                  title: selectedAlbum.title,
                  description: selectedAlbum.description || '',
                  isPublic: selectedAlbum.isPublic,
                });
                setSlugManuallyEdited(true);
                setLastTitleForSlug(selectedAlbum.title);
                setShowEditModal(true);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Editar álbum
            </button>
            <button
              onClick={() => handleDelete(selectedAlbum.slug)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>

        {/* Contenido del álbum */}
        {albumLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Cargando...</div>
        ) : isEmpty ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Este álbum está vacío
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500 max-w-sm mx-auto">
              El álbum no se publica automáticamente hasta que tenga al menos una imagen.
              Agrega fotos para compartirlo en la galería.
            </p>
            <button
              onClick={() => setShowAddPhotosModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar fotos
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Fotos en el álbum
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img: MediaFile | string) => {
                const image = typeof img === 'string' ? null : (img as MediaFile);
                const imageId = typeof img === 'string' ? img : image?._id;
                const imageUrl = image
                  ? getImageUrl(image.url)
                  : '/default-avatar.svg';

                return (
                  <div key={imageId} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={imageUrl}
                      alt={image?.alt || 'Imagen'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.onerror = null;
                        img.src = '/default-avatar.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleSetCover(imageId)}
                        className="rounded-md bg-indigo-600 px-2 py-1.5 text-xs text-white hover:bg-indigo-700"
                        title="Establecer como portada"
                      >
                        Portada
                      </button>
                      <button
                        onClick={() => handleRemoveImage(imageId)}
                        className="rounded-md bg-red-600 px-2 py-1.5 text-xs text-white hover:bg-red-700"
                        title="Quitar del álbum"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Photos Modal */}
        {showAddPhotosModal && (
          <AddPhotosModal
            isOpen={showAddPhotosModal}
            onClose={() => setShowAddPhotosModal(false)}
            album={selectedAlbum}
            onSuccess={handleAddPhotosSuccess}
          />
        )}

        {/* Edit Modal (también visible desde vista álbum) */}
        {showEditModal && selectedAlbum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Editar Álbum
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={albumForm.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setAlbumForm({
                        ...albumForm,
                        title: newTitle,
                        slug: slugManuallyEdited
                          ? albumForm.slug
                          : (!albumForm.slug || albumForm.slug === generateSlug(lastTitleForSlug))
                            ? generateSlug(newTitle)
                            : albumForm.slug,
                      });
                      setLastTitleForSlug(newTitle);
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={albumForm.description}
                    onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={albumForm.isPublic}
                      onChange={(e) => setAlbumForm({ ...albumForm, isPublic: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Público (visible en galería)
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdate}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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

  // Vista lista de álbumes
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Álbumes</h2>
        <button
          onClick={() => {
            setAlbumForm({ slug: '', title: '', description: '', isPublic: true });
            setSlugManuallyEdited(false);
            setLastTitleForSlug('');
            setShowCreateModal(true);
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Crear Álbum
        </button>
      </div>

      {/* Albums Grid */}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-12">Cargando...</div>
      ) : albums.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400">
          No hay álbumes. Crea uno para comenzar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => {
            const images = Array.isArray(album.images) ? album.images : [];
            const imageCount = images.length;
            const isEmpty = imageCount === 0;
            const coverUrl = album.coverImage
              ? getImageUrl(album.coverImage)
              : images.length > 0 && typeof images[0] !== 'string'
              ? getImageUrl((images[0] as MediaFile).url)
              : '/default-avatar.svg';

            return (
              <div
                key={album._id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div
                  className="aspect-video relative bg-gray-100 dark:bg-gray-700 cursor-pointer"
                  onClick={() => handleManageImages(album)}
                >
                  <img
                    src={coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.onerror = null;
                      img.src = '/default-avatar.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <span className="text-white font-medium text-lg">Gestionar</span>
                  </div>
                  {!isEmpty && album.isPublic && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Público
                    </div>
                  )}
                  {isEmpty && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                      Vacío
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {album.title}
                  </h3>
                  {album.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {album.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    {imageCount} imagen{imageCount !== 1 ? 'es' : ''}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleManageImages(album)}
                      className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Gestionar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlbum(album);
                        setAlbumForm({
                          slug: album.slug,
                          title: album.title,
                          description: album.description || '',
                          isPublic: album.isPublic,
                        });
                        setSlugManuallyEdited(true);
                        setLastTitleForSlug(album.title);
                        setShowEditModal(true);
                      }}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(album.slug);
                      }}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Crear Álbum
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={albumForm.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setAlbumForm({
                      ...albumForm,
                      title: newTitle,
                      slug: slugManuallyEdited
                        ? albumForm.slug
                        : (!albumForm.slug || albumForm.slug === generateSlug(lastTitleForSlug))
                          ? generateSlug(newTitle)
                          : albumForm.slug,
                    });
                    setLastTitleForSlug(newTitle);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Mi Álbum"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={albumForm.slug}
                  onChange={(e) => {
                    setAlbumForm({ ...albumForm, slug: e.target.value });
                    setSlugManuallyEdited(true);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm placeholder-gray-400"
                  placeholder="mi-album"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={albumForm.isPublic}
                    onChange={(e) => setAlbumForm({ ...albumForm, isPublic: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Público
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setAlbumForm({ slug: '', title: '', description: '', isPublic: true });
                  setSlugManuallyEdited(false);
                  setLastTitleForSlug('');
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (desde lista) */}
      {showEditModal && selectedAlbum && viewMode === 'list' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Editar Álbum
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={albumForm.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setAlbumForm({
                      ...albumForm,
                      title: newTitle,
                      slug: slugManuallyEdited
                        ? albumForm.slug
                        : (!albumForm.slug || albumForm.slug === generateSlug(lastTitleForSlug))
                          ? generateSlug(newTitle)
                          : albumForm.slug,
                    });
                    setLastTitleForSlug(newTitle);
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={albumForm.isPublic}
                    onChange={(e) => setAlbumForm({ ...albumForm, isPublic: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Público
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAlbum(null);
                  setAlbumForm({ slug: '', title: '', description: '', isPublic: true });
                  setSlugManuallyEdited(false);
                  setLastTitleForSlug('');
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirmar Eliminación
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  ¿Estás seguro de que quieres eliminar este álbum? Esta acción no se puede
                  deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAlbumToDelete(null);
                }}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
