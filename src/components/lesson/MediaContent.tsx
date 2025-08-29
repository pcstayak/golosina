'use client'

import React, { useState } from 'react';
import { MediaContent as MediaContentType } from '@/contexts/AppContext';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface MediaContentProps {
  media: MediaContentType;
  className?: string;
  priority?: boolean; // For Next.js Image priority loading
}

export default function MediaContent({ media, className = '', priority = false }: MediaContentProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
  };

  const handleVideoPause = () => {
    setIsVideoPlaying(false);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const toggleMute = (videoElement: HTMLVideoElement) => {
    videoElement.muted = !videoElement.muted;
    setIsMuted(videoElement.muted);
  };

  const togglePlayPause = (videoElement: HTMLVideoElement) => {
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  };

  const renderImage = () => (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {imageError ? (
        <div className="flex items-center justify-center bg-gray-100 min-h-[200px] text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <p className="text-sm">Image failed to load</p>
          </div>
        </div>
      ) : (
        <img
          src={media.url}
          alt={media.altText}
          onError={handleImageError}
          className="w-full h-auto object-cover transition-transform hover:scale-105"
          loading={priority ? 'eager' : 'lazy'}
          style={{ aspectRatio: 'auto' }}
        />
      )}
      {media.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-sm">
          {media.caption}
        </div>
      )}
    </div>
  );

  const renderVideo = () => (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {videoError ? (
        <div className="flex items-center justify-center bg-gray-100 min-h-[200px] text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">🎥</div>
            <p className="text-sm">Video failed to load</p>
          </div>
        </div>
      ) : (
        <>
          <video
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onError={handleVideoError}
            className="w-full h-auto object-cover"
            controls
            preload={priority ? 'auto' : 'metadata'}
            poster={media.thumbnailUrl}
            aria-label={media.altText}
          >
            <source src={media.url} type="video/mp4" />
            <source src={media.url} type="video/webm" />
            Your browser does not support the video tag.
          </video>
          
          {/* Custom video controls overlay */}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                const video = e.currentTarget.parentElement?.previousElementSibling as HTMLVideoElement;
                if (video) toggleMute(video);
              }}
              className="bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                const video = e.currentTarget.parentElement?.previousElementSibling as HTMLVideoElement;
                if (video) togglePlayPause(video);
              }}
              className="bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-all"
              aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
            >
              {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
      
      {media.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-sm">
          {media.caption}
        </div>
      )}
    </div>
  );

  switch (media.type) {
    case 'image':
    case 'gif':
      return renderImage();
    case 'video':
      return renderVideo();
    default:
      return (
        <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
          Unsupported media type: {media.type}
        </div>
      );
  }
}