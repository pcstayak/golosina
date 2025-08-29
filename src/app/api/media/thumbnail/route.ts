import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, thumbnailData } = await request.json();

    if (!videoUrl || !thumbnailData) {
      return NextResponse.json({ 
        error: 'Video URL and thumbnail data are required' 
      }, { status: 400 });
    }

    // Parse video URL to get filename
    if (!videoUrl.startsWith('/uploads/videos/')) {
      return NextResponse.json({ 
        error: 'Invalid video URL format' 
      }, { status: 400 });
    }

    const videoFilename = videoUrl.split('/').pop();
    if (!videoFilename) {
      return NextResponse.json({ error: 'Invalid video filename' }, { status: 400 });
    }

    // Generate thumbnail filename
    const thumbnailFilename = videoFilename.replace(/\.(mp4|webm)$/i, '.jpg');
    const thumbnailPath = join(process.cwd(), 'public', 'uploads', 'thumbnails', thumbnailFilename);

    // Convert base64 thumbnail data to buffer
    const base64Data = thumbnailData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Save thumbnail
    await writeFile(thumbnailPath, buffer);

    const thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;

    return NextResponse.json({
      success: true,
      thumbnailUrl,
      message: 'Thumbnail generated successfully',
    });

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate thumbnail',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoUrl = searchParams.get('video');

    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    // Parse video URL to get expected thumbnail path
    if (!videoUrl.startsWith('/uploads/videos/')) {
      return NextResponse.json({ error: 'Invalid video URL format' }, { status: 400 });
    }

    const videoFilename = videoUrl.split('/').pop();
    if (!videoFilename) {
      return NextResponse.json({ error: 'Invalid video filename' }, { status: 400 });
    }

    const thumbnailFilename = videoFilename.replace(/\.(mp4|webm)$/i, '.jpg');
    const thumbnailPath = join(process.cwd(), 'public', 'uploads', 'thumbnails', thumbnailFilename);

    if (existsSync(thumbnailPath)) {
      const thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
      return NextResponse.json({
        success: true,
        thumbnailUrl,
        exists: true,
      });
    } else {
      return NextResponse.json({
        success: true,
        thumbnailUrl: null,
        exists: false,
      });
    }

  } catch (error) {
    console.error('Thumbnail check error:', error);
    return NextResponse.json({
      error: 'Failed to check thumbnail',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}