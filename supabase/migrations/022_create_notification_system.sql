-- Create notification system for students and teachers
-- Tracks practice reviews, new comments, and other activity

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('practice_reviewed', 'new_comment', 'comment_reply')),
  practice_id TEXT NOT NULL,
  reference_id TEXT, -- can store comment_id, recording_id, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_practice_id ON public.notifications(practice_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can insert notifications (will be done via service)
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Function to reset practice review status when a new comment is added
CREATE OR REPLACE FUNCTION reset_practice_review_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only reset if the practice was previously reviewed
  UPDATE public.practices
  SET
    reviewed_at = NULL,
    reviewed_by = NULL,
    updated_at = NOW()
  WHERE
    practice_id = NEW.practice_id
    AND reviewed_at IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to reset review status when a comment is added
DROP TRIGGER IF EXISTS reset_review_on_comment ON public.practice_comments;
CREATE TRIGGER reset_review_on_comment
  AFTER INSERT ON public.practice_comments
  FOR EACH ROW
  EXECUTE FUNCTION reset_practice_review_on_comment();

-- Function to create notification when practice is reviewed
CREATE OR REPLACE FUNCTION notify_on_practice_reviewed()
RETURNS TRIGGER AS $$
DECLARE
  practice_owner UUID;
  lesson_title TEXT;
BEGIN
  -- Only create notification if reviewed_at was just set (was NULL before)
  IF NEW.reviewed_at IS NOT NULL AND OLD.reviewed_at IS NULL THEN
    -- Get the practice owner
    SELECT created_by INTO practice_owner
    FROM public.practices
    WHERE practice_id = NEW.practice_id;

    -- Get lesson title if available
    SELECT title INTO lesson_title
    FROM public.lessons
    WHERE id = NEW.lesson_id;

    -- Create notification for practice owner
    INSERT INTO public.notifications (
      user_id,
      notification_type,
      practice_id,
      reference_id,
      title,
      message,
      metadata
    ) VALUES (
      practice_owner,
      'practice_reviewed',
      NEW.practice_id,
      NEW.reviewed_by::TEXT,
      'Practice Reviewed',
      'Your practice for "' || COALESCE(lesson_title, 'Untitled Lesson') || '" has been reviewed by your teacher',
      jsonb_build_object(
        'lesson_title', COALESCE(lesson_title, 'Untitled Lesson'),
        'reviewed_by', NEW.reviewed_by
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification when practice is reviewed
DROP TRIGGER IF EXISTS notify_practice_reviewed ON public.practices;
CREATE TRIGGER notify_practice_reviewed
  AFTER UPDATE ON public.practices
  FOR EACH ROW
  WHEN (NEW.reviewed_at IS NOT NULL AND OLD.reviewed_at IS NULL)
  EXECUTE FUNCTION notify_on_practice_reviewed();

-- Function to create notification when a comment is added
CREATE OR REPLACE FUNCTION notify_on_comment_added()
RETURNS TRIGGER AS $$
DECLARE
  practice_owner UUID;
  comment_author UUID;
  lesson_title TEXT;
  practice_record RECORD;
BEGIN
  -- Get practice details
  SELECT p.created_by, p.lesson_id, l.title
  INTO practice_record
  FROM public.practices p
  LEFT JOIN public.lessons l ON p.lesson_id = l.id
  WHERE p.practice_id = NEW.practice_id;

  practice_owner := practice_record.created_by;
  lesson_title := COALESCE(practice_record.title, 'Untitled Lesson');

  -- Get comment author user_id (may be null for anonymous comments)
  comment_author := NEW.user_id;

  -- Notify practice owner if someone else commented
  IF comment_author IS NULL OR comment_author != practice_owner THEN
    INSERT INTO public.notifications (
      user_id,
      notification_type,
      practice_id,
      reference_id,
      title,
      message,
      metadata
    ) VALUES (
      practice_owner,
      'new_comment',
      NEW.practice_id,
      NEW.id,
      'New Comment on Your Practice',
      NEW.user_name || ' commented on your practice for "' || lesson_title || '"',
      jsonb_build_object(
        'lesson_title', lesson_title,
        'comment_id', NEW.id,
        'commenter_name', NEW.user_name,
        'recording_id', NEW.recording_id
      )
    );
  END IF;

  -- If this is a reply, notify the parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    DECLARE
      parent_author UUID;
    BEGIN
      SELECT user_id INTO parent_author
      FROM public.practice_comments
      WHERE id = NEW.parent_comment_id;

      -- Only notify if parent author is different and has a user_id
      IF parent_author IS NOT NULL AND parent_author != comment_author THEN
        INSERT INTO public.notifications (
          user_id,
          notification_type,
          practice_id,
          reference_id,
          title,
          message,
          metadata
        ) VALUES (
          parent_author,
          'comment_reply',
          NEW.practice_id,
          NEW.id,
          'New Reply to Your Comment',
          NEW.user_name || ' replied to your comment',
          jsonb_build_object(
            'lesson_title', lesson_title,
            'comment_id', NEW.id,
            'parent_comment_id', NEW.parent_comment_id,
            'commenter_name', NEW.user_name
          )
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification when a comment is added
DROP TRIGGER IF EXISTS notify_comment_added ON public.practice_comments;
CREATE TRIGGER notify_comment_added
  AFTER INSERT ON public.practice_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment_added();

-- Add last_viewed_at to practices to track when user last viewed
ALTER TABLE public.practices
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_viewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_practices_last_viewed ON public.practices(last_viewed_by, last_viewed_at);

-- Comments for documentation
COMMENT ON TABLE notifications IS 'Stores notifications for users about practice reviews, comments, and other activity';
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification: practice_reviewed, new_comment, comment_reply';
COMMENT ON COLUMN notifications.practice_id IS 'The practice this notification relates to';
COMMENT ON COLUMN notifications.reference_id IS 'Reference to related entity (comment_id, user_id, etc.)';
COMMENT ON COLUMN notifications.is_read IS 'Whether the user has read this notification';
COMMENT ON COLUMN notifications.read_at IS 'When the user marked this notification as read';
COMMENT ON COLUMN notifications.metadata IS 'Additional data about the notification';

COMMENT ON COLUMN practices.last_viewed_at IS 'When this practice was last viewed';
COMMENT ON COLUMN practices.last_viewed_by IS 'User who last viewed this practice';
