'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Play, Pause, Square, SkipBack, SkipForward, Download, Trash2, Edit3 } from 'lucide-react';
import { AudioPiece } from '@/contexts/AppContext';
import { analyzeAudioBlob, formatTime, calculateSeekTime, WaveformData } from '@/utils/audioAnalysis';

interface AudioPlayerProps {
  piece: AudioPiece;
  index: number;
  onDelete: (pieceId: string) => void;
  onDownload: (piece: AudioPiece) => void;
  onTitleUpdate?: (pieceId: string, title: string) => void;
  isPlaying: boolean;
  onPlayStateChange: (pieceId: string, playing: boolean) => void;
  exerciseName: string;
  showDeleteButton?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  piece,
  index,
  onDelete,
  onDownload,
  onTitleUpdate,
  isPlaying,
  onPlayStateChange,
  exerciseName,
  showDeleteButton = true
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(piece.duration);
  const [isLoading, setIsLoading] = useState(false);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Generate waveform data on mount
  useEffect(() => {
    let isMounted = true;

    const generateWaveform = async () => {
      setIsLoading(true);
      try {
        const data = await analyzeAudioBlob(piece.blob, 80); // 80 bars for waveform
        if (isMounted) {
          setWaveformData(data);
          setDuration(data.duration || piece.duration);
        }
      } catch (error) {
        console.error('Error generating waveform:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    generateWaveform();

    return () => {
      isMounted = false;
    };
  }, [piece.blob, piece.duration]);

  // Create and cleanup audio URL
  useEffect(() => {
    const url = URL.createObjectURL(piece.blob);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [piece.blob]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setCurrentTime(0);
      onPlayStateChange(piece.id, false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, piece.id, onPlayStateChange]);

  // Handle play/pause state changes from parent
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        onPlayStateChange(piece.id, false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, piece.id, onPlayStateChange]);

  const handlePlayPause = useCallback(() => {
    onPlayStateChange(piece.id, !isPlaying);
  }, [piece.id, isPlaying, onPlayStateChange]);

  const handleStop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
    }
    onPlayStateChange(piece.id, false);
  }, [piece.id, onPlayStateChange]);

  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, duration));
    }
  }, [duration]);

  const handleSkipBackward = useCallback(() => {
    handleSeek(currentTime - 10);
  }, [currentTime, handleSeek]);

  const handleSkipForward = useCallback(() => {
    handleSeek(currentTime + 10);
  }, [currentTime, handleSeek]);

  // Title editing handlers
  const getDisplayTitle = useCallback(() => {
    return piece.customTitle || `Recording ${index + 1}`;
  }, [piece.customTitle, index]);

  const handleTitleClick = useCallback(() => {
    if (!onTitleUpdate) return;
    setEditingTitle(getDisplayTitle());
    setIsEditingTitle(true);
  }, [getDisplayTitle, onTitleUpdate]);

  const handleTitleSave = useCallback(() => {
    if (!onTitleUpdate) return;
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== getDisplayTitle()) {
      onTitleUpdate(piece.id, trimmedTitle);
    }
    setIsEditingTitle(false);
    setEditingTitle('');
  }, [editingTitle, getDisplayTitle, onTitleUpdate, piece.id]);

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

    handleSeek(seekTime);
  }, [duration, handleSeek]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player">
      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}

      {/* Main row layout: Title | Waveform | Controls */}
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
                className={`text-sm font-medium text-gray-800 truncate flex items-center gap-1 ${
                  onTitleUpdate ? 'cursor-pointer hover:text-blue-600 group' : ''
                }`}
                onClick={handleTitleClick}
                title={onTitleUpdate ? 'Click to edit title' : ''}
              >
                <span className="truncate">{getDisplayTitle()}</span>
                {onTitleUpdate && (
                  <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                )}
              </div>
            )}
            <div className="text-xs text-gray-500 truncate">
              {formatTime(duration)} • {new Date(piece.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Center: Waveform Visualization */}
        <div className="flex-1 min-w-0">
          <div className="waveform-container">
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
              </div>
            )}

            {/* Time display */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
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
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onDownload(piece)}
            className="p-1.5 ml-2"
            title="Download recording"
          >
            <Download className="w-3 h-3" />
          </Button>

          {/* Delete */}
          {showDeleteButton && (
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
    </div>
  );
};

export default AudioPlayer;