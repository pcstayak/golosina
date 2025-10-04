'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, BookOpen, Mic, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { PracticeService, Practice, PracticeComment } from '@/services/practiceService';
import { LessonService, Lesson } from '@/services/lessonService';
import VideoEmbed from '@/components/lesson/VideoEmbed';
import { formatTime } from '@/utils/audioAnalysis';
import { VideoEmbedService } from '@/services/videoEmbedService';
import AudioPlayer from '@/components/lesson/AudioPlayer';
import { AudioPiece } from '@/contexts/AppContext';

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const practiceId = params.practiceId as string;

  const [practice, setPractice] = useState<Practice | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [comments, setComments] = useState<PracticeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [allPractices, setAllPractices] = useState<Practice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Audio player state
  const [playingPieceId, setPlayingPieceId] = useState<string | null>(null);
  const [convertedAudioPieces, setConvertedAudioPieces] = useState<AudioPiece[]>([]);

  // Comment form state
  const [commentForms, setCommentForms] = useState<Record<string, {
    text: string;
    userName: string;
    timestampSeconds?: number;
    includeTimestamp: boolean;
  }>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  useEffect(() => {
    async function loadPractice() {
      try {
        setLoading(true);
        const practiceData = await PracticeService.getPractice(practiceId);

        if (!practiceData) {
          setError('Practice not found');
          return;
        }

        setPractice(practiceData);
        setIsOwner(PracticeService.isPracticeOwned(practiceId));

        const lessonData = await LessonService.getLesson(practiceData.lesson_id);
        if (lessonData) {
          setLesson(lessonData);
        }

        const commentsData = await PracticeService.getComments(practiceId);
        setComments(commentsData);

        const lessonPractices = await PracticeService.getPracticesForLesson(practiceData.lesson_id);
        setAllPractices(lessonPractices);
        const index = lessonPractices.findIndex(p => p.practice_id === practiceId);
        setCurrentIndex(index);
      } catch (err) {
        console.error('Error loading practice:', err);
        setError('Failed to load practice');
      } finally {
        setLoading(false);
      }
    }

    if (practiceId) {
      loadPractice();
    }
  }, [practiceId]);

  useEffect(() => {
    const convertRecordings = async () => {
      if (!practice || !lesson) {
        setConvertedAudioPieces([]);
        return;
      }

      const pieces: AudioPiece[] = [];

      for (const step of lesson.steps) {
        const stepId = step.id || `order_${step.step_order}`;
        const stepRecordings = practice.recordings[`step_${stepId}`]
          || practice.recordings[stepId]
          || practice.recordings[`step_${step.id}`]
          || practice.recordings[step.id || '']
          || practice.recordings['undefined'];

        if (stepRecordings?.files) {
          for (const file of stepRecordings.files) {
            try {
              const response = await fetch(file.url);
              const blob = await response.blob();

              pieces.push({
                id: file.timestamp,
                blob,
                timestamp: file.timestamp,
                duration: file.duration,
                exerciseId: 0,
                exerciseName: step.title,
                customTitle: file.name
              });
            } catch (error) {
              console.error('Error converting audio:', error);
            }
          }
        }
      }

      setConvertedAudioPieces(pieces);
    };

    convertRecordings();
  }, [practice, lesson]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePlayStateChange = useCallback((pieceId: string, playing: boolean) => {
    setPlayingPieceId(playing ? pieceId : null);
  }, []);

  const handleAddComment = useCallback((recordingTimestamp: string, timestampSeconds?: number) => {
    setCommentForms(prev => ({
      ...prev,
      [recordingTimestamp]: {
        text: prev[recordingTimestamp]?.text || '',
        userName: prev[recordingTimestamp]?.userName || '',
        timestampSeconds,
        includeTimestamp: timestampSeconds !== undefined
      }
    }));

    setTimeout(() => {
      const textarea = document.querySelector(`textarea[data-recording="${recordingTimestamp}"]`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  }, []);

  const handleUpdateCommentForm = useCallback((recordingTimestamp: string, field: string, value: any) => {
    setCommentForms(prev => ({
      ...prev,
      [recordingTimestamp]: {
        ...prev[recordingTimestamp],
        text: prev[recordingTimestamp]?.text || '',
        userName: prev[recordingTimestamp]?.userName || '',
        includeTimestamp: prev[recordingTimestamp]?.includeTimestamp || false,
        [field]: value
      }
    }));
  }, []);

  const handleSubmitComment = useCallback(async (recordingTimestamp: string) => {
    const form = commentForms[recordingTimestamp];
    if (!form || !form.text.trim() || !form.userName.trim()) return;

    setSubmittingComment(recordingTimestamp);

    try {
      const result = await PracticeService.addComment(
        practiceId,
        recordingTimestamp,
        form.userName,
        form.text,
        undefined,
        form.includeTimestamp ? form.timestampSeconds : undefined
      );

      if (result.success) {
        const updatedComments = await PracticeService.getComments(practiceId);
        setComments(updatedComments);

        setCommentForms(prev => ({
          ...prev,
          [recordingTimestamp]: {
            text: '',
            userName: form.userName,
            includeTimestamp: false
          }
        }));
      } else {
        console.error('Failed to add comment:', result.error);
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmittingComment(null);
    }
  }, [commentForms, practiceId]);

  const handlePreviousPractice = () => {
    if (currentIndex > 0) {
      const previousPractice = allPractices[currentIndex - 1];
      router.push(`/practices/${previousPractice.practice_id}`);
    }
  };

  const handleNextPractice = () => {
    if (currentIndex < allPractices.length - 1) {
      const nextPractice = allPractices[currentIndex + 1];
      router.push(`/practices/${nextPractice.practice_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading practice...</div>
      </div>
    );
  }

  if (error || !practice || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-800 text-xl mb-4">{error || 'Practice not found'}</div>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const recordingCount = Object.values(practice.recordings).reduce(
    (sum, set) => sum + set.files.length,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>

            {allPractices.length > 1 && currentIndex >= 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handlePreviousPractice}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 px-3">
                  {currentIndex + 1} / {allPractices.length}
                </span>
                <Button
                  variant="secondary"
                  onClick={handleNextPractice}
                  disabled={currentIndex === allPractices.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {lesson.title}
            </h1>
            {lesson.description && (
              <p className="text-gray-600 mb-4">{lesson.description}</p>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">Practiced On</div>
                  <div className="font-semibold text-gray-900">
                    {formatDate(practice.created_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Lesson Steps</div>
                  <div className="font-semibold text-gray-900">
                    {lesson.steps.length}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Mic className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm text-gray-600">Recordings</div>
                  <div className="font-semibold text-gray-900">
                    {recordingCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        {lesson.steps.map((step, stepIndex) => {
          // Try multiple key formats to find recordings
          const stepId = step.id || `order_${step.step_order}`;
          const stepRecordings = practice.recordings[`step_${stepId}`]
            || practice.recordings[stepId]
            || practice.recordings[`step_${step.id}`]
            || practice.recordings[step.id || '']
            || practice.recordings['undefined']; // Fallback for broken recordings

          // Debug logging
          console.log(`Step ${stepIndex} - Looking for:`, `step_${stepId}`, 'or', stepId);
          console.log(`Step ${stepIndex} - Found recordings:`, stepRecordings);

          if (stepIndex === 0) {
            console.log('All practice recordings:', practice.recordings);
          }

          const stepComments = comments.filter(c =>
            stepRecordings?.files.some(f => f.timestamp === c.recording_id)
          );

          return (
            <div key={step.id || stepIndex} className="mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Step Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {stepIndex + 1}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {step.title}
                    </h2>
                    {step.description && (
                      <p className="text-gray-600 mb-3">{step.description}</p>
                    )}
                    {step.tips && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <div className="text-sm font-semibold text-amber-900 mb-1">
                          Tips:
                        </div>
                        <p className="text-sm text-amber-800">{step.tips}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reference Media */}
                {step.media && step.media.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Reference Media
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {step.media.map((media, mediaIndex) => (
                        <div key={media.id || mediaIndex} className="space-y-2">
                          {media.media_type === 'video' && media.media_platform && media.embed_id && (
                            <VideoEmbed
                              embedUrl={VideoEmbedService.getEmbedUrl(
                                media.media_platform as any,
                                media.embed_id
                              )}
                              platform={media.media_platform as any}
                              title={media.caption}
                            />
                          )}
                          {(media.media_type === 'image' || media.media_type === 'gif') && (
                            <img
                              src={media.media_url}
                              alt={media.caption || `Media ${mediaIndex + 1}`}
                              className="w-full rounded-lg"
                            />
                          )}
                          {media.caption && (
                            <p className="text-sm text-gray-600 text-center">
                              {media.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practice Recordings */}
                {stepRecordings && stepRecordings.files.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-red-600" />
                      Practice Recordings ({stepRecordings.files.length})
                    </h3>

                    <div className="space-y-6">
                      {stepRecordings.files.map((file, fileIndex) => {
                        const piece = convertedAudioPieces.find(p => p.id === file.timestamp);
                        if (!piece) return null;

                        const recordingComments = comments.filter(
                          c => c.recording_id === file.timestamp
                        );

                        return (
                          <div key={file.timestamp} className="space-y-4">
                            <AudioPlayer
                              piece={piece}
                              index={fileIndex}
                              onDelete={() => {}}
                              onDownload={() => {
                                const a = document.createElement('a');
                                a.href = file.url;
                                a.download = `${file.name}.webm`;
                                a.click();
                              }}
                              onTitleUpdate={undefined}
                              isPlaying={playingPieceId === file.timestamp}
                              onPlayStateChange={(pieceId, playing) => {
                                if (playing) {
                                  setPlayingPieceId(pieceId);
                                } else if (playingPieceId === pieceId) {
                                  setPlayingPieceId(null);
                                }
                              }}
                              exerciseName={step.title}
                              showDeleteButton={false}
                              comments={recordingComments}
                              onAddComment={(timestampSeconds) => {
                                handleAddComment(file.timestamp, timestampSeconds);
                              }}
                            />

                            {/* Add Comment Form */}
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Add Comment
                              </h4>

                              <div className="space-y-3">
                                <input
                                  type="text"
                                  placeholder="Your name"
                                  value={commentForms[file.timestamp]?.userName || ''}
                                  onChange={(e) => handleUpdateCommentForm(file.timestamp, 'userName', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <textarea
                                  data-recording={file.timestamp}
                                  placeholder="Enter your comment..."
                                  value={commentForms[file.timestamp]?.text || ''}
                                  onChange={(e) => handleUpdateCommentForm(file.timestamp, 'text', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                                  rows={3}
                                />

                                {commentForms[file.timestamp]?.timestampSeconds !== undefined && (
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={commentForms[file.timestamp]?.includeTimestamp || false}
                                      onChange={(e) => handleUpdateCommentForm(file.timestamp, 'includeTimestamp', e.target.checked)}
                                      className="w-4 h-4"
                                    />
                                    <span>
                                      Include timestamp
                                      {commentForms[file.timestamp]?.includeTimestamp &&
                                        ` (${formatTime(commentForms[file.timestamp].timestampSeconds!)})`}
                                    </span>
                                  </label>
                                )}

                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleSubmitComment(file.timestamp)}
                                  disabled={!commentForms[file.timestamp]?.text?.trim() || !commentForms[file.timestamp]?.userName?.trim()}
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Post Comment
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No Recordings Message */}
                {(!stepRecordings || stepRecordings.files.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No recordings for this step
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
