import { Routes } from '@angular/router';
import { authGuard, editorGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register', 
        loadComponent: () => import('./pages/auth/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'callback',
        loadComponent: () => import('./pages/auth/callback.component').then(m => m.AuthCallbackComponent)
      }
    ]
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'posts',
    canActivate: [editorGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/posts/posts-list.component').then(m => m.PostsListComponent)
      },
      {
        path: 'new',
        loadComponent: () => import('./pages/posts/post-editor.component').then(m => m.PostEditorComponent)
      },
      {
        path: 'edit/:slug',
        loadComponent: () => import('./pages/posts/post-editor.component').then(m => m.PostEditorComponent)
      }
    ]
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users-list.component').then(m => m.UsersListComponent),
    canActivate: [authGuard] // Solo admins pueden ver usuarios
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
