'use client'

import { VideoEmbedService } from '@/services/videoEmbedService';
import { Button } from '@/components/ui/Button';
import { Trash2, GripVertical, Edit2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { FreehandVideo } from '@/contexts/AppContext';
import { useState } from 'react';

interface VideoListProps {
  videos: FreehandVideo[];
  onRemove: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onUpdate?: (index: number, updates: Partial<FreehandVideo>) => void;
  isEditable?: boolean;
  className?: string;
}

export default function VideoList({
  videos,
  onRemove,
  onReorder,
  onUpdate,
  isEditable = true,
  className = ''
}: VideoListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');

  if (videos.length === 0) {
    return null;
  }

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditDescription(videos[index].description || '');
  };

  const handleSaveEdit = (index: number) => {
    if (onUpdate) {
      onUpdate(index, { description: editDescription.trim() || undefined });
    }
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditDescription('');
  };

  const handleMoveUp = (index: number) => {
    if (onReorder && index > 0) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (onReorder && index < videos.length - 1) {
      onReorder(index, index + 1);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700">
        Added Videos ({videos.length})
      </h3>

      <div className="space-y-2">
        {videos.map((video, index) => {
          const thumbnailUrl = VideoEmbedService.getThumbnailUrl(
            video.video_platform,
            video.embed_id
          );

          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              {isEditable && onReorder && (
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === videos.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex-shrink-0">
                <img
                  src={thumbnailUrl}
                  alt={`Video ${index + 1} thumbnail`}
                  className="w-24 h-16 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-video.png';
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    Video {index + 1}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">
                    {video.video_platform}
                  </span>
                </div>

                {editingIndex === index ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Video description..."
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(index)}
                      className="text-green-600 hover:text-green-700"
                      aria-label="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-gray-600 hover:text-gray-700"
                      aria-label="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-700 truncate">
                      {video.description || (
                        <span className="text-gray-400 italic">No description</span>
                      )}
                    </p>
                    {isEditable && onUpdate && (
                      <button
                        onClick={() => handleStartEdit(index)}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        aria-label="Edit description"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-1 truncate">
                  {video.video_url}
                </p>
              </div>

              {isEditable && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="flex-shrink-0"
                  aria-label="Remove video"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
