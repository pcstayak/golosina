'use client'

import React, { useState } from 'react';
import { MediaContent as MediaContentType } from '@/contexts/AppContext';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface MediaContentProps {
  media: MediaContentType;
  className?: string;
  priority?: boolean; // For Next.js Image priority loading
  showCaptionOverlay?: boolean; // Whether to show caption as overlay or below
}

export default function MediaContent({ media, className = '', priority = false, showCaptionOverlay = true }: MediaContentProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [youtubeError, setYoutubeError] = useState(false);

  // Convert YouTube URL to embed format
  const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
      // Handle different YouTube URL formats
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      const match = url.match(regex);
      
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
      }
      return null;
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
      return null;
    }
  };

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
      {media.caption && showCaptionOverlay && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-sm">
          {media.caption}
        </div>
      )}
    </div>
  );

  const renderYouTubeVideo = () => {
    const embedUrl = getYouTubeEmbedUrl(media.url);
    
    if (!embedUrl || youtubeError) {
      return (
        <div className="flex items-center justify-center bg-gray-100 min-h-[200px] text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">🎥</div>
            <p className="text-sm">YouTube video failed to load</p>
            <p className="text-xs mt-1">Please check the video URL</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`relative overflow-hidden rounded-lg ${className}`}>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
          <iframe
            src={embedUrl}
            title={media.altText}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onError={() => setYoutubeError(true)}
            loading={priority ? 'eager' : 'lazy'}
          />
        </div>
        
        {media.caption && showCaptionOverlay && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-sm rounded-b-lg">
            {media.caption}
          </div>
        )}
      </div>
    );
  };

  const renderLocalVideo = () => (
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
      
      {media.caption && showCaptionOverlay && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-sm">
          {media.caption}
        </div>
      )}
    </div>
  );

  const renderVideo = () => {
    // Check if it's a YouTube video
    if (media.videoType === 'youtube') {
      return renderYouTubeVideo();
    }
    
    // Default to local video for backward compatibility
    return renderLocalVideo();
  };

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