import { supabase } from '@/lib/supabase';
import { formatLyrics } from '@/utils/lyricsFormatter';

export interface LyricsSearchResult {
  title: string;
  artist: string;
  lyrics: string;
  source: 'lyrics.ovh' | 'internal';
  uploadedBy?: string;
}

export class LyricsService {
  // Search external APIs via our server-side endpoint
  static async searchExternal(title: string, artist: string): Promise<LyricsSearchResult | null> {
    try {
      const params = new URLSearchParams({
        title,
        artist: artist || '',
      });

      const response = await fetch(`/api/lyrics/search?${params}`);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data.success && data.lyrics) {
        return {
          title: data.title,
          artist: data.artist,
          lyrics: data.lyrics,
          source: 'lyrics.ovh' as const,
        };
      }

      return null;
    } catch (error) {
      console.error('Error searching external lyrics:', error);
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
        lyrics: formatLyrics(item.lyrics),
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
