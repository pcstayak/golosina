'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, X } from 'lucide-react';
import { formatTime } from '@/utils/audioAnalysis';
import VideoEmbed from '@/components/lesson/VideoEmbed';
import { VideoEmbedService } from '@/services/videoEmbedService';
import AudioPlayer from '@/components/lesson/AudioPlayer';
import { PracticeComment as RecordingComment } from '@/services/practiceService';
import LyricsWithAnnotations from './LyricsWithAnnotations';

export interface MediaComment {
  id: string;
  timestamp_seconds: number;
  comment_text: string;
  created_by: string;
  created_at: string;
}

interface MediaPreviewProps {
  mediaUrl: string;
  mediaType: 'video' | 'audio';
  mediaPlatform?: string;
  embedId?: string;
  comments: MediaComment[];
  onAddComment: (timestampSeconds: number, commentText: string) => void;
  onDeleteComment: (commentId: string) => void;
  isEditable: boolean;
  lyrics?: string;
  mediaId?: string;
  userId?: string;
  isTeacher?: boolean;
  assignmentId?: string;
  availableStudents?: Array<{ id: string; name: string }>;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  mediaUrl,
  mediaType,
  mediaPlatform,
  embedId,
  comments,
  onAddComment,
  onDeleteComment,
  isEditable,
  lyrics,
  mediaId,
  userId,
  isTeacher = false,
  assignmentId,
  availableStudents = []
}) => {
  // State for video URL with timestamp (for reloading embedded videos)
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');

  // Comment form state (for audio player with waveform)
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentTimestamp, setNewCommentTimestamp] = useState<number | null>(null);

  // Comment form state (for embedded videos)
  const [commentText, setCommentText] = useState('');
  const [timestampInput, setTimestampInput] = useState('');

  // Initialize video URL when component mounts or props change
  useEffect(() => {
    if (embedId && mediaPlatform) {
      setCurrentVideoUrl(VideoEmbedService.getEmbedUrl(mediaPlatform as any, embedId));
    }
  }, [embedId, mediaPlatform]);

  // Parse "1:30" or "90" to seconds
  const parseTimestamp = (input: string): number | null => {
    if (!input.trim()) return null;

    // If it contains ":", parse as MM:SS
    if (input.includes(':')) {
      const parts = input.split(':');
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }

    // Otherwise parse as seconds
    const seconds = parseInt(input);
    return isNaN(seconds) ? null : seconds;
  };

  // Generate timestamped embed URL for video platforms
  const getTimestampedEmbedUrl = (platform: string, embedIdValue: string, timestampSeconds: number): string => {
    const baseUrl = VideoEmbedService.getEmbedUrl(platform as any, embedIdValue);

    if (platform === 'youtube') {
      // YouTube uses ?start= or &start= parameter (in seconds) + autoplay=1
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}start=${Math.floor(timestampSeconds)}&autoplay=1`;
    } else if (platform === 'vimeo') {
      // Vimeo uses #t= parameter (in seconds) + autoplay=1 in query string
      const separator = baseUrl.includes('?') ? '&' : '?';
      const baseWithAutoplay = `${baseUrl}${separator}autoplay=1`;
      return `${baseWithAutoplay}#t=${Math.floor(timestampSeconds)}s`;
    }

    return baseUrl;
  };

  // Handle timestamp click to reload video at specific time
  const handleTimestampClick = (timestampSeconds: number) => {
    if (!embedId || !mediaPlatform) return;

    // Generate new URL with timestamp
    const newUrl = getTimestampedEmbedUrl(mediaPlatform, embedId, timestampSeconds);

    // Force VideoEmbed to reload by updating the URL
    // We need to briefly unmount and remount to reload the iframe
    setCurrentVideoUrl('');
    setTimeout(() => {
      setCurrentVideoUrl(newUrl);
    }, 10);
  };

  // Convert MediaComment to RecordingComment format for AudioPlayer
  const convertedComments: RecordingComment[] = comments.map(comment => ({
    id: comment.id,
    practice_id: '',
    recording_id: '',
    user_name: comment.created_by,
    comment_text: comment.comment_text,
    timestamp_seconds: comment.timestamp_seconds,
    created_at: comment.created_at
  }));

  // Sort comments (timestamped first, then general)
  const sortedComments = [...comments].sort((a, b) => {
    // Timestamped comments first
    if (a.timestamp_seconds >= 0 && b.timestamp_seconds < 0) return -1;
    if (a.timestamp_seconds < 0 && b.timestamp_seconds >= 0) return 1;
    // Sort timestamped by time
    if (a.timestamp_seconds >= 0 && b.timestamp_seconds >= 0) {
      return a.timestamp_seconds - b.timestamp_seconds;
    }
    // General comments by creation date
    return 0;
  });

  // Handle adding comment
  const handleAddComment = (timestampSeconds?: number) => {
    if (!isEditable) return;

    setNewCommentTimestamp(timestampSeconds ?? 0);
    setIsAddingComment(true);
  };

  const handleSubmitComment = () => {
    if (!newCommentText.trim() || newCommentTimestamp === null) return;

    onAddComment(newCommentTimestamp, newCommentText.trim());
    setNewCommentText('');
    setNewCommentTimestamp(null);
    setIsAddingComment(false);
  };

  const handleCancelComment = () => {
    setNewCommentText('');
    setNewCommentTimestamp(null);
    setIsAddingComment(false);
  };

  // Handle adding comment for embedded videos
  const handleAddEmbeddedComment = () => {
    if (!commentText.trim()) return;

    let timestamp: number | null = null;

    // Only parse timestamp if input is provided
    if (timestampInput.trim()) {
      timestamp = parseTimestamp(timestampInput.trim());
      if (timestamp === null) {
        // Invalid timestamp format - treat as general comment
        timestamp = -1;
      }
    } else {
      // No timestamp provided - general comment
      timestamp = -1;
    }

    onAddComment(timestamp, commentText.trim());

    // Reset form
    setCommentText('');
    setTimestampInput('');
  };

  return (
    <div className="media-preview space-y-4">
      {/* Media container - 16:9 for embedded videos, auto-height for AudioPlayer */}
      {mediaType === 'video' && embedId && mediaPlatform ? (
        // Embedded video - use 16:9 container
        <div className="media-container bg-black rounded-lg overflow-hidden relative" style={{ paddingTop: '56.25%' }}>
          <div className="absolute inset-0">
            {currentVideoUrl && (
              <VideoEmbed
                embedUrl={currentVideoUrl}
                platform={mediaPlatform as any}
                title="Lesson media"
                className="w-full h-full"
              />
            )}
          </div>
        </div>
      ) : (
        // Uploaded audio/video - use auto-height container for AudioPlayer
        <div className="media-container bg-white rounded-lg border p-4">
          <AudioPlayer
            url={mediaType === 'audio' ? mediaUrl : undefined}
            videoUrl={mediaType === 'video' ? mediaUrl : undefined}
            title={mediaType === 'audio' ? 'Audio' : 'Video'}
            comments={convertedComments}
            onAddComment={handleAddComment}
            showControls={true}
            showDeleteButton={false}
          />
        </div>
      )}

      {/* Rest of the content (comments, form) - scales vertically */}
      {mediaType === 'video' && embedId && mediaPlatform && (
        <div className="mt-3">
          {/* Existing Comments - No title, just the list */}
          {comments.length > 0 && (
            <div className="space-y-2 mb-3">
              {sortedComments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded p-3 flex justify-between items-start">
                  <div className="flex-1">
                    {comment.timestamp_seconds !== null && comment.timestamp_seconds >= 0 ? (
                      <button
                        type="button"
                        onClick={() => handleTimestampClick(comment.timestamp_seconds)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer mr-2 transition-colors"
                        title={`Jump to ${formatTime(comment.timestamp_seconds)}`}
                      >
                        [{formatTime(comment.timestamp_seconds)}]
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-gray-500 mr-2">
                        [General]
                      </span>
                    )}
                    <span className="text-sm text-gray-800">{comment.comment_text}</span>
                  </div>
                  {isEditable && (
                    <button
                      onClick={() => onDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-700 ml-2"
                      title="Delete comment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Form (teachers only) - Compact single-line */}
          {isEditable && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={timestampInput}
                onChange={(e) => setTimestampInput(e.target.value)}
                placeholder="MM:SS"
                className="w-20 px-2 py-1.5 border rounded text-sm"
              />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEmbeddedComment();
                  }
                }}
                placeholder="Add comment..."
                className="flex-1 px-3 py-1.5 border rounded text-sm"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleAddEmbeddedComment}
                disabled={!commentText.trim()}
                className="p-1.5"
                title="Add comment"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Comment Creation Form */}
      {isEditable && isAddingComment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-semibold text-blue-900">
              Add Comment at {formatTime(newCommentTimestamp || 0)}
            </h4>
            <button
              onClick={handleCancelComment}
              className="text-blue-600 hover:text-blue-800"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Enter your comment..."
            className="w-full px-3 py-2 border rounded-md text-sm mb-2"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSubmitComment}
              disabled={!newCommentText.trim()}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Comment
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCancelComment}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Lyrics Display with Annotations */}
      {lyrics && mediaId && userId && (
        <div className="mt-4">
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lyrics</h3>
            <LyricsWithAnnotations
              lyrics={lyrics}
              mediaId={mediaId}
              userId={userId}
              isTeacher={isTeacher}
              assignmentId={assignmentId}
              availableStudents={availableStudents}
            />
          </div>
        </div>
      )}

      {/* Fallback for lyrics without annotation support */}
      {lyrics && (!mediaId || !userId) && (
        <div className="mt-4">
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lyrics</h3>
            <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {lyrics}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 italic">
            Sign in to add annotations
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPreview;
