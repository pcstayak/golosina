-- Unified Lesson System Migration
-- This creates a new unified system for all lesson types (freehand, regular, teacher-assigned)

-- Main lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lesson steps (structured lesson content)
CREATE TABLE IF NOT EXISTS lesson_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tips TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Media content for steps (videos, images, GIFs)
CREATE TABLE IF NOT EXISTS lesson_step_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_step_id UUID REFERENCES lesson_steps(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_platform TEXT,
  embed_id TEXT,
  display_order INTEGER NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lesson assignments
CREATE TABLE IF NOT EXISTS lesson_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  assigned_to TEXT NOT NULL,
  assigned_by TEXT,
  assignment_type TEXT NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(lesson_id, assigned_to)
);

-- Student-specific comments on steps (teacher feedback)
CREATE TABLE IF NOT EXISTS lesson_step_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_step_id UUID REFERENCES lesson_steps(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES lesson_assignments(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Practice sessions
CREATE TABLE IF NOT EXISTS lesson_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES lesson_assignments(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL,
  recordings JSONB,
  recording_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lessons_created_by ON lessons(created_by);
CREATE INDEX IF NOT EXISTS idx_lessons_is_template ON lessons(is_template);
CREATE INDEX IF NOT EXISTS idx_lesson_steps_lesson_id ON lesson_steps(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_step_media_step_id ON lesson_step_media(lesson_step_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_student ON lesson_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_teacher ON lesson_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_lesson_practice_sessions_lesson ON lesson_practice_sessions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_practice_sessions_session_id ON lesson_practice_sessions(session_id);

-- Enable Row Level Security
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_step_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_step_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lessons
CREATE POLICY "Public read lessons"
  ON lessons
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create lessons"
  ON lessons
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Creators can update lessons"
  ON lessons
  FOR UPDATE
  USING (true);

CREATE POLICY "Creators can delete lessons"
  ON lessons
  FOR DELETE
  USING (true);

-- RLS Policies for lesson_steps
CREATE POLICY "Public read steps"
  ON lesson_steps
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create steps"
  ON lesson_steps
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update steps"
  ON lesson_steps
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete steps"
  ON lesson_steps
  FOR DELETE
  USING (true);

-- RLS Policies for lesson_step_media
CREATE POLICY "Public read media"
  ON lesson_step_media
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create media"
  ON lesson_step_media
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update media"
  ON lesson_step_media
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete media"
  ON lesson_step_media
  FOR DELETE
  USING (true);

-- RLS Policies for lesson_assignments
CREATE POLICY "Public read assignments"
  ON lesson_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create assignments"
  ON lesson_assignments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update assignments"
  ON lesson_assignments
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete assignments"
  ON lesson_assignments
  FOR DELETE
  USING (true);

-- RLS Policies for lesson_step_comments
CREATE POLICY "Public read step comments"
  ON lesson_step_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON lesson_step_comments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update comments"
  ON lesson_step_comments
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete comments"
  ON lesson_step_comments
  FOR DELETE
  USING (true);

-- RLS Policies for lesson_practice_sessions
CREATE POLICY "Public read practice sessions"
  ON lesson_practice_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create practice sessions"
  ON lesson_practice_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update practice sessions"
  ON lesson_practice_sessions
  FOR UPDATE
  USING (true);
