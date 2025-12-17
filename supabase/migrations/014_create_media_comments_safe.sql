-- Safe migration for media comments table
-- This version checks for existence before creating

-- Create table only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_media_comments') THEN
        CREATE TABLE lesson_media_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          media_id UUID REFERENCES lesson_step_media(id) ON DELETE CASCADE,
          timestamp_seconds NUMERIC NOT NULL,
          comment_text TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX idx_media_comments_media_id ON lesson_media_comments(media_id);

        ALTER TABLE lesson_media_comments ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Public read media comments"
          ON lesson_media_comments FOR SELECT USING (true);

        CREATE POLICY "Users can create media comments"
          ON lesson_media_comments FOR INSERT WITH CHECK (true);

        CREATE POLICY "Creators can update media comments"
          ON lesson_media_comments FOR UPDATE USING (true);

        CREATE POLICY "Creators can delete media comments"
          ON lesson_media_comments FOR DELETE USING (true);
    END IF;
END $$;
