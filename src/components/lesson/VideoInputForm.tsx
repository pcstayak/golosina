'use client'

import { useState } from 'react';
import { VideoEmbedService } from '@/services/videoEmbedService';
import { Button } from '@/components/ui/Button';
import { Plus, AlertCircle } from 'lucide-react';

interface VideoInputFormProps {
  onAddVideo: (videoData: {
    video_url: string;
    video_platform: 'youtube' | 'vimeo' | 'audio' | 'other';
    embed_id: string;
    description?: string;
  }) => void;
  maxVideos?: number;
  currentVideoCount: number;
  className?: string;
}

export default function VideoInputForm({
  onAddVideo,
  maxVideos = 5,
  currentVideoCount,
  className = ''
}: VideoInputFormProps) {
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentVideoCount >= maxVideos) {
      setError(`Maximum ${maxVideos} videos allowed`);
      return;
    }

    const validation = VideoEmbedService.validateVideoUrl(url);
    if (!validation.valid) {
      setError(validation.error || 'Invalid video URL');
      return;
    }

    const videoData = VideoEmbedService.extractVideoData(url);
    if (!videoData) {
      setError('Could not extract video information');
      return;
    }

    onAddVideo({
      video_url: videoData.originalUrl,
      video_platform: videoData.platform,
      embed_id: videoData.embedId,
      description: description.trim() || undefined,
    });

    setUrl('');
    setDescription('');
    setError(null);
  };

  const isMaxReached = currentVideoCount >= maxVideos;

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-1">
          Video URL
        </label>
        <input
          id="video-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isMaxReached}
        />
        <p className="mt-1 text-xs text-gray-500">
          Supported: YouTube, Vimeo
        </p>
      </div>

      <div>
        <label htmlFor="video-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <input
          id="video-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Example of proper technique"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isMaxReached}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isMaxReached && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            Maximum of {maxVideos} videos reached. Remove a video to add another.
          </p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full flex items-center justify-center gap-2"
        disabled={!url.trim() || isMaxReached}
      >
        <Plus className="w-4 h-4" />
        Add Video ({currentVideoCount}/{maxVideos})
      </Button>
    </form>
  );
}
