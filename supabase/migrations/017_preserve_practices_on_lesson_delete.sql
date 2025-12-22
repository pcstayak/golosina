-- Preserve practice sessions when lessons are deleted
-- Change ON DELETE CASCADE to ON DELETE SET NULL for lesson_id

-- Step 1: Drop existing foreign key constraint
ALTER TABLE practices
DROP CONSTRAINT IF EXISTS practices_lesson_id_fkey;

-- Step 2: Make lesson_id nullable (allow practices to exist without lesson)
ALTER TABLE practices
ALTER COLUMN lesson_id DROP NOT NULL;

-- Step 3: Add new foreign key with SET NULL instead of CASCADE
ALTER TABLE practices
ADD CONSTRAINT practices_lesson_id_fkey
FOREIGN KEY (lesson_id)
REFERENCES lessons(id)
ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN practices.lesson_id IS 'References lesson - NULL if lesson was deleted (archived practice)';
