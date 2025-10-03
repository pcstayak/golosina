-- Table to track lesson assignments from teachers to students
CREATE TABLE IF NOT EXISTS public.freehand_lesson_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freehand_lesson_id UUID REFERENCES public.freehand_lessons(id) ON DELETE CASCADE NOT NULL,
  assigned_by TEXT NOT NULL,  -- teacher's user ID
  assigned_to TEXT NOT NULL,  -- student's user ID
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  notes TEXT,  -- optional notes from teacher
  UNIQUE(freehand_lesson_id, assigned_to)  -- prevent duplicate assignments
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_student
  ON public.freehand_lesson_assignments(assigned_to);

CREATE INDEX IF NOT EXISTS idx_lesson_assignments_teacher
  ON public.freehand_lesson_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson
  ON public.freehand_lesson_assignments(freehand_lesson_id);

-- Enable Row Level Security
ALTER TABLE public.freehand_lesson_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can create assignments (any authenticated user for now - can be restricted later)
CREATE POLICY "Teachers can assign lessons"
  ON public.freehand_lesson_assignments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can view assignments they created or that are assigned to them
CREATE POLICY "Users can view relevant assignments"
  ON public.freehand_lesson_assignments
  FOR SELECT
  USING (
    auth.uid()::text = assigned_by OR
    auth.uid()::text = assigned_to
  );

-- Teachers can delete their own assignments
CREATE POLICY "Teachers can delete their assignments"
  ON public.freehand_lesson_assignments
  FOR DELETE
  USING (auth.uid()::text = assigned_by);

-- Teachers can update their own assignments
CREATE POLICY "Teachers can update their assignments"
  ON public.freehand_lesson_assignments
  FOR UPDATE
  USING (auth.uid()::text = assigned_by);
