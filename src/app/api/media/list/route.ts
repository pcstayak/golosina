import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'gif';
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

// Get media type from file extension
function getMediaTypeFromExtension(filename: string): 'image' | 'video' | 'gif' {
  const ext = extname(filename).toLowerCase();
  
  if (ext === '.gif') return 'gif';
  if (['.jpg', '.jpeg', '.png'].includes(ext)) return 'image';
  if (['.mp4', '.webm'].includes(ext)) return 'video';
  
  return 'image'; // fallback
}

// Scan directory for media files
async function scanDirectory(dirPath: string, urlPrefix: string): Promise<MediaFile[]> {
  if (!existsSync(dirPath)) {
    return [];
  }

  try {
    const files = await readdir(dirPath);
    const mediaFiles: MediaFile[] = [];

    for (const filename of files) {
      const filePath = join(dirPath, filename);
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        const ext = extname(filename).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'];
        
        if (allowedExts.includes(ext)) {
          const mediaType = getMediaTypeFromExtension(filename);
          
          const mediaFile: MediaFile = {
            id: filename, // Using filename as ID for simplicity
            name: filename,
            type: mediaType,
            size: stats.size,
            url: `${urlPrefix}/${filename}`,
            uploadedAt: stats.birthtime.toISOString(),
          };

          // Add thumbnail URL for videos
          if (mediaType === 'video') {
            mediaFile.thumbnailUrl = '/uploads/thumbnails/default-video-thumb.svg';
          }

          mediaFiles.push(mediaFile);
        }
      }
    }

    return mediaFiles;
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'image', 'video', 'gif', or null for all
    const search = searchParams.get('search')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const imagesDir = join(uploadsDir, 'images');
    const videosDir = join(uploadsDir, 'videos');

    // Scan both directories
    const [imageFiles, videoFiles] = await Promise.all([
      scanDirectory(imagesDir, '/uploads/images'),
      scanDirectory(videosDir, '/uploads/videos'),
    ]);

    // Combine and filter files
    let allFiles = [...imageFiles, ...videoFiles];

    // Filter by type if specified
    if (type) {
      allFiles = allFiles.filter(file => file.type === type);
    }

    // Filter by search term
    if (search) {
      allFiles = allFiles.filter(file => 
        file.name.toLowerCase().includes(search)
      );
    }

    // Sort by upload date (newest first)
    allFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // Apply pagination
    const totalFiles = allFiles.length;
    const paginatedFiles = allFiles.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      files: paginatedFiles,
      pagination: {
        total: totalFiles,
        offset,
        limit,
        hasMore: offset + limit < totalFiles,
      },
    });

  } catch (error) {
    console.error('List media error:', error);
    return NextResponse.json({
      error: 'Failed to list media files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}