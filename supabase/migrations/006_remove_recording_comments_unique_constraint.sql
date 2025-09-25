-- Remove unique constraint on recording_id to allow multiple comments per recording
-- Migration: 006_remove_recording_comments_unique_constraint.sql

BEGIN;

-- Drop the unique constraint that prevents multiple comments on the same recording
-- Use IF EXISTS to handle cases where the constraint might not exist
DO $$
BEGIN
    -- Check if the constraint exists before trying to drop it
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'recording_comments_recording_id_key'
        AND conrelid = 'public.recording_comments'::regclass
    ) THEN
        ALTER TABLE "public"."recording_comments"
        DROP CONSTRAINT "recording_comments_recording_id_key";

        RAISE NOTICE 'Successfully removed unique constraint recording_comments_recording_id_key';
    ELSE
        RAISE NOTICE 'Constraint recording_comments_recording_id_key does not exist, skipping';
    END IF;
END $$;

COMMIT;