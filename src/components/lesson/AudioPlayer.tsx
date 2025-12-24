'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Play, Pause, Square, SkipBack, SkipForward, Download, Trash2, Edit3 } from 'lucide-react';
import { AudioPiece } from '@/contexts/AppContext';
import { analyzeAudioBlob, formatTime, calculateSeekTime, WaveformData } from '@/utils/audioAnalysis';
import { PracticeComment as RecordingComment } from '@/services/practiceService';
import CommentPopover from '@/components/ui/CommentPopover';

interface AudioPlayerProps {
  // Source: Either piece (for blob-based practice recordings) OR url/duration (for URL-based media)
  piece?: AudioPiece;
  url?: string;
  duration?: number;
  title?: string;
  videoUrl?: string; // If provided, show video player synced with waveform

  // Recording identification
  index?: number;
  exerciseName?: string;

  // Actions
  onDelete?: (pieceId: string) => void;
  onDownload?: (piece: AudioPiece) => void;
  onTitleUpdate?: (pieceId: string, title: string) => void;

  // Playback state (only for piece-based mode)
  isPlaying?: boolean;
  onPlayStateChange?: (pieceId: string, playing: boolean) => void;

  // UI options
  showDeleteButton?: boolean;
  showControls?: boolean; // For URL mode, controls are always shown
  showWaveform?: boolean; // Whether to display the waveform visualization

  // Comments
  comments?: RecordingComment[];
  onAddComment?: (timestampSeconds?: number) => void;
  onCommentMarkerClick?: (commentIds: string[]) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  piece,
  url,
  duration: initialDuration,
  title,
  videoUrl,
  index = 0,
  exerciseName,
  onDelete,
  onDownload,
  onTitleUpdate,
  isPlaying: externalIsPlaying,
  onPlayStateChange,
  showDeleteButton = true,
  showControls = true,
  showWaveform = true,
  comments = [],
  onAddComment,
  onCommentMarkerClick
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  // Determine if we're in URL mode or piece mode
  const isUrlMode = !!url || !!videoUrl;
  const sourceUrl = url || videoUrl;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || piece?.duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Internal playing state for URL mode
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = isUrlMode ? internalIsPlaying : (externalIsPlaying ?? false);

  // Comment popover state
  const [hoveredCommentCluster, setHoveredCommentCluster] = useState<RecordingComment[] | null>(null);
  const [stickyCommentCluster, setStickyCommentCluster] = useState<RecordingComment[] | null>(null);
  const [popoverTargetElement, setPopoverTargetElement] = useState<HTMLElement | null>(null);
  const [stickyTargetElement, setStickyTargetElement] = useState<HTMLElement | null>(null);

  // Comment cluster type
  interface CommentCluster {
    comments: RecordingComment[];
    position: number; // percentage position on waveform
    pixelPosition: number; // actual pixel position for clustering
  }

