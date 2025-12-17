-- Add lyrics column to lesson_step_media
ALTER TABLE lesson_step_media ADD COLUMN lyrics TEXT;

-- Lyrics annotations table
CREATE TABLE IF NOT EXISTS lesson_media_lyrics_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES lesson_step_media(id) ON DELETE CASCADE,

  -- Text selection (character indices in lyrics)
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  highlighted_text TEXT NOT NULL,

  -- Annotation content
  annotation_text TEXT NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('global', 'student_specific', 'private')),

  -- Visibility controls
  -- If student_specific: only visible to this student + teacher
  -- If private: only visible to creator (and teacher if created by student)
  student_id TEXT, -- NULL for global, specific user ID for student_specific/private
  assignment_id UUID REFERENCES lesson_assignments(id) ON DELETE CASCADE,

  -- Metadata
  created_by TEXT NOT NULL,
  visible_to_teacher BOOLEAN DEFAULT true, -- For student private notes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shared lyrics library (for cross-teacher search)
CREATE TABLE IF NOT EXISTS shared_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  lyrics TEXT NOT NULL,
  source TEXT DEFAULT 'manual', -- 'manual', 'genius', 'musixmatch', etc.
  uploaded_by TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  media_id UUID REFERENCES lesson_step_media(id) ON DELETE SET NULL, -- Link back to original media
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lyrics_annotations_media_id ON lesson_media_lyrics_annotations(media_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_annotations_student_id ON lesson_media_lyrics_annotations(student_id);
CREATE INDEX IF NOT EXISTS idx_shared_lyrics_search ON shared_lyrics(title, artist);

-- Enable RLS
ALTER TABLE lesson_media_lyrics_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_lyrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for annotations
CREATE POLICY "Public read lyrics annotations"
  ON lesson_media_lyrics_annotations FOR SELECT USING (true);

CREATE POLICY "Users can create lyrics annotations"
  ON lesson_media_lyrics_annotations FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own annotations"
  ON lesson_media_lyrics_annotations FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own annotations"
  ON lesson_media_lyrics_annotations FOR DELETE USING (true);

-- RLS Policies for shared lyrics
CREATE POLICY "Public read shared lyrics"
  ON shared_lyrics FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create shared lyrics"
  ON shared_lyrics FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own shared lyrics"
  ON shared_lyrics FOR UPDATE USING (true);

-- Comments
COMMENT ON COLUMN lesson_step_media.lyrics IS 'Song lyrics or text content associated with this media';
COMMENT ON COLUMN lesson_media_lyrics_annotations.annotation_type IS 'global: visible to all, student_specific: visible to specific student + teacher, private: visible only to creator + teacher';
COMMENT ON COLUMN lesson_media_lyrics_annotations.visible_to_teacher IS 'For student private notes - whether teacher can see this annotation';
