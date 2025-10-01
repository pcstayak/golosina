-- Create freehand_practice_sessions table to separate practice from lesson templates
CREATE TABLE IF NOT EXISTS freehand_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  freehand_lesson_id UUID REFERENCES freehand_lessons(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  recordings JSONB,
  recording_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_freehand_practice_sessions_session_id ON freehand_practice_sessions(session_id);

-- Create index on freehand_lesson_id for faster joins
CREATE INDEX IF NOT EXISTS idx_freehand_practice_sessions_lesson_id ON freehand_practice_sessions(freehand_lesson_id);

-- Enable Row Level Security
ALTER TABLE freehand_practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for freehand_practice_sessions
-- Anyone can view practice sessions via session_id (public read)
CREATE POLICY "Public read access to practice sessions"
  ON freehand_practice_sessions
  FOR SELECT
  USING (true);

-- Anyone can create practice sessions
CREATE POLICY "Allow practice session creation"
  ON freehand_practice_sessions
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update practice sessions (access control via session ownership)
CREATE POLICY "Allow practice session updates"
  ON freehand_practice_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Anyone can delete practice sessions (access control via session ownership)
CREATE POLICY "Allow practice session deletion"
  ON freehand_practice_sessions
  FOR DELETE
  USING (true);

-- Create function to update updated_at timestamp for practice sessions
CREATE OR REPLACE FUNCTION update_freehand_practice_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_freehand_practice_sessions_updated_at
  BEFORE UPDATE ON freehand_practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_freehand_practice_session_updated_at();

-- Migrate existing recordings from freehand_lessons to freehand_practice_sessions
-- Only migrate if there are recordings
INSERT INTO freehand_practice_sessions (session_id, freehand_lesson_id, created_by, recordings, recording_count, created_at, updated_at)
SELECT
  session_id || '_practice_migration' as session_id,
  id as freehand_lesson_id,
  created_by,
  recordings,
  recording_count,
  created_at,
  updated_at
FROM freehand_lessons
WHERE recordings IS NOT NULL AND recording_count > 0;

-- Remove recordings and recording_count columns from freehand_lessons
ALTER TABLE freehand_lessons DROP COLUMN IF EXISTS recordings;
ALTER TABLE freehand_lessons DROP COLUMN IF EXISTS recording_count;
