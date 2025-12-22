-- Add review tracking to practices table
-- This allows teachers to mark student practices as reviewed

-- Add review tracking columns to practices table
ALTER TABLE public.practices
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_practices_reviewed_at ON public.practices(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_practices_reviewed_by ON public.practices(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_practices_created_by_reviewed ON public.practices(created_by, reviewed_at);

-- Add RLS policy for teachers to view practices from their students
CREATE POLICY "Teachers can view their students practices"
  ON public.practices FOR SELECT
  USING (
    is_shared = true AND
    EXISTS (
      SELECT 1 FROM teacher_student_relationships
      WHERE teacher_id = auth.uid()
        AND student_id = practices.created_by
        AND status = 'active'
    )
  );

-- Add RLS policy for teachers to update review status on student practices
CREATE POLICY "Teachers can mark student practices as reviewed"
  ON public.practices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_relationships
      WHERE teacher_id = auth.uid()
        AND student_id = practices.created_by
        AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teacher_student_relationships
      WHERE teacher_id = auth.uid()
        AND student_id = practices.created_by
        AND status = 'active'
    )
  );

-- Comments for documentation
COMMENT ON COLUMN practices.reviewed_at IS 'Timestamp when teacher marked this practice as reviewed';
COMMENT ON COLUMN practices.reviewed_by IS 'Teacher who reviewed this practice';
