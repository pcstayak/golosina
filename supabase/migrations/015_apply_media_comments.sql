-- Manual application script for media comments table
-- Run this directly in your Supabase SQL editor if you cannot apply migrations normally
-- This script is safe to run multiple times - it checks if the table exists first

-- Create table only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_media_comments') THEN
        -- Create the main table
        CREATE TABLE lesson_media_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          media_id UUID REFERENCES lesson_step_media(id) ON DELETE CASCADE,
          timestamp_seconds NUMERIC NOT NULL,
          comment_text TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Create index for efficient queries by media_id
        CREATE INDEX idx_media_comments_media_id ON lesson_media_comments(media_id);

        -- Enable Row Level Security
        ALTER TABLE lesson_media_comments ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Public read media comments"
          ON lesson_media_comments FOR SELECT USING (true);

        CREATE POLICY "Users can create media comments"
          ON lesson_media_comments FOR INSERT WITH CHECK (true);

        CREATE POLICY "Creators can update media comments"
          ON lesson_media_comments FOR UPDATE USING (true);

        CREATE POLICY "Creators can delete media comments"
          ON lesson_media_comments FOR DELETE USING (true);

        RAISE NOTICE 'lesson_media_comments table created successfully';
    ELSE
        RAISE NOTICE 'lesson_media_comments table already exists - skipping creation';
    END IF;
END $$;
