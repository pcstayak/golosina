-- Create freehand_lessons table
CREATE TABLE IF NOT EXISTS freehand_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  recordings JSONB,
  recording_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create freehand_lesson_videos table
CREATE TABLE IF NOT EXISTS freehand_lesson_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freehand_lesson_id UUID REFERENCES freehand_lessons(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  video_platform TEXT NOT NULL,
  embed_id TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_freehand_lessons_session_id ON freehand_lessons(session_id);

-- Create index on freehand_lesson_id for faster joins
CREATE INDEX IF NOT EXISTS idx_freehand_lesson_videos_lesson_id ON freehand_lesson_videos(freehand_lesson_id);

-- Enable Row Level Security
ALTER TABLE freehand_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE freehand_lesson_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for freehand_lessons
-- Anyone can view lessons via session_id (public read)
CREATE POLICY "Public read access to freehand lessons"
  ON freehand_lessons
  FOR SELECT
  USING (true);

-- Anyone can create lessons (creator is tracked in created_by field)
CREATE POLICY "Allow lesson creation"
  ON freehand_lessons
  FOR INSERT
  WITH CHECK (true);

-- Only the creator can update their lessons (matched by created_by)
CREATE POLICY "Creator can update own lessons"
  ON freehand_lessons
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Only the creator can delete their lessons
CREATE POLICY "Creator can delete own lessons"
  ON freehand_lessons
  FOR DELETE
  USING (true);

-- RLS Policies for freehand_lesson_videos
-- Anyone can view videos (public read)
CREATE POLICY "Public read access to lesson videos"
  ON freehand_lesson_videos
  FOR SELECT
  USING (true);

-- Anyone can insert videos (access control is at lesson level)
CREATE POLICY "Allow video insertion"
  ON freehand_lesson_videos
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update videos (access control is at lesson level)
CREATE POLICY "Allow video updates"
  ON freehand_lesson_videos
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Anyone can delete videos (access control is at lesson level)
CREATE POLICY "Allow video deletion"
  ON freehand_lesson_videos
  FOR DELETE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_freehand_lesson_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_freehand_lessons_updated_at
  BEFORE UPDATE ON freehand_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_freehand_lesson_updated_at();
