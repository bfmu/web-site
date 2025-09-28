import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from '../types/auth.types';
import { environment } from '../../environments/environment';

export interface ChangeRoleResponse {
  user: User;
  message: string;
}

export interface ToggleStatusResponse {
  user: User;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/auth`;

  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<User[]>(`${this.API_URL}/users`)
      );
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Change user role (admin only)
  async changeUserRole(userId: string, newRole: 'user' | 'admin' | 'editor'): Promise<ChangeRoleResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<ChangeRoleResponse>(`${this.API_URL}/change-role`, {
          userId,
          newRole
        })
      );
      return response;
    } catch (error) {
      console.error('Error changing user role:', error);
      throw error;
    }
  }

  // Toggle user active status (admin only)
  async toggleUserStatus(userId: string): Promise<ToggleStatusResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<ToggleStatusResponse>(`${this.API_URL}/toggle-user-status`, {
          userId
        })
      );
      return response;
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  }

  // Promote user to admin (admin only)
  async promoteToAdmin(email: string): Promise<ChangeRoleResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<ChangeRoleResponse>(`${this.API_URL}/promote-admin`, {
          email
        })
      );
      return response;
    } catch (error) {
      console.error('Error promoting user to admin:', error);
      throw error;
    }
  }
}
