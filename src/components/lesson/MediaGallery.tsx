'use client'

import React, { useState } from 'react';
import { MediaContent as MediaContentType } from '@/contexts/AppContext';
import MediaContent from './MediaContent';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaGalleryProps {
  mediaItems: MediaContentType[];
  className?: string;
}

export default function MediaGallery({ mediaItems, className = '' }: MediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!mediaItems || mediaItems.length === 0) {
    return null;
  }

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevMedia = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const renderCarousel = () => (
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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Media content */}
      <div role="region" aria-label="Exercise media content">
        {renderCarousel()}
      </div>

      {/* Media count indicator */}
      {mediaItems.length > 1 && (
        <p className="text-sm text-gray-500 text-center">
          {currentIndex + 1} of {mediaItems.length} media items
        </p>
      )}
    </div>
  );
}