'use client'

import { create } from 'zustand'

interface Notification {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface NotificationStore {
  notification: Notification | null;
  showNotification: (message: string, type: Notification['type']) => void;
  hideNotification: () => void;
}

const useNotificationStore = create<NotificationStore>((set) => ({
  notification: null,
  showNotification: (message: string, type: Notification['type']) => {
    set({ notification: { message, type } });
  },
  hideNotification: () => {
    set({ notification: null });
  },
}));

export const useNotification = () => {
  const { notification, showNotification, hideNotification } = useNotificationStore();

  const showSuccess = (message: string) => showNotification(message, 'success');
  const showError = (message: string) => showNotification(message, 'error');
  const showWarning = (message: string) => showNotification(message, 'warning');
  const showInfo = (message: string) => showNotification(message, 'info');

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};