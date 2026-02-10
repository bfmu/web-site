import React, { useState, useEffect } from 'react';
import {
  getAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  addImageToAlbum,
  removeImageFromAlbum,
  reorderAlbumImages,
  setAlbumCover,
  getMediaList,
  type Album,
  type MediaFile,
} from '../../lib/admin-api';
import { getBackendResourceUrl } from '../../lib/env';

export default function AlbumManager() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumForm, setAlbumForm] = useState({
    slug: '',
    title: '',
    description: '',
    isPublic: true,
  });
  const [availableMedia, setAvailableMedia] = useState<MediaFile[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [lastTitleForSlug, setLastTitleForSlug] = useState('');

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      const response = await getAlbums({});
      setAlbums(response.albums);
    } catch (error: any) {
      console.error('Error loading albums:', error);
      setMessage({ type: 'error', text: 'Error al cargar álbumes' });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableMedia = async () => {
    try {
      const response = await getMediaList({ type: 'image', limit: 100 });
      setAvailableMedia(response.media);
    } catch (error) {
      console.error('Error loading media:', error);
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
      setMessage({ type: 'error', text: 'El título es requerido' });
      return;
    }

    try {
      const slug = albumForm.slug || generateSlug(albumForm.title);
      await createAlbum({
        ...albumForm,
        slug,
      });
      setMessage({ type: 'success', text: 'Álbum creado correctamente' });
      setShowCreateModal(false);
      setAlbumForm({ slug: '', title: '', description: '', isPublic: true });
      loadAlbums();
    } catch (error: any) {
      console.error('Error creating album:', error);
      setMessage({ type: 'error', text: error.message || 'Error al crear álbum' });
    }
  };

  const handleUpdate = async () => {
    if (!selectedAlbum || !albumForm.title.trim()) {
      return;
    }

    try {
      await updateAlbum(selectedAlbum.slug, albumForm);
      setMessage({ type: 'success', text: 'Álbum actualizado correctamente' });
      setShowEditModal(false);
      setSelectedAlbum(null);
      setAlbumForm({ slug: '', title: '', description: '', isPublic: true });
      loadAlbums();
    } catch (error: any) {
      console.error('Error updating album:', error);
      setMessage({ type: 'error', text: error.message || 'Error al actualizar álbum' });
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
      setMessage({ type: 'success', text: 'Álbum eliminado correctamente' });
      loadAlbums();
    } catch (error: any) {
      console.error('Error deleting album:', error);
      setMessage({ type: 'error', text: error.message || 'Error al eliminar álbum' });
    } finally {
      setShowDeleteModal(false);
      setAlbumToDelete(null);
    }
  };

  const handleManageImages = async (album: Album) => {
    setSelectedAlbum(album);
    await loadAvailableMedia();
    setShowManageModal(true);
  };

  const handleAddImage = async (mediaId: string) => {
    if (!selectedAlbum) return;

    try {
      await addImageToAlbum(selectedAlbum.slug, mediaId);
      setMessage({ type: 'success', text: 'Imagen agregada al álbum' });
      loadAlbums();
      await loadAvailableMedia();
    } catch (error: any) {
      console.error('Error adding image:', error);
      setMessage({ type: 'error', text: error.message || 'Error al agregar imagen' });
    }
  };

  const handleRemoveImage = async (mediaId: string) => {
    if (!selectedAlbum) return;

    try {
      await removeImageFromAlbum(selectedAlbum.slug, mediaId);
      setMessage({ type: 'success', text: 'Imagen removida del álbum' });
      loadAlbums();
    } catch (error: any) {
      console.error('Error removing image:', error);
      setMessage({ type: 'error', text: error.message || 'Error al remover imagen' });
    }
  };

  const handleSetCover = async (mediaId: string) => {
    if (!selectedAlbum) return;

    try {
      await setAlbumCover(selectedAlbum.slug, mediaId);
      setMessage({ type: 'success', text: 'Portada establecida' });
      loadAlbums();
    } catch (error: any) {
      console.error('Error setting cover:', error);
      setMessage({ type: 'error', text: error.message || 'Error al establecer portada' });
    }
  };

  const getImageUrl = (url: string): string => {
    if (url.startsWith('http')) return url;
    return getBackendResourceUrl(url);
  };

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
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Crear Álbum
        </button>
      </div>

      {/* Messages */}
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

      {/* Albums Grid */}
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400">Cargando...</div>
      ) : albums.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400">
          No hay álbumes. Crea uno para comenzar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => {
            const images = Array.isArray(album.images) ? album.images : [];
            const imageCount = images.length;
            const coverUrl = album.coverImage
              ? getImageUrl(album.coverImage)
              : images.length > 0 && typeof images[0] !== 'string'
              ? getImageUrl((images[0] as MediaFile).url)
              : '/default-avatar.svg';

            return (
              <div
                key={album._id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video relative bg-gray-100 dark:bg-gray-700">
                  <img
                    src={coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.svg';
                    }}
                  />
                  {album.isPublic && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Público
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
                      className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Gestionar
                    </button>
                    <button
                    onClick={() => {
                      setSelectedAlbum(album);
                      setAlbumForm({
                        slug: album.slug,
                        title: album.title,
                        description: album.description || '',
                        isPublic: album.isPublic,
                      });
                      setSlugManuallyEdited(true); // En edición, el slug ya existe, no auto-generar
                      setLastTitleForSlug(album.title);
                      setShowEditModal(true);
                    }}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(album.slug)}
                      className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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

      {/* Manage Images Modal */}
      {showManageModal && selectedAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gestionar Imágenes: {selectedAlbum.title}
              </h3>
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedAlbum(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Current Images */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Imágenes en el álbum ({Array.isArray(selectedAlbum.images) ? selectedAlbum.images.length : 0})
              </h4>
              <div className="grid grid-cols-4 gap-4">
                {Array.isArray(selectedAlbum.images) &&
                  selectedAlbum.images.map((img: any) => {
                    const image = typeof img === 'string' ? null : (img as MediaFile);
                    const imageId = typeof img === 'string' ? img : image?._id;
                    const imageUrl = image
                      ? getImageUrl(image.url)
                      : '/default-avatar.svg';

                    return (
                      <div key={imageId} className="relative group">
                        <img
                          src={imageUrl}
                          alt={image?.alt || 'Imagen'}
                          className="w-full aspect-square object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-avatar.svg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => handleSetCover(imageId)}
                            className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                            title="Establecer como portada"
                          >
                            Portada
                          </button>
                          <button
                            onClick={() => handleRemoveImage(imageId)}
                            className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            title="Remover"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Available Images */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agregar imágenes disponibles
              </h4>
              <div className="grid grid-cols-4 gap-4">
                {availableMedia
                  .filter((media) => {
                    const images = Array.isArray(selectedAlbum.images) ? selectedAlbum.images : [];
                    return !images.some(
                      (img: any) => (typeof img === 'string' ? img : img._id) === media._id,
                    );
                  })
                  .map((media) => (
                    <div
                      key={media._id}
                      className="relative group cursor-pointer"
                      onClick={() => handleAddImage(media._id)}
                    >
                      <img
                        src={getImageUrl(media.url)}
                        alt={media.alt || media.originalName}
                        className="w-full aspect-square object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-avatar.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-sm font-medium">Agregar</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirmar Eliminación
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  ¿Estás seguro de que quieres eliminar este álbum? Esta acción no se puede deshacer.
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

