import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: 'practice_reviewed' | 'new_comment' | 'comment_reply';
  practice_id: string;
  reference_id?: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  metadata: {
    lesson_title?: string;
    comment_id?: string;
    commenter_name?: string;
    recording_id?: string;
    reviewed_by?: string;
    parent_comment_id?: string;
  };
}

export interface NotificationStats {
  total_unread: number;
  unread_reviews: number;
  unread_comments: number;
  unread_replies: number;
}

export class NotificationService {
  static async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async getNotificationStats(userId: string): Promise<NotificationStats> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return {
        total_unread: 0,
        unread_reviews: 0,
        unread_comments: 0,
        unread_replies: 0,
      };
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('notification_type')
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching notification stats:', error);
        return {
          total_unread: 0,
          unread_reviews: 0,
          unread_comments: 0,
          unread_replies: 0,
        };
      }

      const stats: NotificationStats = {
        total_unread: data.length,
        unread_reviews: data.filter((n) => n.notification_type === 'practice_reviewed').length,
        unread_comments: data.filter((n) => n.notification_type === 'new_comment').length,
        unread_replies: data.filter((n) => n.notification_type === 'comment_reply').length,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return {
        total_unread: 0,
        unread_reviews: 0,
        unread_comments: 0,
        unread_replies: 0,
      };
    }
  }

  static async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: 'Failed to mark notification as read' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error: 'Failed to mark notifications as read' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async markPracticeNotificationsAsRead(
    userId: string,
    practiceId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('practice_id', practiceId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking practice notifications as read:', error);
        return { success: false, error: 'Failed to mark notifications as read' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking practice notifications as read:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error: 'Failed to delete notification' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async getUnreadCountForPractice(userId: string, practiceId: string): Promise<number> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('practice_id', practiceId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  static async updatePracticeLastViewed(
    practiceId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('practices')
        .update({
          last_viewed_at: new Date().toISOString(),
          last_viewed_by: userId,
        })
        .eq('practice_id', practiceId);

      if (error) {
        console.error('Error updating practice last viewed:', error);
        return { success: false, error: 'Failed to update last viewed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating practice last viewed:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ): { unsubscribe: () => void } {
    if (!supabase) {
      return { unsubscribe: () => {} };
    }

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  }
}
