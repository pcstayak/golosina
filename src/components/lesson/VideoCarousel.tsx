'use client'

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VideoEmbed from './VideoEmbed';
import { VideoEmbedService } from '@/services/videoEmbedService';
import type { FreehandVideo } from '@/contexts/AppContext';

interface VideoCarouselProps {
  videos: FreehandVideo[];
  className?: string;
}

export default function VideoCarousel({ videos, className = '' }: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!videos || videos.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-600">No videos added yet</p>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  const embedUrl = VideoEmbedService.getEmbedUrl(currentVideo.video_platform, currentVideo.embed_id);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={`${className}`}>
      <div className="relative">
        <VideoEmbed
          embedUrl={embedUrl}
          platform={currentVideo.video_platform}
          title={currentVideo.description}
        />

        {videos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
              aria-label="Previous video"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
              aria-label="Next video"
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>
          </>
        )}
      </div>

      {currentVideo.description && (
        <p className="mt-3 text-sm text-gray-700">{currentVideo.description}</p>
      )}

      {videos.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-blue-600 w-8'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}

      {videos.length > 1 && (
        <p className="mt-2 text-center text-sm text-gray-600">
          Video {currentIndex + 1} of {videos.length}
        </p>
      )}
    </div>
  );
}
