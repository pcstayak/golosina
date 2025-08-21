'use client'

import { useNotification } from '@/hooks/useNotification';
import { useEffect } from 'react';

export default function StatusNotification() {
  const { notification, hideNotification } = useNotification();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        hideNotification();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification, hideNotification]);

  if (!notification) return null;

  return (
    <div className={`status-message ${notification.type}`}>
      {notification.message}
    </div>
  );
}