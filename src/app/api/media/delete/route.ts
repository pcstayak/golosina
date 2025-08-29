import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileUrl = searchParams.get('file');

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
    }

    // Parse the file URL to get the file path
    // Expected format: /uploads/images/filename or /uploads/videos/filename
    if (!fileUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'Invalid file URL format' }, { status: 400 });
    }

    const relativePath = fileUrl.replace('/uploads/', '');
    const filePath = join(process.cwd(), 'public', 'uploads', relativePath);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Security check: ensure file is within uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the file
    await unlink(filePath);

    // If it's a video, also try to delete associated thumbnail
    if (relativePath.startsWith('videos/')) {
      const filename = relativePath.split('/').pop();
      if (filename) {
        const thumbnailPath = join(uploadsDir, 'thumbnails', filename.replace(/\.(mp4|webm)$/i, '.jpg'));
        if (existsSync(thumbnailPath)) {
          try {
            await unlink(thumbnailPath);
          } catch (error) {
            console.warn('Failed to delete thumbnail:', error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('Delete media error:', error);
    return NextResponse.json({
      error: 'Failed to delete file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}