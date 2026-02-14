import { Toaster as SonnerToaster } from 'sonner';

const toastClassBase =
  'flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg max-w-[400px] border-l-4';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={3000}
      closeButton
      theme="system"
      offset={{ bottom: 20, right: 20 }}
      mobileOffset={{ bottom: 20, right: 20 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: toastClassBase,
          success:
            'bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-800',
          error:
            'bg-red-500 text-white border-red-600 dark:bg-red-900 dark:text-red-100 dark:border-red-800',
          warning:
            'bg-amber-100 text-amber-900 border-amber-500 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-500',
          info: 'bg-blue-50 text-blue-900 border-blue-500 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-500',
        },
      }}
    />
  );
}
