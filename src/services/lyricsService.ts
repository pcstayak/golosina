import { supabase } from '@/lib/supabase';

export interface LyricsSearchResult {
  title: string;
  artist: string;
  lyrics: string;
  source: 'genius' | 'internal' | 'musixmatch';
  uploadedBy?: string;
}

export class LyricsService {
  // Search Genius.com for lyrics (web scraping - free, no API key)
  static async searchGenius(title: string, artist: string): Promise<LyricsSearchResult | null> {
    try {
      // Use a proxy or server-side endpoint to avoid CORS
      // For now, we'll use a simple fetch to Genius search
      const query = encodeURIComponent(`${title} ${artist}`);

      // Note: This is a simplified version. In production, you'd want to:
      // 1. Use a server-side API route to avoid CORS
      // 2. Parse HTML to extract lyrics
      // 3. Handle rate limiting

      // For MVP, we'll return null and implement this server-side later
      console.log('Genius search not yet implemented server-side:', { title, artist });
      return null;
    } catch (error) {
      console.error('Error searching Genius:', error);
      return null;
    }
  }

  // Search internal shared_lyrics table
  static async searchInternal(title: string, artist?: string): Promise<LyricsSearchResult[]> {
    if (!supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('shared_lyrics')
        .select('*')
        .eq('is_public', true)
        .ilike('title', `%${title}%`);

      if (artist) {
        query = query.ilike('artist', `%${artist}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) {
        console.error('Error searching internal lyrics:', error);
        return [];
      }

      return (data || []).map(item => ({
        title: item.title,
        artist: item.artist || '',
        lyrics: item.lyrics,
        source: 'internal' as const,
        uploadedBy: item.uploaded_by
      }));
    } catch (error) {
      console.error('Error searching internal lyrics:', error);
      return [];
    }
  }

  // Save lyrics to shared library
  static async saveToSharedLibrary(
    title: string,
    artist: string,
    lyrics: string,
    userId: string,
    mediaId?: string
  ): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    try {
      const { error } = await supabase.from('shared_lyrics').insert({
        title,
        artist,
        lyrics,
        source: 'manual',
        uploaded_by: userId,
        media_id: mediaId,
        is_public: true
      });

      if (error) {
        console.error('Error saving to shared library:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving to shared library:', error);
      return false;
    }
  }
}
