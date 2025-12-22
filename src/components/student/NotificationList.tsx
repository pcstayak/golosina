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
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'new_comment':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'comment_reply':
        return <Reply className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'practice_reviewed':
        return 'bg-green-50 border-green-200';
      case 'new_comment':
        return 'bg-blue-50 border-blue-200';
      case 'comment_reply':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
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
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-center text-gray-600 mt-4">Loading notifications...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-semibold bg-white text-purple-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Notifications</h3>
          <p className="text-gray-600">You are all caught up!</p>
        </div>
      ) : (
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 transition-colors ${!notification.is_read ? getNotificationColor(notification.notification_type) : 'bg-white hover:bg-gray-50'
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
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {notification.title}
                        {!notification.is_read && (
                          <span className="ml-2 inline-block w-2 h-2 bg-purple-600 rounded-full"></span>
                        )}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-700 mb-2">{notification.message}</p>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(notification.created_at)}</span>
                      </div>
                      {!notification.is_read && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                          New
                        </span>
                      )}
                    </div>
                  </Link>
                </div>

                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-purple-600 transition-colors"
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
        <div className="p-4 bg-gray-50 text-center">
          <Link
            href="/student/notifications"
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
