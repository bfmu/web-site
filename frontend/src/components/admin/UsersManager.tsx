import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, ApiException } from '@/lib/api';
import { showSuccess, showError } from '@/lib/notifications';

interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'user';
  isActive: boolean;
  provider: string;
}

type RoleFilter = 'all' | 'admin' | 'editor' | 'user';

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user' as 'admin' | 'editor' | 'user',
  });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<User[]>('auth/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading users:', err);
      showError(err instanceof ApiException ? err.message : 'Error al cargar usuarios');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers =
    roleFilter === 'all'
      ? users
      : users.filter((u) => u.role === roleFilter);

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'editor' | 'user') => {
    try {
      setUpdatingUserId(userId);
      await apiPost('auth/change-role', { userId, newRole });
      showSuccess('Rol actualizado');
      await loadUsers();
    } catch (err) {
      showError(err instanceof ApiException ? err.message : 'Error al cambiar rol');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      setUpdatingUserId(userId);
      await apiPost('auth/toggle-user-status', { userId });
      showSuccess('Estado actualizado');
      await loadUsers();
    } catch (err) {
      showError(err instanceof ApiException ? err.message : 'Error al cambiar estado');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email.trim() || !createForm.name.trim() || !createForm.password.trim()) {
      showError('Completa todos los campos');
      return;
    }
    if (createForm.password.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      setCreating(true);
      await apiPost('auth/users', {
        email: createForm.email.trim(),
        name: createForm.name.trim(),
        password: createForm.password,
        role: createForm.role,
      });
      showSuccess('Usuario creado correctamente');
      setShowCreateModal(false);
      setCreateForm({ email: '', name: '', password: '', role: 'user' });
      await loadUsers();
    } catch (err) {
      showError(err instanceof ApiException ? err.message : 'Error al crear usuario');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Usuarios</h2>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="user">Usuario</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear usuario
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No hay usuarios para mostrar
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar || '/default-avatar.svg'}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleChangeRole(user._id, e.target.value as 'admin' | 'editor' | 'user')
                          }
                          disabled={updatingUserId === user._id}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 disabled:opacity-50"
                        >
                          <option value="user">Usuario</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user._id)}
                          disabled={updatingUserId === user._id}
                          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                            user.isActive
                              ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20'
                              : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                          }`}
                        >
                          {user.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 id="create-user-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Crear usuario
            </h3>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contraseña (mín. 6 caracteres)
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rol
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, role: e.target.value as 'admin' | 'editor' | 'user' }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="user">Usuario</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
