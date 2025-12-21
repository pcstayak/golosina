-- Migration 020: Fix user_profiles RLS policies
-- This migration fixes the overly restrictive RLS policies from migration 019
-- to allow teachers to view all students and students to view all teachers

-- Drop the restrictive policy created in migration 019
DROP POLICY IF EXISTS "Teachers can view their active students" ON public.user_profiles;

-- Create new policy allowing teachers to view all students
CREATE POLICY "Teachers can view all students"
  ON public.user_profiles
  FOR SELECT
  USING (
    role = 'student' AND auth.uid() IN (
      SELECT id FROM public.teacher_profiles
    )
  );

-- Create new policy allowing students to view all teachers
CREATE POLICY "Students can view all teachers"
  ON public.user_profiles
  FOR SELECT
  USING (
    role = 'teacher' AND auth.uid() IN (
      SELECT id FROM public.student_profiles
    )
  );
