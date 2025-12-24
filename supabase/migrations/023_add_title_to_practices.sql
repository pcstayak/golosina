-- Add title column to practices table
-- This stores the lesson title at the time of practice creation
-- so archived practices (where lesson was deleted) still show the correct title

ALTER TABLE public.practices
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Backfill existing practices with lesson titles
UPDATE public.practices
SET title = lessons.title
FROM public.lessons
WHERE practices.lesson_id = lessons.id
  AND practices.title IS NULL;

-- Set default for practices where lesson was already deleted
UPDATE public.practices
SET title = 'Untitled Lesson (archived)'
WHERE title IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN practices.title IS 'Lesson title at time of practice creation - preserved even if lesson is deleted';
