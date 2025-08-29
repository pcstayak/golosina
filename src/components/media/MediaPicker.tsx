'use client'

import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import MediaLibrary from './MediaLibrary';
import MediaUploader from './MediaUploader';
import { MediaContent } from '@/contexts/AppContext';

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'gif';
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaItems: MediaContent[]) => void;
  selectedMedia?: MediaContent[];
  maxSelection?: number;
  title?: string;
  description?: string;
}

type TabType = 'library' | 'upload';

export default function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  selectedMedia = [],
  maxSelection = 5,
  title = 'Select Media',
  description = 'Choose media files to add to your exercise'
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [selectedFiles, setSelectedFiles] = useState<string[]>(
    selectedMedia.map(item => item.id)
  );
  const [allFiles, setAllFiles] = useState<{ [key: string]: MediaFile }>({});

  if (!isOpen) return null;

  const convertMediaFileToContent = (file: MediaFile): MediaContent => {
    return {
      id: file.id,
      type: file.type,
      url: file.url,
      altText: file.name,
      caption: '',
      thumbnailUrl: file.thumbnailUrl,
      videoType: file.type === 'video' ? 'local' : undefined,
    };
  };

  const handleFileSelect = (file: MediaFile) => {
    // Store file data for later conversion
    setAllFiles(prev => ({
      ...prev,
      [file.id]: file
    }));

    // Toggle selection
    setSelectedFiles(prev => {
      const isSelected = prev.includes(file.id);
      if (isSelected) {
        return prev.filter(id => id !== file.id);
      } else if (prev.length < maxSelection) {
        return [...prev, file.id];
      } else {
        // Replace the first selected item if at max capacity
        return [...prev.slice(1), file.id];
      }
    });
  };

  const handleSelectionChange = (selectedIds: string[]) => {
    if (selectedIds.length <= maxSelection) {
      setSelectedFiles(selectedIds);
    }
  };

  const handleConfirmSelection = () => {
    const selectedMediaContent: MediaContent[] = selectedFiles
      .map(fileId => allFiles[fileId])
      .filter(Boolean)
      .map(convertMediaFileToContent);

    onSelect(selectedMediaContent);
    onClose();
  };

  const handleUploadComplete = (uploadedFiles: any[]) => {
    // Convert uploaded files to MediaFile format and add to allFiles
    const newFiles: { [key: string]: MediaFile } = {};
    
    uploadedFiles.forEach(file => {
      const mediaFile: MediaFile = {
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        uploadedAt: new Date().toISOString(),
      };
      newFiles[file.id] = mediaFile;
    });

    setAllFiles(prev => ({ ...prev, ...newFiles }));

    // Auto-select newly uploaded files if we have room
    const newFileIds = Object.keys(newFiles);
    setSelectedFiles(prev => {
      const availableSlots = maxSelection - prev.length;
      const filesToAdd = newFileIds.slice(0, availableSlots);
      return [...prev, ...filesToAdd];
    });

    // Switch to library tab to see the uploaded files
    setActiveTab('library');
  };

  const handleUploadError = (error: string) => {
    // You might want to show this error in a toast or modal
    console.error('Upload error:', error);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('library')}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'library'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Media Library
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === 'upload'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Upload New
          </button>
        </div>

        {/* Selection Info */}
        {selectedFiles.length > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
            <p className="text-sm text-blue-700">
              {selectedFiles.length} of {maxSelection} media items selected
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'library' ? (
            <div className="h-full p-6">
              <MediaLibrary
                selectionMode={true}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onSelectionChange={handleSelectionChange}
                className="h-full"
              />
            </div>
          ) : (
            <div className="h-full p-6 overflow-y-auto">
              <MediaUploader
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={maxSelection}
                className="max-w-2xl mx-auto"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {maxSelection === 1 
              ? 'Select 1 media item'
              : `Select up to ${maxSelection} media items`
            }
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleConfirmSelection}
              disabled={selectedFiles.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>
                {selectedFiles.length === 0 
                  ? 'Select Media'
                  : `Add ${selectedFiles.length} Item${selectedFiles.length > 1 ? 's' : ''}`
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}