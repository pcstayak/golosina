import { NextRequest, NextResponse } from 'next/server';
import { formatLyrics } from '@/utils/lyricsFormatter';

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

  try {
    // Try Lyrics.ovh first
    if (artist) {
      const lyricsOvhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

      const response = await fetch(lyricsOvhUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.lyrics) {
          return NextResponse.json({
            success: true,
            source: 'lyrics.ovh',
            lyrics: formatLyrics(data.lyrics.trim()),
            artist: artist,
            title: title,
          });
        }
      }
    }

    // If Lyrics.ovh fails or no artist provided, return not found
    return NextResponse.json({
      success: false,
      error: 'Lyrics not found',
    }, { status: 404 });

  } catch (error) {
    console.error('Error fetching lyrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch lyrics'
      },
      { status: 500 }
    );
  }
}
