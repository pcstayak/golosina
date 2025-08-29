import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'];

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

// Utility function to generate unique filename
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  const ext = extname(originalName);
  const baseName = originalName.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
  return `${baseName}_${timestamp}_${random}${ext}`;
}

// Validate file type and size
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
  }

  // Check file type
  const isValidImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isValidVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  
  if (!isValidImage && !isValidVideo) {
    return { valid: false, error: 'Invalid file type. Only JPG, PNG, GIF, MP4, and WebM files are allowed' };
  }

  // Check file extension
  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Invalid file extension' };
  }

  return { valid: true };
}

// Determine media type from file
function getMediaType(file: File): 'image' | 'video' | 'gif' {
  if (file.type === 'image/gif') return 'gif';
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return 'video';
  return 'image'; // fallback
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedFiles: UploadedFile[] = [];

    // Ensure upload directories exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const imagesDir = join(uploadsDir, 'images');
    const videosDir = join(uploadsDir, 'videos');
    const thumbnailsDir = join(uploadsDir, 'thumbnails');

    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });
    if (!existsSync(imagesDir)) await mkdir(imagesDir, { recursive: true });
    if (!existsSync(videosDir)) await mkdir(videosDir, { recursive: true });
    if (!existsSync(thumbnailsDir)) await mkdir(thumbnailsDir, { recursive: true });

    for (const file of files) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Generate unique filename
      const uniqueFilename = generateUniqueFilename(file.name);
      const mediaType = getMediaType(file);
      
      // Determine storage path
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
      const storageDir = isVideo ? videosDir : imagesDir;
      const storagePath = join(storageDir, uniqueFilename);
      const relativeUrl = `/uploads/${isVideo ? 'videos' : 'images'}/${uniqueFilename}`;

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(storagePath, buffer);

      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: mediaType,
        size: file.size,
        url: relativeUrl,
      };

      // For videos, we'll generate thumbnail later via a separate endpoint
      if (mediaType === 'video') {
        uploadedFile.thumbnailUrl = '/uploads/thumbnails/default-video-thumb.svg';
      }

      uploadedFiles.push(uploadedFile);
    }

    return NextResponse.json({ 
      success: true, 
      files: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}