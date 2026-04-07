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
