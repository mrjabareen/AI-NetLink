export type AppToastType = 'success' | 'error' | 'info';

export interface AppToastPayload {
  title?: string;
  message: string;
  type?: AppToastType;
  duration?: number;
}

export const showAppToast = (payload: AppToastPayload) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: payload }));
};

export const toastSuccess = (message: string, title?: string, duration?: number) =>
  showAppToast({ type: 'success', title, message, duration });

export const toastError = (message: string, title?: string, duration?: number) =>
  showAppToast({ type: 'error', title, message, duration });

export const toastInfo = (message: string, title?: string, duration?: number) =>
  showAppToast({ type: 'info', title, message, duration });
