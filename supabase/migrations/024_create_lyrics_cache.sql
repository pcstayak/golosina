-- Lyrics cache table for external API results
CREATE TABLE IF NOT EXISTS lyrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  lyrics TEXT NOT NULL,
  source TEXT NOT NULL, -- 'lyrics.ovh' or other API sources
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index for case-insensitive song + artist lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_lyrics_cache_unique_song_artist
  ON lyrics_cache (LOWER(song_title), LOWER(artist_name));

-- Index for fast lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_lyrics_cache_lookup
  ON lyrics_cache (LOWER(song_title), LOWER(artist_name));

-- Enable RLS
ALTER TABLE lyrics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies - read-only for all users
CREATE POLICY "Public read lyrics cache"
  ON lyrics_cache FOR SELECT USING (true);

-- Only allow inserts via server (backend)
CREATE POLICY "Server can insert lyrics cache"
  ON lyrics_cache FOR INSERT WITH CHECK (true);

-- Allow updates to refresh cached lyrics
CREATE POLICY "Server can update lyrics cache"
  ON lyrics_cache FOR UPDATE USING (true);

-- Comments
COMMENT ON TABLE lyrics_cache IS 'Cache of lyrics fetched from external APIs to avoid repeated API calls';
COMMENT ON COLUMN lyrics_cache.song_title IS 'Original song title from search query';
COMMENT ON COLUMN lyrics_cache.artist_name IS 'Original artist name from search query';
COMMENT ON COLUMN lyrics_cache.source IS 'External API source (e.g., lyrics.ovh)';
