// Helper functions para notificaciones consistentes usando Notyf
import { Notyf } from 'notyf';

declare global {
  interface Window {
    notyf: Notyf;
  }
}

function getNotyf(): Notyf | null {
  if (typeof window !== 'undefined' && window.notyf) {
    return window.notyf;
  }
  return null;
}

export function showSuccess(message: string) {
  const notyf = getNotyf();
  if (notyf) {
    notyf.success(message);
  }
}

export function showError(message: string) {
  const notyf = getNotyf();
  if (notyf) {
    notyf.error(message);
  }
}

export function showWarning(message: string) {
  const notyf = getNotyf();
  if (notyf) {
    notyf.open({
      type: 'warning',
      message,
      duration: 3500,
      className: 'notyf-warning',
    });
  }
}

export function showInfo(message: string) {
  const notyf = getNotyf();
  if (notyf) {
    notyf.open({
      type: 'info',
      message,
      duration: 3000,
      className: 'notyf-info',
    });
  }
}