  // Generate waveform data on mount
  useEffect(() => {
    let isMounted = true;

    const generateWaveform = async () => {
      setIsLoading(true);
      try {
        if (piece?.blob) {
          // Blob-based mode (practice recordings)
          const data = await analyzeAudioBlob(piece.blob, 80);
          if (isMounted) {
            setWaveformData(data);
            setDuration(data.duration || piece.duration);
          }
        } else if (sourceUrl) {
          // URL-based mode (uploaded media)
          const response = await fetch(sourceUrl);
          const blob = await response.blob();
          const data = await analyzeAudioBlob(blob, 80);
          if (isMounted) {
            setWaveformData(data);
            setDuration(data.duration || initialDuration || 0);
          }
        }
      } catch (error) {
        console.error('Error generating waveform:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (piece?.blob || sourceUrl) {
      generateWaveform();
    }

    return () => {
      isMounted = false;
    };
  }, [piece?.blob, piece?.duration, sourceUrl, initialDuration]);

  // Create and cleanup audio URL
  useEffect(() => {
    if (piece?.blob) {
      // Blob-based mode: create object URL
      const url = URL.createObjectURL(piece.blob);
      setAudioUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (sourceUrl) {
      // URL-based mode: use URL directly
      setAudioUrl(sourceUrl);
    }
  }, [piece?.blob, sourceUrl]);

  // Audio/Video event handlers
  useEffect(() => {
    const mediaElement = videoUrl ? videoRef.current : audioRef.current;
    if (!mediaElement || !audioUrl) return;

    const handleTimeUpdate = () => setCurrentTime(mediaElement.currentTime);
    const handleLoadedMetadata = () => setDuration(mediaElement.duration);
    const handleEnded = () => {
      setCurrentTime(0);
      if (isUrlMode) {
        setInternalIsPlaying(false);
      } else if (piece && onPlayStateChange) {
        onPlayStateChange(piece.id, false);
      }
    };

    mediaElement.addEventListener('timeupdate', handleTimeUpdate);
    mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    mediaElement.addEventListener('ended', handleEnded);

    return () => {
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, videoUrl, piece, onPlayStateChange, isUrlMode]);

  // Handle play/pause state changes
  useEffect(() => {
    const mediaElement = videoUrl ? videoRef.current : audioRef.current;
    if (!mediaElement) return;

    if (isPlaying) {
      mediaElement.play().catch(error => {
        console.error('Error playing media:', error);
        if (isUrlMode) {
          setInternalIsPlaying(false);
        } else if (piece && onPlayStateChange) {
          onPlayStateChange(piece.id, false);
        }
      });
    } else {
      mediaElement.pause();
    }
  }, [isPlaying, piece, onPlayStateChange, isUrlMode, videoUrl]);

  const handlePlayPause = useCallback(() => {
    if (isUrlMode) {
      setInternalIsPlaying(!isPlaying);
    } else if (piece && onPlayStateChange) {
      onPlayStateChange(piece.id, !isPlaying);
    }
  }, [isUrlMode, piece, isPlaying, onPlayStateChange]);

  const handleStop = useCallback(() => {
    const mediaElement = videoUrl ? videoRef.current : audioRef.current;
    if (mediaElement) {
      mediaElement.pause();
      mediaElement.currentTime = 0;
      setCurrentTime(0);
    }
    if (isUrlMode) {
      setInternalIsPlaying(false);
    } else if (piece && onPlayStateChange) {
      onPlayStateChange(piece.id, false);
    }
  }, [isUrlMode, piece, onPlayStateChange, videoUrl]);

  const handleSeek = useCallback((time: number) => {
    const mediaElement = videoUrl ? videoRef.current : audioRef.current;
    if (mediaElement) {
      mediaElement.currentTime = Math.max(0, Math.min(time, duration));
    }
  }, [duration, videoUrl]);

  const handleSkipBackward = useCallback(() => {
    handleSeek(currentTime - 10);
  }, [currentTime, handleSeek]);

  const handleSkipForward = useCallback(() => {
    handleSeek(currentTime + 10);
  }, [currentTime, handleSeek]);

  // Title editing handlers
  const getDisplayTitle = useCallback(() => {
    if (title) return title;
    if (piece?.customTitle) return piece.customTitle;
    return `Recording ${index + 1}`;
  }, [title, piece?.customTitle, index]);

  const handleTitleClick = useCallback(() => {
    if (!onTitleUpdate) return;
    setEditingTitle(getDisplayTitle());
    setIsEditingTitle(true);
  }, [getDisplayTitle, onTitleUpdate]);

  const handleTitleSave = useCallback(() => {
    if (!onTitleUpdate || !piece) return;
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== getDisplayTitle()) {
      onTitleUpdate(piece.id, trimmedTitle);
    }
    setIsEditingTitle(false);
    setEditingTitle('');
  }, [editingTitle, getDisplayTitle, onTitleUpdate, piece]);

  const handleTitleCancel = useCallback(() => {
    setIsEditingTitle(false);
    setEditingTitle('');
  }, []);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleWaveformClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const waveform = waveformRef.current;
    if (!waveform) return;

    const rect = waveform.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const seekTime = calculateSeekTime(clickX, rect.width, duration);

    // Trigger comment form with timestamp when clicking empty spot on waveform
    if (onAddComment) {
      onAddComment(seekTime);
    }
    handleSeek(seekTime);
  }, [duration, handleSeek, onAddComment]);

  // Comment clustering function
  const clusterComments = useCallback((comments: RecordingComment[], waveformWidth: number): CommentCluster[] => {
    if (comments.length === 0) return [];

    // Filter to only top-level comments (no parent_comment_id) with valid timestamps and sort by timestamp
    const validComments = comments
      .filter(comment => comment.timestamp_seconds != null && !comment.parent_comment_id)
      .sort((a, b) => a.timestamp_seconds! - b.timestamp_seconds!);

    if (validComments.length === 0) return [];

    const clusters: CommentCluster[] = [];
    const CLUSTER_THRESHOLD = 20; // pixels - comments within this distance are clustered

    for (const comment of validComments) {
      const position = (comment.timestamp_seconds! / duration) * 100;
      const pixelPosition = (position / 100) * waveformWidth;

      // Try to find an existing cluster within threshold
      let addedToCluster = false;
      for (const cluster of clusters) {
        if (Math.abs(cluster.pixelPosition - pixelPosition) <= CLUSTER_THRESHOLD) {
          cluster.comments.push(comment);
          // Update cluster position to be the average of all comments in cluster
          const avgPosition = cluster.comments.reduce((sum, c) => sum + ((c.timestamp_seconds! / duration) * 100), 0) / cluster.comments.length;
          cluster.position = avgPosition;
          cluster.pixelPosition = (avgPosition / 100) * waveformWidth;
          addedToCluster = true;
          break;
        }
      }

      // If not added to existing cluster, create a new one
      if (!addedToCluster) {
        clusters.push({
          comments: [comment],
          position,
          pixelPosition
        });
      }
    }

    return clusters;
  }, [duration]);

  // Handle comment hover
  const handleCommentHover = useCallback((cluster: CommentCluster, element: HTMLElement) => {
    // Don't show hover popover if there's already a sticky one
    if (stickyCommentCluster) return;

    setHoveredCommentCluster(cluster.comments);
    setPopoverTargetElement(element);
  }, [stickyCommentCluster]);

  const handleCommentLeave = useCallback(() => {
    // Don't hide hover popover if there's a sticky one
    if (stickyCommentCluster) return;

    setHoveredCommentCluster(null);
    setPopoverTargetElement(null);
  }, [stickyCommentCluster]);

  // Handle comment click for sticky behavior
  const handleCommentClick = useCallback((cluster: CommentCluster, element: HTMLElement) => {
    // If clicking the same cluster that's already sticky, close it
    if (stickyCommentCluster &&
        stickyCommentCluster.length === cluster.comments.length &&
        stickyCommentCluster.every((comment, i) => comment.id === cluster.comments[i]?.id)) {
      setStickyCommentCluster(null);
      setStickyTargetElement(null);
      return;
    }

    // Clear hover state and set sticky state
    setHoveredCommentCluster(null);
    setPopoverTargetElement(null);
    setStickyCommentCluster(cluster.comments);
    setStickyTargetElement(element);

    // Notify parent component about all selected comments in the cluster
    if (onCommentMarkerClick && cluster.comments.length > 0) {
      onCommentMarkerClick(cluster.comments.map(c => c.id));
    }
  }, [stickyCommentCluster, onCommentMarkerClick]);

  // Handle sticky popover close
  const handleStickyClose = useCallback(() => {
    setStickyCommentCluster(null);
    setStickyTargetElement(null);
  }, []);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player shadow-sm hover:shadow-md transition-shadow">
      {/* Video element (if videoUrl is provided) */}
      {videoUrl && audioUrl && (
        <div className="mb-4">
          <video
            ref={videoRef}
            src={audioUrl}
            className="w-full rounded-lg"
            controls
            preload="metadata"
          />
        </div>
      )}

      {/* Hidden audio element (if no video) */}
      {!videoUrl && audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}

      {/* Main layout: Adaptive based on showWaveform */}
      {showWaveform ? (
        /* Waveform mode: Single row layout - Title | Waveform | Controls */
        <div className="flex items-center gap-4">
          {/* Left: Recording info */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0" style={{ width: '200px' }}>
            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="mb-1">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={handleTitleSave}
                    className="w-full text-sm font-medium text-gray-800 bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    maxLength={50}
                  />
                </div>
              ) : (
                <div
                  className={`truncate flex items-center gap-1 ${
                    onTitleUpdate ? 'cursor-pointer group' : ''
                  }`}
                  onClick={handleTitleClick}
                  title={onTitleUpdate ? 'Click to edit title' : ''}
                  style={{ fontSize: '13.5px', fontWeight: 900, color: 'var(--text)' }}
                >
                  <span className="truncate">{getDisplayTitle()}</span>
                  {onTitleUpdate && (
                    <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                  )}
                </div>
              )}
              <div className="text-xs text-gray-500 truncate">
                {formatTime(duration)}
                {piece?.timestamp && ` • ${new Date(piece.timestamp).toLocaleTimeString()}`}
              </div>
            </div>
          </div>

          {/* Center: Waveform Visualization */}
          <div className="flex-1 min-w-0">
            <div ref={waveformContainerRef} className="waveform-container">
              {isLoading ? (
                <div className="waveform-loading">
                  <div className="flex space-x-1">
                    {Array.from({ length: 60 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-300 animate-pulse rounded-full"
                        style={{
                          width: '2px',
                          height: `${Math.random() * 20 + 10}px`
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  ref={waveformRef}
                  className="waveform"
                  onClick={handleWaveformClick}
                  role="progressbar"
                  tabIndex={0}
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={currentTime}
                  aria-label="Audio waveform - click to seek"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      handleSkipBackward();
                      e.preventDefault();
                    } else if (e.key === 'ArrowRight') {
                      handleSkipForward();
                      e.preventDefault();
                    } else if (e.key === ' ' || e.key === 'Enter') {
                      handlePlayPause();
                      e.preventDefault();
                    }
                  }}
                >
                  {waveformData?.samples.map((amplitude, i) => (
                    <div
                      key={i}
                      className="waveform-bar"
                      style={{
                        height: `${Math.max(2, amplitude * 30)}px`,
                        opacity: (i / waveformData.samples.length) * 100 <= progressPercentage ? 1 : 0.4
                      }}
                    />
                  ))}

                  {/* Progress indicator */}
                  <div
                    className="waveform-progress"
                    style={{ left: `${progressPercentage}%` }}
                  />

                  {/* Clustered comment indicators */}
                  {(() => {
                    const waveformWidth = waveformRef.current?.getBoundingClientRect()?.width || 300;
                    const clusters = clusterComments(comments, waveformWidth);

                    return clusters.map((cluster, index) => {
                      const isMultiple = cluster.comments.length > 1;
                      // Check if this is an end-of-recording comment (within 0.5 seconds of the end)
                      const isEndComment = cluster.comments.some(c =>
                        c.timestamp_seconds != null &&
                        Math.abs(c.timestamp_seconds - duration) < 0.5
                      );

                      // Use different color for end comments
                      const markerColor = isEndComment ? 'bg-green-500' : 'bg-blue-500';
                      const badgeColor = isEndComment ? 'bg-green-600' : 'bg-blue-600';

                      return (
                        <div
                          key={`cluster-${index}`}
                          className={`absolute top-0 bottom-0 w-1 ${markerColor} z-10 cursor-pointer`}
                          style={{ left: `${cluster.position}%` }}
                          onMouseEnter={(e) => handleCommentHover(cluster, e.currentTarget)}
                          onMouseLeave={handleCommentLeave}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent waveform click
                            handleCommentClick(cluster, e.currentTarget);
                          }}
                          title={isEndComment ? 'Comment about the full recording' : 'Comment at this timestamp'}
                        >
                          <div className={`absolute -top-1 left-0 w-3 h-3 ${markerColor} rounded-full transform -translate-x-1 flex items-center justify-center`}>
                            {isMultiple && (
                              <div className={`absolute -top-1 -right-1 w-4 h-4 ${badgeColor} text-white text-xs font-bold rounded-full flex items-center justify-center border border-white`}>
                                {cluster.comments.length}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Time display */}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Hover Comment popover */}
              <CommentPopover
                comments={hoveredCommentCluster || []}
                isVisible={!!hoveredCommentCluster && !stickyCommentCluster}
                targetElement={popoverTargetElement}
                onClose={handleCommentLeave}
                containerRef={waveformContainerRef}
                isSticky={false}
                recordingDuration={duration}
              />

              {/* Sticky Comment popover */}
              <CommentPopover
                comments={stickyCommentCluster || []}
                isVisible={!!stickyCommentCluster}
                targetElement={stickyTargetElement}
                onClose={handleStickyClose}
                containerRef={waveformContainerRef}
                isSticky={true}
                recordingDuration={duration}
              />
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Skip backward */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSkipBackward}
              className="p-1.5"
              disabled={!audioUrl}
              title="Skip backward 10s"
            >
              <SkipBack className="w-3 h-3" />
            </Button>

            {/* Play/Pause */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePlayPause}
              className="p-1.5"
              disabled={!audioUrl}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </Button>

            {/* Stop */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleStop}
              className="p-1.5"
              disabled={!audioUrl}
              title="Stop"
            >
              <Square className="w-3 h-3" />
            </Button>

            {/* Skip forward */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSkipForward}
              className="p-1.5"
              disabled={!audioUrl}
              title="Skip forward 10s"
            >
              <SkipForward className="w-3 h-3" />
            </Button>

            {/* Download */}
            {piece && onDownload && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDownload(piece)}
                className="p-1.5 ml-2"
                title="Download recording"
              >
                <Download className="w-3 h-3" />
              </Button>
            )}

            {/* Delete */}
            {showDeleteButton && piece && onDelete && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDelete(piece.id)}
                className="p-1.5"
                title="Delete recording"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Compact mode: Stacked layout - Info row + Controls row */
        <div className="space-y-3">
          {/* First row: Recording info and time */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                {isEditingTitle ? (
                  <div className="mb-1">
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={handleTitleSave}
                      className="w-full text-sm font-medium text-gray-800 bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      maxLength={50}
                    />
                  </div>
                ) : (
                  <div
                    className={`truncate flex items-center gap-1 ${
                      onTitleUpdate ? 'cursor-pointer group' : ''
                    }`}
                    onClick={handleTitleClick}
                    title={onTitleUpdate ? 'Click to edit title' : ''}
                    style={{ fontSize: '13.5px', fontWeight: 900, color: 'var(--text)' }}
                  >
                    <span className="truncate">{getDisplayTitle()}</span>
                    {onTitleUpdate && (
                      <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                    )}
                  </div>
                )}
                <div className="text-xs text-gray-500 truncate">
                  {formatTime(duration)}
                  {piece?.timestamp && ` • ${new Date(piece.timestamp).toLocaleTimeString()}`}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600 font-medium flex-shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Second row: Controls */}
          <div className="flex items-center justify-center gap-2">
            {/* Skip backward */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSkipBackward}
              className="p-2"
              disabled={!audioUrl}
              title="Skip backward 10s"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePlayPause}
              className="p-2"
              disabled={!audioUrl}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            {/* Stop */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleStop}
              className="p-2"
              disabled={!audioUrl}
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </Button>

            {/* Skip forward */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSkipForward}
              className="p-2"
              disabled={!audioUrl}
              title="Skip forward 10s"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            {/* Download */}
            {piece && onDownload && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDownload(piece)}
                className="p-2 ml-2"
                title="Download recording"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            {/* Delete */}
            {showDeleteButton && piece && onDelete && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDelete(piece.id)}
                className="p-2"
                title="Delete recording"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;