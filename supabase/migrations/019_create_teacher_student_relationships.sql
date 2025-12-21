-- Teacher-Student Relationship System Migration
-- This creates the bidirectional relationship system for teacher-student connections

-- Create relationship_status enum
CREATE TYPE relationship_status AS ENUM (
  'pending_student_request',  -- Student sent join request to teacher
  'pending_teacher_invite',   -- Teacher sent invite to student
  'active',                   -- Confirmed relationship
  'archived',                 -- Relationship ended (removed/left)
  'rejected'                  -- Request/invite was rejected
);

-- Teacher-Student Relationships table
CREATE TABLE IF NOT EXISTS teacher_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  status relationship_status NOT NULL DEFAULT 'pending_student_request',

  -- Who initiated and when
  initiated_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status changes
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  status_changed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,

  -- Optional metadata
  student_message TEXT,      -- Student's message when requesting to join
  teacher_notes TEXT,        -- Teacher's notes about the student
  rejection_reason TEXT,     -- Reason for rejection

  -- Archival tracking (for restoration)
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  archive_reason TEXT,
  previous_status relationship_status,  -- Status before archival

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(teacher_id, student_id)
);

-- Add archival columns to lesson_assignments
ALTER TABLE lesson_assignments ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE lesson_assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE lesson_assignments ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE lesson_assignments ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Create indexes for performance
CREATE INDEX idx_teacher_student_relationships_teacher ON teacher_student_relationships(teacher_id, status);
CREATE INDEX idx_teacher_student_relationships_student ON teacher_student_relationships(student_id, status);
CREATE INDEX idx_teacher_student_relationships_active ON teacher_student_relationships(teacher_id, student_id) WHERE status = 'active';
CREATE INDEX idx_teacher_student_relationships_pending_student ON teacher_student_relationships(teacher_id) WHERE status = 'pending_student_request';
CREATE INDEX idx_teacher_student_relationships_pending_teacher ON teacher_student_relationships(student_id) WHERE status = 'pending_teacher_invite';
CREATE INDEX idx_lesson_assignments_assigned_to_archived ON lesson_assignments(assigned_to, is_archived);
CREATE INDEX idx_lesson_assignments_assigned_by_archived ON lesson_assignments(assigned_by, is_archived);

-- Enable Row Level Security
ALTER TABLE teacher_student_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teacher_student_relationships

-- Teachers can view all their relationships
CREATE POLICY "Teachers can view their relationships"
  ON teacher_student_relationships
  FOR SELECT
  USING (
    teacher_id IN (
      SELECT id FROM teacher_profiles WHERE id = auth.uid()
    )
  );

-- Students can view all their relationships
CREATE POLICY "Students can view their relationships"
  ON teacher_student_relationships
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM student_profiles WHERE id = auth.uid()
    )
  );

-- Students can create join requests (pending_student_request)
CREATE POLICY "Students can send join requests"
  ON teacher_student_relationships
  FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM student_profiles WHERE id = auth.uid()) AND
    status = 'pending_student_request' AND
    initiated_by = auth.uid()
  );

-- Teachers can create invites (pending_teacher_invite) or directly add students (active)
CREATE POLICY "Teachers can invite or add students"
  ON teacher_student_relationships
  FOR INSERT
  WITH CHECK (
    teacher_id IN (SELECT id FROM teacher_profiles WHERE id = auth.uid()) AND
    status IN ('pending_teacher_invite', 'active') AND
    initiated_by = auth.uid()
  );

-- Teachers can update relationships they're part of
CREATE POLICY "Teachers can update their relationships"
  ON teacher_student_relationships
  FOR UPDATE
  USING (
    teacher_id IN (SELECT id FROM teacher_profiles WHERE id = auth.uid())
  );

-- Students can update relationships they're part of (accept invites, cancel requests, leave)
CREATE POLICY "Students can update their relationships"
  ON teacher_student_relationships
  FOR UPDATE
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE id = auth.uid())
  );

-- Update user_profiles RLS policies to allow teachers to view all students
-- Teachers need to see all students to be able to add new ones
CREATE POLICY "Teachers can view all students"
  ON user_profiles
  FOR SELECT
  USING (
    role = 'student' AND EXISTS (
      SELECT 1 FROM teacher_profiles WHERE id = auth.uid()
    )
  );

