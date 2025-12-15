-- Migration: Add threaded comment support to practice_comments
-- Created: 2025-12-14
-- Purpose: Enable threaded conversations with parent-child comment relationships

-- Add parent_comment_id column to practice_comments table
ALTER TABLE public.practice_comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.practice_comments(id) ON DELETE CASCADE;

-- Add index for parent_comment_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_practice_comments_parent_id ON public.practice_comments(parent_comment_id);

-- Add comment for documentation
COMMENT ON COLUMN public.practice_comments.parent_comment_id IS 'References the parent comment for threaded replies. NULL for top-level comments.';
