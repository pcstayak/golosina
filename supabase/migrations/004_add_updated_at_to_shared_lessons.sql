-- Migration: Add updated_at column to shared_lessons table
-- Created: 2025-01-28
-- Purpose: Add timestamp tracking for lesson updates to support share update functionality

-- Add updated_at column to shared_lessons table
ALTER TABLE shared_lessons
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN shared_lessons.updated_at IS 'Timestamp when the shared lesson was last updated';

-- Create or replace function to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at when a row is modified
DROP TRIGGER IF EXISTS update_shared_lessons_updated_at ON shared_lessons;
CREATE TRIGGER update_shared_lessons_updated_at
    BEFORE UPDATE ON shared_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optional: Set updated_at for existing records to their created_at value
-- This backfills existing records with a reasonable timestamp
UPDATE shared_lessons
SET updated_at = created_at
WHERE updated_at IS NULL;