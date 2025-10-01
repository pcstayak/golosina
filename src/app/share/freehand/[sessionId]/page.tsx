'use client'

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Mic, Calendar, Video } from 'lucide-react';
import { FreehandLessonService, type FreehandLesson } from '@/services/freehandLessonService';
import { FreehandPracticeService, type FreehandPracticeSession } from '@/services/freehandPracticeService';
import { SharedLessonService, type RecordingComment } from '@/services/sharedLessonService';
import AudioPlayer from '@/components/lesson/AudioPlayer';
import VideoCarousel from '@/components/lesson/VideoCarousel';
import { AudioPiece } from '@/contexts/AppContext';
import { MessageSquare, Send, User } from 'lucide-react';
import { formatTime } from '@/utils/audioAnalysis';
import Link from 'next/link';

export default function SharedFreehandLessonPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId;
  const [practiceData, setPracticeData] = useState<FreehandPracticeSession | null>(null);
  const [lessonData, setLessonData] = useState<FreehandLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [convertedAudioPieces, setConvertedAudioPieces] = useState<AudioPiece[]>([]);
  const [comments, setComments] = useState<Record<string, RecordingComment[]>>({});
  const [commentForms, setCommentForms] = useState<Record<string, {
    commentText: string;
    timestampSeconds?: number;
    includeTimestamp: boolean;
  }>>({});
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchPracticeData = async () => {
      if (!sessionId || typeof sessionId !== 'string') {
        setError('Invalid session ID');
        setLoading(false);
        return;
      }

      try {
        const practice = await FreehandPracticeService.getPracticeSession(sessionId);
        if (practice) {
          setPracticeData(practice);

          if (practice.freehand_lesson_id) {
            const lesson = await FreehandLessonService.getFreehandLesson(practice.freehand_lesson_id);
            if (lesson) {
              setLessonData(lesson);
            }
          }
        } else {
          setError('Practice session not found or has expired');
        }
      } catch (err) {
        console.error('Error loading practice session:', err);
        setError('Failed to load practice session');
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeData();

    if (sessionId && typeof sessionId === 'string') {
      setIsOwner(FreehandPracticeService.isSessionOwned(sessionId));
    }
  }, [sessionId]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const convertToAudioPiece = useCallback(async (file: any, index: number): Promise<AudioPiece> => {
    const response = await fetch(file.url);
    const blob = await response.blob();

    return {
      id: `recording-${index}`,
      blob,
      timestamp: file.timestamp,
      duration: file.duration,
      exerciseId: 0,
      exerciseName: file.name,
      customTitle: file.name
    };
  }, []);

  const handlePlayStateChange = useCallback((pieceId: string, playing: boolean) => {
    if (playing) {
      setCurrentlyPlaying(pieceId);
    } else {
      if (currentlyPlaying === pieceId) {
        setCurrentlyPlaying(null);
      }
    }
  }, [currentlyPlaying]);

  const downloadPiece = useCallback((piece: AudioPiece) => {
    if (!practiceData?.recordings) return;

    for (const [key, recordingSet] of Object.entries(practiceData.recordings)) {
      const file = recordingSet.files.find((_, index) => `recording-${index}` === piece.id);
      if (file) {
        const a = document.createElement('a');
        a.href = file.url;
        a.download = `${file.name}.webm`;
        a.click();
        break;
      }
    }
  }, [practiceData]);

  useEffect(() => {
    const convertPracticeData = async () => {
      if (!practiceData?.recordings) {
        setConvertedAudioPieces([]);
        return;
      }

      const pieces: AudioPiece[] = [];
      let globalIndex = 0;

      for (const [key, recordingSet] of Object.entries(practiceData.recordings)) {
        for (let i = 0; i < recordingSet.files.length; i++) {
          const file = recordingSet.files[i];
          try {
            const audioPiece = await convertToAudioPiece(file, globalIndex);
            pieces.push(audioPiece);
            globalIndex++;
          } catch (error) {
            console.error('Error converting audio file:', error);
          }
        }
      }

      setConvertedAudioPieces(pieces);
    };

    convertPracticeData();
  }, [practiceData, convertToAudioPiece]);

  useEffect(() => {
    const loadComments = async () => {
      if (!sessionId || typeof sessionId !== 'string' || !practiceData) return;

      try {
        const allComments = await SharedLessonService.getComments(sessionId);

        const commentsByRecording: Record<string, RecordingComment[]> = {};
        allComments.forEach(comment => {
          if (!commentsByRecording[comment.recording_id]) {
            commentsByRecording[comment.recording_id] = [];
          }
          commentsByRecording[comment.recording_id].push(comment);
        });

        setComments(commentsByRecording);
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };

    loadComments();
  }, [sessionId, practiceData]);

  const handleAddComment = useCallback((recordingId: string, timestampSeconds?: number) => {
    setCommentForms(prev => ({
      ...prev,
      [recordingId]: {
        commentText: prev[recordingId]?.commentText || '',
        timestampSeconds,
        includeTimestamp: prev[recordingId]?.includeTimestamp || false
      }
    }));
  }, []);

  const handleSubmitComment = useCallback(async (recordingId: string) => {
    const form = commentForms[recordingId];
    if (!sessionId || !recordingId || !form?.commentText.trim()) {
      return;
    }

    try {
      const result = await SharedLessonService.addComment(
        sessionId,
        recordingId,
        'Anonymous User',
        form.commentText.trim(),
        undefined,
        form.includeTimestamp ? form.timestampSeconds : undefined
      );

      if (result.success) {
        const recordingComments = await SharedLessonService.getComments(sessionId, recordingId);
        setComments(prev => ({
          ...prev,
          [recordingId]: recordingComments
        }));

        setCommentForms(prev => ({
          ...prev,
          [recordingId]: {
            commentText: '',
            timestampSeconds: undefined,
            includeTimestamp: false
          }
        }));
      } else {
        alert('Failed to add comment: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  }, [sessionId, commentForms]);

  const handleUpdateCommentForm = useCallback((recordingId: string, field: string, value: string | boolean) => {
    setCommentForms(prev => ({
      ...prev,
      [recordingId]: {
        ...prev[recordingId],
        [field]: field === 'includeTimestamp' ? (value === 'true' || value === true) : value
      }
    }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !practiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🎤</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Practice Session Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'This practice session may have been deleted or the link is invalid.'}
          </p>
          <Link href="/">
            <Button variant="primary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go to Voice Trainer
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalRecordings = practiceData.recording_count || 0;
  const totalDuration = convertedAudioPieces.reduce((sum, piece) => sum + piece.duration, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {lessonData?.title || 'Freehand Practice Session'}
                </h1>
                <p className="text-gray-600">Freehand Vocal Training Practice</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="secondary" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to App
              </Button>
            </Link>
          </div>

          {lessonData?.description && (
            <p className="text-gray-700 mb-4">{lessonData.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Practiced On</span>
              </div>
              <p className="font-semibold">{formatDate(practiceData.created_at || '')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Video className="w-4 h-4" />
                <span className="text-sm">Reference Videos</span>
              </div>
              <p className="font-semibold">{lessonData?.videos?.length || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Mic className="w-4 h-4" />
                <span className="text-sm">Recordings</span>
              </div>
              <p className="font-semibold">{totalRecordings}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lessonData?.videos && lessonData.videos.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                Reference Videos
              </h2>
              <VideoCarousel videos={lessonData.videos} />
            </div>
          )}

          {convertedAudioPieces.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-red-600" />
                Practice Recordings
              </h2>

              <div className="space-y-6">
                {convertedAudioPieces.map((piece, index) => {
                  const form = commentForms[piece.id];
                  const recordingComments = comments[piece.id] || [];

                  return (
                    <div key={piece.id} className="space-y-4">
                      <AudioPlayer
                        piece={piece}
                        index={index}
                        onDelete={() => {}}
                        onDownload={downloadPiece}
                        onTitleUpdate={undefined}
                        isPlaying={currentlyPlaying === piece.id}
                        onPlayStateChange={handlePlayStateChange}
                        exerciseName="Recording"
                        showDeleteButton={false}
                        comments={recordingComments}
                        onAddComment={(timestampSeconds) => handleAddComment(piece.id, timestampSeconds)}
                      />

                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Comments ({recordingComments.length})
                          </h4>
                        </div>

                        {recordingComments.length > 0 && (
                          <div className="space-y-3">
                            {recordingComments
                              .sort((a, b) => (a.timestamp_seconds || 0) - (b.timestamp_seconds || 0))
                              .map((comment) => (
                                <div key={comment.id} className="bg-white rounded-lg p-3 shadow-sm">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 text-gray-600">
                                        <User className="w-3 h-3" />
                                        <span className="font-medium text-gray-800">{comment.user_name}</span>
                                      </div>
                                      {comment.timestamp_seconds != null && (
                                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                          {formatTime(comment.timestamp_seconds)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 text-sm">{comment.comment_text}</p>
                                </div>
                              ))}
                          </div>
                        )}

                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Add a Comment
                          </h5>

                          <div className="space-y-2">
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <textarea
                                  value={form?.commentText || ''}
                                  onChange={(e) => handleUpdateCommentForm(piece.id, 'commentText', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  placeholder="Enter your comment..."
                                  rows={2}
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSubmitComment(piece.id)}
                                disabled={!form?.commentText?.trim()}
                                className="flex items-center gap-2 whitespace-nowrap"
                              >
                                <Send className="w-3 h-3" />
                                Post
                              </Button>
                            </div>

                            {form?.timestampSeconds != null && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`timestamp-${piece.id}`}
                                  checked={form.includeTimestamp || false}
                                  onChange={(e) => handleUpdateCommentForm(piece.id, 'includeTimestamp', e.target.checked)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <label htmlFor={`timestamp-${piece.id}`} className="text-sm text-gray-700">
                                  Comment at specific moment
                                  {form.includeTimestamp && form.timestampSeconds != null && (
                                    <span className="text-blue-600 ml-2">
                                      ({formatTime(form.timestampSeconds)})
                                    </span>
                                  )}
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {(!lessonData?.videos || lessonData.videos.length === 0) && convertedAudioPieces.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-6xl mb-4">🎤</div>
            <h3 className="text-xl font-semibold mb-2">Empty Practice Session</h3>
            <p className="text-gray-600">This practice session doesn&apos;t contain any videos or recordings yet.</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Want to create your own freehand lessons?
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/freehand">
              <Button variant="primary" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Create Freehand Lesson
              </Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" className="flex items-center gap-2">
                🎤 Try Voice Trainer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