-- Students can view all teacher profiles for the "Find a Teacher" feature
CREATE POLICY "Students can view all teachers"
  ON user_profiles
  FOR SELECT
  USING (
    role = 'teacher' AND EXISTS (
      SELECT 1 FROM student_profiles WHERE id = auth.uid()
    )
  );

-- Update lesson_assignments RLS policies to enforce teacher-student relationships
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public read assignments" ON lesson_assignments;
DROP POLICY IF EXISTS "Users can create assignments" ON lesson_assignments;
DROP POLICY IF EXISTS "Users can update assignments" ON lesson_assignments;
DROP POLICY IF EXISTS "Users can delete assignments" ON lesson_assignments;

-- Create new restrictive policies for lesson_assignments

-- Students can view their own non-archived assignments
CREATE POLICY "Students can view their assignments"
  ON lesson_assignments
  FOR SELECT
  USING (
    assigned_to::UUID = auth.uid() AND is_archived = FALSE
  );

-- Teachers can view non-archived assignments they created
CREATE POLICY "Teachers can view their assignments"
  ON lesson_assignments
  FOR SELECT
  USING (
    assigned_by::UUID = auth.uid() AND is_archived = FALSE
  );

-- Teachers can only create assignments for students in active relationships
CREATE POLICY "Teachers can assign to active students"
  ON lesson_assignments
  FOR INSERT
  WITH CHECK (
    assigned_by::UUID = auth.uid() AND
    EXISTS (
      SELECT 1 FROM teacher_student_relationships
      WHERE teacher_id = auth.uid()
        AND student_id = assigned_to::UUID
        AND status = 'active'
    )
  );

-- Students can create self-assigned lessons
CREATE POLICY "Students can self-assign lessons"
  ON lesson_assignments
  FOR INSERT
  WITH CHECK (
    assigned_to::UUID = auth.uid() AND
    assignment_type = 'self_assigned'
  );

-- Teachers can update assignments they created
CREATE POLICY "Teachers can update their assignments"
  ON lesson_assignments
  FOR UPDATE
  USING (
    assigned_by::UUID = auth.uid()
  );

-- Teachers can delete assignments they created
CREATE POLICY "Teachers can delete their assignments"
  ON lesson_assignments
  FOR DELETE
  USING (
    assigned_by::UUID = auth.uid()
  );

-- Students can delete their own self-assigned lessons
CREATE POLICY "Students can delete self-assigned"
  ON lesson_assignments
  FOR DELETE
  USING (
    assigned_to::UUID = auth.uid() AND
    assignment_type = 'self_assigned'
  );

-- Add updated_at trigger for teacher_student_relationships
CREATE TRIGGER handle_teacher_student_relationships_updated_at
  BEFORE UPDATE ON teacher_student_relationships
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Migration helper: Create active relationships for existing assignments
-- This ensures existing teacher-student assignments have corresponding relationships
INSERT INTO teacher_student_relationships (teacher_id, student_id, status, initiated_by, initiated_at)
SELECT DISTINCT
  la.assigned_by::UUID as teacher_id,
  la.assigned_to::UUID as student_id,
  'active'::relationship_status,
  la.assigned_by::UUID as initiated_by,
  la.assigned_at as initiated_at
FROM lesson_assignments la
WHERE la.assignment_type = 'teacher_assigned'
  AND la.assigned_by IS NOT NULL
  AND la.assigned_to IS NOT NULL
  AND EXISTS (SELECT 1 FROM teacher_profiles WHERE id = la.assigned_by::UUID)
  AND EXISTS (SELECT 1 FROM student_profiles WHERE id = la.assigned_to::UUID)
ON CONFLICT (teacher_id, student_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE teacher_student_relationships IS 'Manages bidirectional teacher-student relationships with status tracking';
COMMENT ON COLUMN teacher_student_relationships.status IS 'Current relationship status: pending_student_request, pending_teacher_invite, active, archived, rejected';
COMMENT ON COLUMN teacher_student_relationships.previous_status IS 'Status before archival - used for restoration when student rejoins';
COMMENT ON COLUMN lesson_assignments.is_archived IS 'Soft delete flag - assignments are hidden but recoverable when student rejoins';
