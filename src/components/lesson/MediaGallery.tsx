'use client'

import React, { useState } from 'react';
import { MediaContent as MediaContentType } from '@/contexts/AppContext';
import MediaContent from './MediaContent';
import { ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';

interface MediaGalleryProps {
  mediaItems: MediaContentType[];
  className?: string;
}

type ViewMode = 'grid' | 'carousel' | 'list';

export default function MediaGallery({ mediaItems, className = '' }: MediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  if (!mediaItems || mediaItems.length === 0) {
    return null;
  }

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevMedia = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const renderCarouselView = () => (
    <div className="relative">
      <div className="overflow-hidden rounded-lg">
        <MediaContent 
          media={mediaItems[currentIndex]} 
          className="w-full"
          priority={true}
        />
      </div>
      
      {mediaItems.length > 1 && (
        <>
          {/* Navigation arrows */}
          <button
            onClick={prevMedia}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            aria-label="Previous media"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={nextMedia}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            aria-label="Next media"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* Dots indicator */}
          <div className="flex justify-center mt-4 gap-2">
            {mediaItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-blue-500 w-4'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to media ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderGridView = () => (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {mediaItems.map((media, index) => (
        <div key={media.id} className="relative">
          <MediaContent 
            media={media} 
            className="aspect-square object-cover cursor-pointer hover:opacity-80 transition-opacity"
            priority={index === 0}
          />
          {media.caption && (
            <p className="text-sm text-gray-600 mt-2">{media.caption}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-6">
      {mediaItems.map((media, index) => (
        <div key={media.id} className="space-y-2">
          <MediaContent 
            media={media} 
            className="w-full max-w-2xl mx-auto"
            priority={index === 0}
          />
          {media.caption && (
            <p className="text-sm text-gray-600 text-center">{media.caption}</p>
          )}
        </div>
      ))}
    </div>
  );

  const getViewModeIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'grid':
        return <Grid className="w-4 h-4" />;
      case 'list':
        return <List className="w-4 h-4" />;
      case 'carousel':
        return <ChevronRight className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* View mode controls - only show if multiple items */}
      {mediaItems.length > 1 && (
        <div className="flex justify-end gap-2">
          {(['grid', 'carousel', 'list'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`p-2 rounded-lg transition-all ${
                viewMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label={`Switch to ${mode} view`}
              title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
            >
              {getViewModeIcon(mode)}
            </button>
          ))}
        </div>
      )}

      {/* Media content */}
      <div role="region" aria-label="Exercise media content">
        {viewMode === 'carousel' && renderCarouselView()}
        {viewMode === 'grid' && renderGridView()}
        {viewMode === 'list' && renderListView()}
      </div>

      {/* Media count indicator */}
      {mediaItems.length > 1 && (
        <p className="text-sm text-gray-500 text-center">
          {viewMode === 'carousel' 
            ? `${currentIndex + 1} of ${mediaItems.length} media items`
            : `${mediaItems.length} media items`
          }
        </p>
      )}
    </div>
  );
}