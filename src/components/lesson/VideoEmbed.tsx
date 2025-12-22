'use client'

import { VideoPlatform } from '@/services/videoEmbedService';

interface VideoEmbedProps {
  embedUrl: string;
  platform: VideoPlatform;
  title?: string;
  className?: string;
}

export default function VideoEmbed({ embedUrl, platform, title, className = '' }: VideoEmbedProps) {
  // Check if height constraint is being passed (e.g., "h-full")
  const hasHeightConstraint = className.includes('h-full') || className.includes('h-');

  return (
    <div
      className={`relative w-full ${className}`}
      style={hasHeightConstraint ? undefined : { paddingBottom: '56.25%' }}
    >
      <iframe
        src={embedUrl}
        title={title || `${platform} video player`}
        className={hasHeightConstraint ? 'w-full h-full rounded-lg' : 'absolute top-0 left-0 w-full h-full rounded-lg'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    </div>
  );
}
