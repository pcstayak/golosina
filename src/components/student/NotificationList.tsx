'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService, Notification } from '@/services/notificationService';
import { Bell, CheckCircle, MessageSquare, Reply, Calendar, Eye, X } from 'lucide-react';
import Link from 'next/link';

interface NotificationListProps {
  showAll?: boolean;
  maxItems?: number;
}

export default function NotificationList({ showAll = false, maxItems = 5 }: NotificationListProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const subscription = NotificationService.subscribeToNotifications(user.id, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await NotificationService.getUserNotifications(user.id, !showAll);
      setNotifications(data.slice(0, maxItems));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await NotificationService.markAsRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    const result = await NotificationService.markAllAsRead(user.id);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    }
  };

  const handleDelete = async (notificationId: string) => {
    const result = await NotificationService.deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'practice_reviewed':
        return <CheckCircle className="w-5 h-5" style={{ color: 'var(--primary)' }} />;
      case 'new_comment':
        return <MessageSquare className="w-5 h-5" style={{ color: 'var(--primary)' }} />;
      case 'comment_reply':
        return <Reply className="w-5 h-5" style={{ color: 'var(--primary)' }} />;
      default:
        return <Bell className="w-5 h-5" style={{ color: 'var(--muted)' }} />;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--panel)] rounded-lg border border-[var(--border)] p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto"></div>
        <p className="text-center text-[var(--muted)] mt-4">Loading notifications...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="bg-[var(--panel)] rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--primary-contrast)] flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-semibold bg-[var(--primary-contrast)] text-[var(--primary)] rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 text-[var(--primary-contrast)] rounded transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center">
          <Bell className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">No Notifications</h3>
          <p className="text-[var(--muted)]">You are all caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 transition-colors ${!notification.is_read ? 'bg-[rgba(var(--primary-rgb),0.05)]' : 'bg-[var(--panel)] hover:bg-[var(--panel-hover)]'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.notification_type)}</div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/practices/${notification.practice_id}`}
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="block group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                        {notification.title}
                        {!notification.is_read && (
                          <span className="ml-2 inline-block w-2 h-2 bg-[var(--primary)] rounded-full"></span>
                        )}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="flex-shrink-0 p-1 text-[var(--muted)] hover:text-red-500 transition-colors"
                        title="Delete notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm text-[var(--muted)] mb-2">{notification.message}</p>

                    <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(notification.created_at)}</span>
                      </div>
                      {!notification.is_read && (
                        <span className="px-2 py-0.5 bg-[var(--primary)] text-[var(--primary-contrast)] rounded font-medium">
                          New
                        </span>
                      )}
                    </div>
                  </Link>
                </div>

                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="flex-shrink-0 p-2 text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                    title="Mark as read"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length > 0 && !showAll && (
        <div className="p-4 bg-[var(--panel-2)] text-center">
          <Link
            href="/student/notifications"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
