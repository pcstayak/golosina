'use client'

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertCircle, CheckCircle, FileImage, Video } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

interface MediaUploaderProps {
  onUploadComplete: (files: UploadedFile[]) => void;
  onUploadError: (error: string) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

export default function MediaUploader({
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'],
  className = ''
}: MediaUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFiles = (files: FileList): { validFiles: File[]; errors: string[] } => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    if (files.length > maxFiles) {
      errors.push(`Cannot upload more than ${maxFiles} files at once`);
      return { validFiles: [], errors };
    }

    Array.from(files).forEach((file, index) => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`File "${file.name}" has unsupported type: ${file.type}`);
        return;
      }

      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`File "${file.name}" is too large (${formatFileSize(file.size)}). Maximum size is 50MB`);
        return;
      }

      validFiles.push(file);
    });

    return { validFiles, errors };
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    // Initialize upload progress
    const initialProgress: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));
    setUploadProgress(initialProgress);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update progress to complete
      const completedProgress: UploadProgress[] = files.map((file, index) => ({
        file,
        progress: 100,
        status: 'complete' as const,
        uploadedFile: result.files[index]
      }));
      setUploadProgress(completedProgress);

      // Notify parent component
      onUploadComplete(result.files);

      // Clear progress after a short delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Update progress to show error
      const errorProgress: UploadProgress[] = files.map(file => ({
        file,
        progress: 0,
        status: 'error' as const,
        error: errorMessage
      }));
      setUploadProgress(errorProgress);

      onUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const { validFiles, errors } = validateFiles(files);

    if (errors.length > 0) {
      onUploadError(errors.join('; '));
      return;
    }

    if (validFiles.length > 0) {
      await uploadFiles(validFiles);
    }
  }, [onUploadError, uploadFiles, validateFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    
    // Reset input value to allow re-selecting the same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) {
      return <Video className="w-6 h-6 text-blue-500" />;
    }
    return <FileImage className="w-6 h-6 text-green-500" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        
        <Upload className={`
          w-12 h-12 mx-auto mb-4 transition-colors
          ${isDragOver ? 'text-blue-500' : 'text-gray-400'}
        `} />
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500">
            or click to select files
          </p>
          <p className="text-xs text-gray-400">
            Supports JPG, PNG, GIF, MP4, WebM (up to {maxFiles} files, 50MB max each)
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Upload Progress</h4>
          
          {uploadProgress.map((progress, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                {getFileIcon(progress.file)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {progress.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(progress.file.size)}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {progress.status === 'uploading' && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  
                  {progress.status === 'complete' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  
                  {progress.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {progress.status === 'uploading' && (
                <div className="mt-3">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {progress.status === 'error' && progress.error && (
                <p className="mt-2 text-sm text-red-600">
                  {progress.error}
                </p>
              )}

              {/* Success Message */}
              {progress.status === 'complete' && (
                <p className="mt-2 text-sm text-green-600">
                  Upload completed successfully
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}