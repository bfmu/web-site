/**
 * Inicialización de la página de Backup. Se llama al cargar /admin/backup tanto
 * en carga directa como tras transiciones Swup (content:replace).
 */
import { createBackup, validateBackup, restoreBackup, type ValidationResult } from './admin-api';
import { showSuccess, showError, showInfo, showWarning } from './notifications';
import { isAdmin } from './auth';

let backupListenersAttached = false;

export function initBackupPage(): void {
  if (typeof window === 'undefined') return;
  const isBackupPage = window.location.pathname.replace(/\/$/, '').endsWith('/admin/backup');
  if (!isBackupPage) {
    backupListenersAttached = false;
    return;
  }

  if (!isAdmin()) {
    showWarning('Solo administradores pueden usar Backup y Restauración.');
    window.location.href = '/admin';
    return;
  }

  const createBtn = document.getElementById('create-backup-btn') as HTMLButtonElement | null;
  if (!createBtn) return;

  // Evitar adjuntar listeners duplicados
  if (backupListenersAttached) return;
  backupListenersAttached = true;

  const createText = document.getElementById('create-backup-text');
  const createSpinner = document.getElementById('create-backup-spinner');
  const restoreFile = document.getElementById('restore-file') as HTMLInputElement | null;
  const restoreBtn = document.getElementById('restore-backup-btn') as HTMLButtonElement | null;
  const restoreBtnText = document.getElementById('restore-btn-text');
  const restoreBtnSpinner = document.getElementById('restore-btn-spinner');
  const validationStatus = document.getElementById('validation-status');
  const validationContent = document.getElementById('validation-content');
  const restoreModal = document.getElementById('restore-confirm-modal');
  const restoreCancelBtn = document.getElementById('restore-cancel-btn');
  const restoreConfirmBtn = document.getElementById('restore-confirm-btn');

  let lastValidatedFile: File | null = null;
  let lastValidation: ValidationResult | null = null;

  function setCreateLoading(loading: boolean) {
    if (!createBtn || !createText || !createSpinner) return;
    createBtn.disabled = loading;
    createText.textContent = loading ? 'Creando…' : 'Crear Backup';
    createSpinner.classList.toggle('hidden', !loading);
  }

  function setRestoreLoading(loading: boolean) {
    if (!restoreBtn || !restoreBtnText || !restoreBtnSpinner) return;
    restoreBtn.disabled = loading;
    restoreBtnText.textContent = loading ? 'Restaurando…' : 'Restaurar';
    restoreBtnSpinner?.classList.toggle('hidden', !loading);
  }

  function setRestoreEnabled(enabled: boolean) {
    if (restoreBtn) restoreBtn.disabled = !enabled;
  }

  function showValidationStatusText(status: string, isError: boolean) {
    if (validationStatus) {
      validationStatus.textContent = status;
      validationStatus.className =
        'text-sm ' + (isError ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400');
    }
  }

  async function runValidation(file: File) {
    if (!file) {
      setRestoreEnabled(false);
      lastValidatedFile = null;
      lastValidation = null;
      showValidationStatusText('Selecciona un archivo .tar.gz para validar automáticamente', false);
      validationContent?.classList.add('hidden');
      return;
    }
    setRestoreEnabled(false);
    showValidationStatusText('Validando…', false);
    validationContent?.classList.add('hidden');
    try {
      const result = await validateBackup(file);
      lastValidatedFile = file;
      lastValidation = result;
      if (validationContent) {
        validationContent.textContent = JSON.stringify(
          { valid: result.valid, metadata: result.metadata, warnings: result.warnings, error: result.error },
          null,
          2
        );
      }
      if (result.valid) {
        setRestoreEnabled(true);
        showValidationStatusText('✓ Backup válido. Puedes pulsar Restaurar.', false);
        validationContent?.classList.remove('hidden');
        showSuccess('Backup válido.');
      } else {
        const errMsg = result.error || 'Backup inválido.';
        showValidationStatusText('✗ ' + errMsg, true);
        validationContent?.classList.remove('hidden');
        showWarning(errMsg);
      }
    } catch (e: unknown) {
      lastValidation = null;
      lastValidatedFile = null;
      setRestoreEnabled(false);
      const msg = (e as { message?: string })?.message || 'Error al validar.';
      showValidationStatusText('✗ ' + msg, true);
      if (validationContent) {
        validationContent.textContent = String((e as Error)?.stack || e);
        validationContent.classList.remove('hidden');
      }
      showError(msg);
    }
  }

  function openRestoreModal() {
    restoreModal?.classList.remove('hidden');
    restoreModal?.classList.add('flex');
  }

  function closeRestoreModal() {
    restoreModal?.classList.add('hidden');
    restoreModal?.classList.remove('flex');
  }

  createBtn.addEventListener('click', async () => {
    setCreateLoading(true);
    try {
      const blob = await createBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.tar.gz`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Backup descargado correctamente.');
    } catch (e: unknown) {
      showError((e as { message?: string })?.message || 'Error al crear backup.');
    } finally {
      setCreateLoading(false);
    }
  });

  restoreFile?.addEventListener('change', () => {
    const file = restoreFile?.files?.[0];
    if (file) runValidation(file);
    else {
      lastValidatedFile = null;
      lastValidation = null;
      setRestoreEnabled(false);
      showValidationStatusText('Selecciona un archivo .tar.gz para validar automáticamente', false);
      validationContent?.classList.add('hidden');
    }
  });

  restoreCancelBtn?.addEventListener('click', closeRestoreModal);
  restoreModal?.addEventListener('click', (e) => {
    if (e.target === restoreModal) closeRestoreModal();
  });

  restoreBtn?.addEventListener('click', async () => {
    const file = restoreFile?.files?.[0];
    if (!file) {
      showWarning('Selecciona un archivo .tar.gz.');
      return;
    }
    if (!lastValidation?.valid || lastValidatedFile !== file) {
      showInfo('Validando backup…');
      try {
        const result = await validateBackup(file);
        lastValidation = result;
        lastValidatedFile = file;
        if (!result.valid) {
          showError(result.error || 'Backup inválido. No se puede restaurar.');
          return;
        }
      } catch (e: unknown) {
        showError((e as { message?: string })?.message || 'Error al validar.');
        return;
      }
    }
    openRestoreModal();
  });

  restoreConfirmBtn?.addEventListener('click', async () => {
    const file = restoreFile?.files?.[0];
    closeRestoreModal();
    if (!file) {
      showWarning('No se encontró el archivo. Por favor, selecciona de nuevo el archivo .tar.gz.');
      return;
    }
    setRestoreLoading(true);
    try {
      const result = await restoreBackup(file);
      if (result.success) {
        showSuccess('Restauración completada. Recargando…');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const errMsg = result.error || 'Error al restaurar.';
        console.error('[Backup] Restore failed:', result);
        showError(errMsg);
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Error al restaurar.';
      console.error('[Backup] Restore error:', e);
      showError(msg);
    } finally {
      setRestoreLoading(false);
    }
  });
}
