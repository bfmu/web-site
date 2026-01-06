import { useState, useEffect } from 'react';
import { getUser, setUser } from '../../lib/auth';
import { getProfile, updateProfile, uploadAvatar } from '../../lib/admin-api';
import { apiGet } from '../../lib/api';

export function ProfileEditor() {
  const [loading, setLoading] = useState(false);
  const [user, setUserState] = useState<any>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const currentUser = getUser();
      if (currentUser) {
        setUserState(currentUser);
        setName(currentUser.name || '');
        setAvatar(currentUser.avatar || '/default-avatar.png');
        setPreview(currentUser.avatar || '/default-avatar.png');
      }

      // Cargar perfil actualizado del servidor
      const profile = await getProfile();
      setUserState(profile);
      setName(profile.name || '');
      const avatarUrl = profile.avatar || '/default-avatar.svg';
      setAvatar(avatarUrl);
      // Construir URL completa para preview
      setPreview(getAvatarUrl(avatarUrl));
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      setMessage({ type: 'error', text: 'Error al cargar el perfil' });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
        setMessage({ type: 'error', text: 'Solo se permiten imágenes (jpg, jpeg, png, gif, webp)' });
        return;
      }

      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'La imagen no puede ser mayor a 5MB' });
        return;
      }

      setAvatarFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let avatarUrl = avatar;

      // Subir avatar si hay uno nuevo
      if (avatarFile) {
        const uploadResult = await uploadAvatar(avatarFile);
        avatarUrl = uploadResult.url;
      }

      // Actualizar perfil
      const updatedProfile = await updateProfile({
        name: name.trim(),
        avatar: avatarUrl,
      });

      // Actualizar usuario en localStorage
      const currentUser = getUser();
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          name: updatedProfile.name,
          avatar: updatedProfile.avatar || '/default-avatar.png',
        };
        setUser(updatedUser);
        setUserState(updatedUser);
      }

      setAvatar(avatarUrl);
      setAvatarFile(null);
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      setMessage({
        type: 'error',
        text: error?.message || 'Error al actualizar el perfil',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (url: string): string => {
    if (!url || url === '/default-avatar.png' || url === '/default-avatar.svg') {
      return '/default-avatar.svg';
    }
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) {
      // Construir URL completa del backend
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/';
      return `${apiUrl.replace(/\/$/, '')}${url}`;
    }
    if (url.startsWith('/')) {
      // Para rutas absolutas que no sean uploads, usar directamente
      return url;
    }
    return url;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Mi Perfil
        </h2>

        {message && (
          <div
            className={`mb-4 rounded-md p-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <img
                src={preview || getAvatarUrl(avatar)}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.svg';
                }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Avatar
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100
                  dark:file:bg-indigo-900/20 dark:file:text-indigo-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                JPG, PNG, GIF o WEBP. Máximo 5MB.
              </p>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nombre
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              placeholder="Tu nombre"
            />
          </div>

          {/* Email (solo lectura) */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={user.email || ''}
              disabled
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              El email no se puede cambiar
            </p>
          </div>

          {/* Rol (solo lectura) */}
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Rol
            </label>
            <input
              type="text"
              id="role"
              value={user.role || 'user'}
              disabled
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed capitalize"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
            <a
              href="/admin"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </a>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

