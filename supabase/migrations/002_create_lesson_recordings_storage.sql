-- Fix storage bucket RLS policies to allow authenticated users to upload
-- The bucket already exists, we just need to add the authenticated user policies
-- and remove anon access

-- First, drop the existing public policies for shared_lessons table
DROP POLICY IF EXISTS "Allow public inserts" ON public.shared_lessons;
DROP POLICY IF EXISTS "Allow public reads" ON public.shared_lessons;

-- Add new RLS policies for shared_lessons (authenticated users only)
CREATE POLICY "Authenticated users can view shared lessons" ON public.shared_lessons
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create shared lessons" ON public.shared_lessons
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update shared lessons" ON public.shared_lessons
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete shared lessons" ON public.shared_lessons
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add RLS policies for recording_comments (authenticated users only)
CREATE POLICY "Authenticated users can view recording comments" ON public.recording_comments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create recording comments" ON public.recording_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update recording comments" ON public.recording_comments
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete recording comments" ON public.recording_comments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Storage RLS Policies for lesson-recordings bucket
-- Drop existing anon/public policies and add authenticated-only policies

-- Drop existing public storage policies if they exist
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;

-- Add policy for authenticated users to upload to the existing bucket
CREATE POLICY "Authenticated users can upload lesson recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lesson-recordings' 
    AND auth.role() = 'authenticated'
  );

-- Add policy for authenticated users to read lesson recordings
CREATE POLICY "Authenticated users can view lesson recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lesson-recordings' 
    AND auth.role() = 'authenticated'
  );

-- Add policy for authenticated users to update their uploads
CREATE POLICY "Authenticated users can update lesson recordings"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'lesson-recordings' 
    AND auth.role() = 'authenticated'
  );

-- Add policy for authenticated users to delete their uploads  
CREATE POLICY "Authenticated users can delete lesson recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lesson-recordings' 
    AND auth.role() = 'authenticated'
  );