-- Migration: Create/Update recording_comments table
-- Created: 2025-01-28
-- Purpose: Add commenting system for shared lesson recordings with timeline support

-- Create recording_comments table if it doesn't exist, or update existing one
CREATE TABLE IF NOT EXISTS recording_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    recording_id TEXT,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add user_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recording_comments' AND column_name = 'user_name') THEN
        ALTER TABLE recording_comments ADD COLUMN user_name TEXT;
    END IF;

    -- Add user_email column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recording_comments' AND column_name = 'user_email') THEN
        ALTER TABLE recording_comments ADD COLUMN user_email TEXT;
    END IF;

    -- Add timestamp_seconds column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'recording_comments' AND column_name = 'timestamp_seconds') THEN
        ALTER TABLE recording_comments ADD COLUMN timestamp_seconds DECIMAL(10,3);
    END IF;

    -- Rename 'comment' to 'comment_text' if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'recording_comments' AND column_name = 'comment')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'recording_comments' AND column_name = 'comment_text') THEN
        ALTER TABLE recording_comments RENAME COLUMN comment TO comment_text;
    END IF;
END $$;

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_recording_comments_session_id ON recording_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_recording_comments_recording_id ON recording_comments(session_id, recording_id);
CREATE INDEX IF NOT EXISTS idx_recording_comments_timestamp ON recording_comments(session_id, recording_id, timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_recording_comments_created_at ON recording_comments(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE recording_comments IS 'Comments left by users on shared lesson recordings';
COMMENT ON COLUMN recording_comments.session_id IS 'References the shared lesson session';
COMMENT ON COLUMN recording_comments.recording_id IS 'Identifies specific recording within the session (format: exerciseId-index)';
COMMENT ON COLUMN recording_comments.user_name IS 'Name of the user who left the comment';
COMMENT ON COLUMN recording_comments.user_email IS 'Optional email of the commenter for identification';
COMMENT ON COLUMN recording_comments.comment_text IS 'The actual comment content';
COMMENT ON COLUMN recording_comments.timestamp_seconds IS 'Optional specific moment in the recording where comment applies (in seconds)';

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_recording_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_recording_comments_updated_at
    BEFORE UPDATE ON recording_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_recording_comments_updated_at();

-- Add validation constraints (only if they don't exist)
DO $$
BEGIN
    -- Check and add comment_text constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name = 'recording_comments' AND constraint_name = 'check_comment_text_not_empty') THEN
        ALTER TABLE recording_comments ADD CONSTRAINT check_comment_text_not_empty
        CHECK (char_length(trim(comment_text)) > 0);
    END IF;

    -- Check and add user_name constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name = 'recording_comments' AND constraint_name = 'check_user_name_not_empty') THEN
        ALTER TABLE recording_comments ADD CONSTRAINT check_user_name_not_empty
        CHECK (char_length(trim(user_name)) > 0);
    END IF;

    -- Check and add timestamp constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name = 'recording_comments' AND constraint_name = 'check_timestamp_non_negative') THEN
        ALTER TABLE recording_comments ADD CONSTRAINT check_timestamp_non_negative
        CHECK (timestamp_seconds IS NULL OR timestamp_seconds >= 0);
    END IF;
END $$;

-- Set NOT NULL constraints after adding columns (do this at the end)
DO $$
BEGIN
    -- Set user_name as NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'recording_comments' AND column_name = 'user_name' AND is_nullable = 'YES') THEN
        ALTER TABLE recording_comments ALTER COLUMN user_name SET NOT NULL;
    END IF;

    -- Set comment_text as NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'recording_comments' AND column_name = 'comment_text' AND is_nullable = 'YES') THEN
        ALTER TABLE recording_comments ALTER COLUMN comment_text SET NOT NULL;
    END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE recording_comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read comments on shared lessons
CREATE POLICY "Anyone can read comments on shared lessons" ON recording_comments
    FOR SELECT USING (true);

-- Create policy to allow anyone to insert comments on shared lessons
CREATE POLICY "Anyone can insert comments on shared lessons" ON recording_comments
    FOR INSERT WITH CHECK (true);

-- Create policy to allow users to update their own comments (based on user_email if provided)
CREATE POLICY "Users can update their own comments" ON recording_comments
    FOR UPDATE USING (
        user_email IS NOT NULL AND
        user_email = current_setting('request.jwt.claims', true)::json->>'email'
    );

-- Create policy to allow users to delete their own comments (based on user_email if provided)
CREATE POLICY "Users can delete their own comments" ON recording_comments
    FOR DELETE USING (
        user_email IS NOT NULL AND
        user_email = current_setting('request.jwt.claims', true)::json->>'email'
    );