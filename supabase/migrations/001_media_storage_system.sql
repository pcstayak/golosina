-- Supabase Media Storage Setup Script
-- Run this script in your Supabase SQL editor to set up media storage and management tables

-- Enable Row Level Security (RLS) for all tables
-- Create media_files table for storing media metadata
CREATE TABLE IF NOT EXISTS media_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'gif')),
  file_format TEXT NOT NULL, -- jpg, png, gif, mp4, webm, etc.
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  public_url TEXT, -- Public URL for accessing the file
  thumbnail_path TEXT, -- Path to thumbnail for videos
  thumbnail_url TEXT, -- Public URL for thumbnail
  alt_text TEXT,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- For videos, in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Metadata for organization
  category TEXT DEFAULT 'general',
  tags TEXT[], -- Array of tags for organization
  is_featured BOOLEAN DEFAULT FALSE,
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create exercise_media table for linking media to exercises
CREATE TABLE IF NOT EXISTS exercise_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id TEXT NOT NULL, -- Reference to exercise identifier
  exercise_set_id INTEGER NOT NULL, -- Reference to exercise set
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media_categories table for better organization
CREATE TABLE IF NOT EXISTS media_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6B7280', -- Hex color for UI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO media_categories (name, description, color) VALUES
('breathing', 'Breathing technique demonstrations', '#EF4444'),
('vocal-warmups', 'Voice warm-up exercises', '#F59E0B'),
('pitch-training', 'Pitch and interval exercises', '#8B5CF6'),
('posture', 'Posture and stance guidance', '#10B981'),
('technique', 'General vocal technique', '#3B82F6'),
('general', 'General instructional content', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Create storage buckets for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
('media-files', 'media-files', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

-- Create thumbnails bucket for video thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
('thumbnails', 'thumbnails', true, 10485760, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all operations on media_files" ON media_files
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on exercise_media" ON exercise_media
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on media_categories" ON media_categories
  FOR ALL USING (true) WITH CHECK (true);

-- Storage policies for buckets
CREATE POLICY "Allow all operations on media-files bucket" ON storage.objects
  FOR ALL USING (bucket_id = 'media-files') WITH CHECK (bucket_id = 'media-files');

CREATE POLICY "Allow all operations on thumbnails bucket" ON storage.objects
  FOR ALL USING (bucket_id = 'thumbnails') WITH CHECK (bucket_id = 'thumbnails');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_category ON media_files(category);
CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON media_files(created_at);
CREATE INDEX IF NOT EXISTS idx_exercise_media_exercise_id ON exercise_media(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_media_set_id ON exercise_media(exercise_set_id);

-- Create updated_at trigger for media_files
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_media_files_updated_at 
  BEFORE UPDATE ON media_files 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_media_usage(media_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media_files 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = media_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for media file statistics
CREATE OR REPLACE VIEW media_file_stats AS
SELECT 
  COUNT(*) as total_files,
  SUM(file_size) as total_size,
  COUNT(*) FILTER (WHERE file_type = 'image') as image_count,
  COUNT(*) FILTER (WHERE file_type = 'video') as video_count,
  COUNT(*) FILTER (WHERE file_type = 'gif') as gif_count,
  AVG(file_size) as avg_file_size,
  MAX(created_at) as last_upload
FROM media_files;

-- Sample data for testing (optional - remove if not needed)
-- You can uncomment these lines if you want some test data
/*
INSERT INTO media_files (filename, original_name, file_type, file_format, file_size, storage_path, public_url, alt_text, caption, category) VALUES
('test-breathing.jpg', 'breathing-technique.jpg', 'image', 'jpg', 245760, 'media-files/test-breathing.jpg', 'https://your-supabase-url.supabase.co/storage/v1/object/public/media-files/test-breathing.jpg', 'Proper breathing posture demonstration', 'Shows correct diaphragmatic breathing position', 'breathing'),
('test-humming.mp4', 'humming-demo.mp4', 'video', 'mp4', 1024000, 'media-files/test-humming.mp4', 'https://your-supabase-url.supabase.co/storage/v1/object/public/media-files/test-humming.mp4', 'Humming exercise demonstration', 'Basic humming technique for vocal warm-up', 'vocal-warmups');
*/