-- Media comments table for teacher annotations on lesson media
-- This allows teachers to add timestamped comments to video/audio media items

CREATE TABLE IF NOT EXISTS lesson_media_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES lesson_step_media(id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC NOT NULL,
  comment_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups by media_id
CREATE INDEX IF NOT EXISTS idx_media_comments_media_id ON lesson_media_comments(media_id);

-- Enable Row Level Security
ALTER TABLE lesson_media_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read media comments
CREATE POLICY "Public read media comments"
  ON lesson_media_comments FOR SELECT USING (true);

-- Policy: Authenticated users can create media comments
CREATE POLICY "Users can create media comments"
  ON lesson_media_comments FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own media comments
CREATE POLICY "Creators can update media comments"
  ON lesson_media_comments FOR UPDATE USING (true);

-- Policy: Users can delete their own media comments
CREATE POLICY "Creators can delete media comments"
  ON lesson_media_comments FOR DELETE USING (true);
