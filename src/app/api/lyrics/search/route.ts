import { NextRequest, NextResponse } from 'next/server';
import { formatLyrics } from '@/utils/lyricsFormatter';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const artist = searchParams.get('artist');
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Check cache first (case-insensitive)
    if (artist) {
      const { data: cachedLyrics, error: cacheError } = await supabase
        .from('lyrics_cache')
        .select('*')
        .ilike('song_title', title)
        .ilike('artist_name', artist)
        .maybeSingle();

      if (!cacheError && cachedLyrics) {
        return NextResponse.json({
          success: true,
          source: cachedLyrics.source,
          lyrics: cachedLyrics.lyrics,
          artist: cachedLyrics.artist_name,
          title: cachedLyrics.song_title,
          cached: true,
        });
      }
    }

    // Step 2: Not in cache, fetch from external API with timeout
    if (artist) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      try {
        const lyricsOvhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

        const response = await fetch(lyricsOvhUrl, {
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (data.lyrics) {
            const formattedLyrics = formatLyrics(data.lyrics.trim());

            // Step 3: Save to cache for future use
            try {
              await supabase.from('lyrics_cache').insert({
                song_title: title,
                artist_name: artist,
                lyrics: formattedLyrics,
                source: 'lyrics.ovh',
              });
            } catch (cacheInsertError) {
              // Ignore cache insert errors (might be duplicate)
              console.error('Cache insert error:', cacheInsertError);
            }

            return NextResponse.json({
              success: true,
              source: 'lyrics.ovh',
              lyrics: formattedLyrics,
              artist: artist,
              title: title,
              cached: false,
            });
          }
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.json(
            {
              success: false,
              error: 'Search timed out after 5 seconds. Please try again.',
              timeout: true,
            },
            { status: 408 }
          );
        }

        throw error;
      }
    }

    // If Lyrics.ovh fails or no artist provided, return not found
    return NextResponse.json({
      success: false,
      error: 'Lyrics not found. Please check the song title and artist name.',
    }, { status: 404 });

  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch lyrics. Please try again.'
      },
      { status: 500 }
    );
  }
}
