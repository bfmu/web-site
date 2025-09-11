import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
// DataTableComponent removido para simplificar
import { User } from '../../types/auth.types';
// Removido imports de lucide-angular para simplificar

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          👥 Gestión de Usuarios
        </h1>
        <p class="text-gray-600">
          Administra usuarios, roles y permisos del sistema
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white p-4 rounded-lg border">
          <div class="flex items-center">
            <div class="w-8 h-8 text-blue-500 flex items-center justify-center text-xl">👥</div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Usuarios</p>
              <p class="text-2xl font-semibold text-gray-900">{{ totalUsers() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg border">
          <div class="flex items-center">
            <div class="w-8 h-8 text-yellow-500 flex items-center justify-center text-xl">👑</div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Administradores</p>
              <p class="text-2xl font-semibold text-gray-900">{{ adminCount() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg border">
          <div class="flex items-center">
            <div class="w-8 h-8 text-green-500 flex items-center justify-center text-xl">✅</div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Activos</p>
              <p class="text-2xl font-semibold text-gray-900">{{ activeUsers() }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg border">
          <div class="flex items-center">
            <div class="w-8 h-8 text-red-500 flex items-center justify-center text-xl">❌</div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Inactivos</p>
              <p class="text-2xl font-semibold text-gray-900">{{ inactiveUsers() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-lg border overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Lista de Usuarios</h3>
        </div>
        
        @if (loading()) {
          <div class="p-8 text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p class="mt-2 text-gray-500">Cargando usuarios...</p>
          </div>
        } @else if (users().length === 0) {
          <div class="p-8 text-center">
            <p class="text-gray-500">No hay usuarios registrados</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (user of users(); track user._id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                          @if (user.avatar) {
                            <img class="h-10 w-10 rounded-full" [src]="user.avatar" [alt]="user.name">
                          } @else {
                            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span class="text-sm font-medium text-gray-700">{{ user.name.charAt(0).toUpperCase() }}</span>
                            </div>
                          }
                        </div>
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                          <div class="text-sm text-gray-500">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class.bg-yellow-100]="user.role === 'admin'"
                        [class.text-yellow-800]="user.role === 'admin'"
                        [class.bg-blue-100]="user.role === 'editor'"
                        [class.text-blue-800]="user.role === 'editor'"
                        [class.bg-gray-100]="user.role === 'user'"
                        [class.text-gray-800]="user.role === 'user'"
                      >
                        {{ user.role === 'admin' ? '👑 Admin' : user.role === 'editor' ? '✏️ Editor' : '👤 Usuario' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class.bg-green-100]="user.isActive"
                        [class.text-green-800]="user.isActive"
                        [class.bg-red-100]="!user.isActive"
                        [class.text-red-800]="!user.isActive"
                      >
                        {{ user.isActive ? '✅ Activo' : '❌ Inactivo' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ user.provider === 'local' ? '📧 Email' : user.provider === 'google' ? '🔍 Google' : '🐙 GitHub' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex gap-2">
                        <button 
                          (click)="openRoleModal(user)"
                          class="text-blue-600 hover:text-blue-900 px-2 py-1 rounded text-sm"
                          title="Cambiar rol"
                        >
                          ✏️
                        </button>
                        <button 
                          (click)="toggleUserStatus(user._id!)"
                          [class.text-red-600]="user.isActive"
                          [class.hover:text-red-900]="user.isActive"
                          [class.text-green-600]="!user.isActive"
                          [class.hover:text-green-900]="!user.isActive"
                          class="px-2 py-1 rounded text-sm"
                          [title]="user.isActive ? 'Desactivar' : 'Activar'"
                        >
                          {{ user.isActive ? '❌' : '✅' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Change Role Modal -->
      @if (showRoleModal()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 class="text-lg font-semibold mb-4">Cambiar Rol de Usuario</h3>
            <p class="text-gray-600 mb-4">
              Cambiar rol de: <strong>{{ selectedUser()?.name }}</strong>
            </p>
            
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Rol
              </label>
              <select 
                [(ngModel)]="newRole" 
                class="input w-full"
              >
                <option value="user">👤 Usuario</option>
                <option value="editor">✏️ Editor</option>
                <option value="admin">👑 Administrador</option>
              </select>
            </div>

            <div class="flex gap-3">
              <button 
                (click)="changeRole()" 
                [disabled]="changingRole()"
                class="btn btn-primary flex-1"
              >
                @if (changingRole()) {
                  Cambiando...
                } @else {
                  Cambiar Rol
                }
              </button>
              <button 
                (click)="closeRoleModal()" 
                class="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class UsersListComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  // Signals
  users = signal<User[]>([]);
  loading = signal(false);
  showRoleModal = signal(false);
  selectedUser = signal<User | null>(null);
  changingRole = signal(false);
  newRole = 'user';

  // Computed values
  totalUsers = computed(() => this.users().length);
  adminCount = computed(() => this.users().filter(u => u.role === 'admin').length);
  activeUsers = computed(() => this.users().filter(u => u.isActive).length);
  inactiveUsers = computed(() => this.users().filter(u => !u.isActive).length);

  // Columnas removidas - ahora usamos tabla HTML simple

  ngOnInit() {
    this.loadUsers();
  }

  private async loadUsers() {
    this.loading.set(true);
    try {
      const users = await this.userService.getAllUsers();
      this.users.set(users);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async changeRole() {
    const user = this.selectedUser();
    if (!user) return;

    this.changingRole.set(true);
    try {
      await this.userService.changeUserRole(user._id!, this.newRole as any);
      await this.loadUsers(); // Recargar lista
      this.closeRoleModal();
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      this.changingRole.set(false);
    }
  }

  async toggleUserStatus(userId: string) {
    try {
      await this.userService.toggleUserStatus(userId);
      await this.loadUsers(); // Recargar lista
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  }

  openRoleModal(user: User) {
    this.selectedUser.set(user);
    this.newRole = user.role;
    this.showRoleModal.set(true);
  }

  closeRoleModal() {
    this.showRoleModal.set(false);
    this.selectedUser.set(null);
  }
}
