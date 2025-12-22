-- Convert tips column from TEXT to JSONB to support array storage
-- This migration handles existing data by splitting multi-line tips into arrays

-- Step 1: Add new column for JSONB array
ALTER TABLE lesson_steps ADD COLUMN tips_array JSONB;

-- Step 2: Migrate existing data
-- Convert single-line or multi-line tips into JSON arrays
UPDATE lesson_steps
SET tips_array = to_jsonb(
  CASE
    WHEN tips IS NULL OR tips = '' THEN ARRAY[]::text[]
    ELSE string_to_array(tips, E'\n')
  END
)
WHERE tips IS NOT NULL OR tips = '';

-- Step 3: Drop old column
ALTER TABLE lesson_steps DROP COLUMN tips;

-- Step 4: Rename new column to tips
ALTER TABLE lesson_steps RENAME COLUMN tips_array TO tips;

-- Add comment for documentation
COMMENT ON COLUMN lesson_steps.tips IS 'Array of tip strings stored as JSONB';
