import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Notification Container -->
    <div class="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div 
          class="notification-card transform transition-all duration-300 ease-in-out"
          [class]="getNotificationClasses(notification.type)"
          role="alert"
        >
          <div class="flex items-start">
            <!-- Icon -->
            <div class="flex-shrink-0 mr-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @switch (notification.type) {
                  @case ('success') {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  }
                  @case ('error') {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  }
                  @case ('warning') {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  }
                  @case ('info') {
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  }
                }
              </svg>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold">{{ notification.title }}</h4>
              @if (notification.message) {
                <p class="text-sm opacity-90 mt-1">{{ notification.message }}</p>
              }
              
              <!-- Actions -->
              @if (notification.actions && notification.actions.length > 0) {
                <div class="flex space-x-2 mt-3">
                  @for (action of notification.actions; track $index) {
                    <button
                      type="button"
                      (click)="action.action()"
                      class="text-xs font-medium px-3 py-1 rounded-md transition-colors"
                      [class]="getActionClasses(action.style || 'primary', notification.type)"
                    >
                      {{ action.label }}
                    </button>
                  }
                </div>
              }
            </div>
            
            <!-- Close Button -->
            <button
              type="button"
              (click)="notificationService.dismiss(notification.id)"
              class="flex-shrink-0 ml-3 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-card {
      @apply bg-white rounded-lg shadow-lg border-l-4 p-4 backdrop-blur-sm;
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class NotificationComponent {
  protected readonly notificationService = inject(NotificationService);

  protected getNotificationClasses(type: string): string {
    const baseClasses = 'text-white';
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-500 border-green-600`;
      case 'error':
        return `${baseClasses} bg-red-500 border-red-600`;
      case 'warning':
        return `${baseClasses} bg-yellow-500 border-yellow-600`;
      case 'info':
        return `${baseClasses} bg-blue-500 border-blue-600`;
      default:
        return `${baseClasses} bg-gray-500 border-gray-600`;
    }
  }

  protected getActionClasses(style: string, notificationType: string): string {
    if (style === 'secondary') {
      return 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white';
    }
    
    // Primary button - contrasting color based on notification type
    switch (notificationType) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  }
}


