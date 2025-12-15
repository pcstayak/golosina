-- Terminology Consolidation Migration
-- This migration consolidates all lesson and practice terminology:
-- - Lesson = Template/blueprint with steps
-- - Practice = Execution instance of a lesson with recordings
-- - Step = Individual exercise in a lesson

-- Drop all old tables
DROP TABLE IF EXISTS public.shared_lessons CASCADE;
DROP TABLE IF EXISTS public.freehand_lessons CASCADE;
DROP TABLE IF EXISTS public.freehand_lesson_videos CASCADE;
DROP TABLE IF EXISTS public.freehand_lesson_assignments CASCADE;
DROP TABLE IF EXISTS public.freehand_practice_sessions CASCADE;
DROP TABLE IF EXISTS public.lesson_practice_sessions CASCADE;
DROP TABLE IF EXISTS public.recording_comments CASCADE;

-- Create new practices table (consolidates all practice sessions)
CREATE TABLE IF NOT EXISTS public.practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id TEXT UNIQUE NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.lesson_assignments(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recordings JSONB NOT NULL DEFAULT '{}'::jsonb,
  recording_count INTEGER DEFAULT 0,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create practice comments table (for recordings)
CREATE TABLE IF NOT EXISTS public.practice_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id TEXT NOT NULL,
  recording_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment_text TEXT NOT NULL,
  timestamp_seconds NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_practices_practice_id ON public.practices(practice_id);
CREATE INDEX IF NOT EXISTS idx_practices_lesson_id ON public.practices(lesson_id);
CREATE INDEX IF NOT EXISTS idx_practices_created_by ON public.practices(created_by);
CREATE INDEX IF NOT EXISTS idx_practices_is_shared ON public.practices(is_shared);
CREATE INDEX IF NOT EXISTS idx_practice_comments_practice_id ON public.practice_comments(practice_id);

-- Enable Row Level Security
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practices
-- Users can view shared practices or their own
CREATE POLICY "Users can view shared practices or their own"
  ON public.practices FOR SELECT
  USING (is_shared = true OR created_by = auth.uid());

-- Users can create their own practices
CREATE POLICY "Users can create their own practices"
  ON public.practices FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own practices
CREATE POLICY "Users can update their own practices"
  ON public.practices FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete their own practices
CREATE POLICY "Users can delete their own practices"
  ON public.practices FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for practice comments
-- Anyone can view practice comments
CREATE POLICY "Anyone can view practice comments"
  ON public.practice_comments FOR SELECT
  USING (true);

-- Authenticated users can add practice comments
CREATE POLICY "Authenticated users can add practice comments"
  ON public.practice_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
