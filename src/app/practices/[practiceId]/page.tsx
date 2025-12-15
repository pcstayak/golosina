'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, BookOpen, Mic, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { PracticeService, Practice, PracticeComment } from '@/services/practiceService';
import { LessonService, Lesson } from '@/services/lessonService';
import VideoEmbed from '@/components/lesson/VideoEmbed';
import { formatTime } from '@/utils/audioAnalysis';
import { VideoEmbedService } from '@/services/videoEmbedService';
import AudioPlayer from '@/components/lesson/AudioPlayer';
import CommentThread from '@/components/lesson/CommentThread';
import { AudioPiece } from '@/contexts/AppContext';

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
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
    timestampSeconds?: number;
    includeTimestamp: boolean;
  }>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  // Selected comment thread state - tracks which comment threads are visible for each recording
  const [selectedCommentThreads, setSelectedCommentThreads] = useState<Record<string, string[] | null>>({});

  // Track which comment UIs are visible (either from marker click or empty click)
  const [visibleCommentUIs, setVisibleCommentUIs] = useState<Record<string, boolean>>({});

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
      const allTimestamps = new Set<string>();

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
              allTimestamps.add(file.timestamp);

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

      console.log('Total recordings:', pieces.length);
      console.log('Unique timestamps:', allTimestamps.size);
      console.log('Timestamps:', Array.from(allTimestamps));

      if (pieces.length !== allTimestamps.size) {
        console.error('WARNING: Some recordings share the same timestamp!');
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

  const handleAddComment = useCallback((recordingId: string, timestampSeconds?: number) => {
    // Update form state
    setCommentForms(prev => ({
      ...prev,
      [recordingId]: {
        text: prev[recordingId]?.text || '',
        timestampSeconds,
        includeTimestamp: timestampSeconds !== undefined
      }
    }));

    // Clear any selected comment thread (we're creating a new comment, not viewing existing ones)
    setSelectedCommentThreads(prev => ({
      ...prev,
      [recordingId]: null
    }));

    // Show the comment UI
    setVisibleCommentUIs(prev => ({
      ...prev,
      [recordingId]: true
    }));

    setTimeout(() => {
      const input = document.querySelector(`input[data-recording="${recordingId}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }, []);

  const handleUpdateCommentForm = useCallback((recordingId: string, field: string, value: any) => {
    setCommentForms(prev => ({
      ...prev,
      [recordingId]: {
        ...prev[recordingId],
        text: prev[recordingId]?.text || '',
        includeTimestamp: prev[recordingId]?.includeTimestamp || false,
        [field]: value
      }
    }));
  }, []);

  const handleSubmitComment = useCallback(async (recordingId: string) => {
    const form = commentForms[recordingId];
    if (!form || !form.text.trim() || !practice) return;

    // Get current user's display name
    const currentUserName = profile?.display_name || user?.email?.split('@')[0] || 'Anonymous';

    // Prevent duplicate submissions
    if (submittingComment === recordingId) {
      console.log('Already submitting comment for this recording, skipping');
      return;
    }

    setSubmittingComment(recordingId);

    try {
      // Find the recording duration for this recordingId
      const piece = convertedAudioPieces.find(p => recordingId.endsWith(p.id));
      const recordingDuration = piece?.duration || 0;

      // If no timestamp is explicitly set (user didn't click on waveform),
      // set the timestamp to the end of the recording
      const timestampToUse = form.includeTimestamp
        ? form.timestampSeconds
        : recordingDuration;

      const result = await PracticeService.addComment(
        practiceId,
        recordingId,
        currentUserName,
        form.text,
        user?.id,
        timestampToUse,
        undefined
      );

      if (result.success) {
        const updatedComments = await PracticeService.getComments(practiceId);
        setComments(updatedComments);

        // Add the new comment ID to the selected thread so it appears immediately
        if (result.commentId) {
          setSelectedCommentThreads(prev => {
            const currentSelection = prev[recordingId];
            if (currentSelection && Array.isArray(currentSelection)) {
              // Add to existing selection if not already there
              if (!currentSelection.includes(result.commentId!)) {
                return {
                  ...prev,
                  [recordingId]: [...currentSelection, result.commentId!]
                };
              }
            } else if (currentSelection === null) {
              // If viewing just the form (empty spot clicked), show the new comment
              return {
                ...prev,
                [recordingId]: [result.commentId!]
              };
            }
            return prev;
          });
        }

        setCommentForms(prev => ({
          ...prev,
          [recordingId]: {
            text: '',
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
  }, [commentForms, practiceId, submittingComment, convertedAudioPieces, practice, profile, user]);

  const handleReply = useCallback(async (recordingId: string, parentCommentId: string, commentText: string) => {
    if (!practice) return;

    // Get current user's display name
    const currentUserName = profile?.display_name || user?.email?.split('@')[0] || 'Anonymous';

    try {
      const result = await PracticeService.addComment(
        practiceId,
        recordingId,
        currentUserName,
        commentText,
        user?.id,
        undefined,
        parentCommentId
      );

      if (result.success) {
        const updatedComments = await PracticeService.getComments(practiceId);
        setComments(updatedComments);
      } else {
        console.error('Failed to add reply:', result.error);
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
      throw err;
    }
  }, [practiceId, practice, profile, user]);

  const handleCommentMarkerClick = useCallback((recordingId: string, commentIds: string[]) => {
    setSelectedCommentThreads(prev => {
      // If the same set of comment IDs is already selected, deselect them (hide UI)
      const currentIds = prev[recordingId];
      const isSameSelection = currentIds &&
        currentIds.length === commentIds.length &&
        currentIds.every(id => commentIds.includes(id));

      if (isSameSelection) {
        // Hide the comment UI when deselecting
        setVisibleCommentUIs(prevVisible => ({
          ...prevVisible,
          [recordingId]: false
        }));
        return {
          ...prev,
          [recordingId]: null
        };
      } else {
        // Get the timestamp from the first comment in the cluster
        // All comments in a cluster should have the same timestamp since they're clustered by proximity
        const firstComment = comments.find(c => commentIds.includes(c.id));
        const clusterTimestamp = firstComment?.timestamp_seconds;

        // Set the comment form timestamp to match the cluster's timestamp
        setCommentForms(prevForms => ({
          ...prevForms,
          [recordingId]: {
            text: prevForms[recordingId]?.text || '',
            timestampSeconds: clusterTimestamp,
            includeTimestamp: clusterTimestamp !== undefined
          }
        }));

        // Show the comment UI when selecting
        setVisibleCommentUIs(prevVisible => ({
          ...prevVisible,
          [recordingId]: true
        }));
        return {
          ...prev,
          [recordingId]: commentIds
        };
      }
    });
  }, [comments]);

  const handleCloseCommentThread = useCallback((recordingId: string) => {
    setSelectedCommentThreads(prev => ({
      ...prev,
      [recordingId]: null
    }));
    setVisibleCommentUIs(prev => ({
      ...prev,
      [recordingId]: false
    }));
  }, []);

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

          const stepComments = comments.filter(c =>
            stepRecordings?.files.some(f => `${stepId}_${f.timestamp}` === c.recording_id)
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
                    <div className="space-y-6">
                      {stepRecordings.files.map((file, fileIndex) => {
                        const piece = convertedAudioPieces.find(p => p.id === file.timestamp);
                        if (!piece) return null;

                        const recordingId = `${stepId}_${file.timestamp}`;
                        const recordingComments = comments.filter(
                          c => c.recording_id === recordingId
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
                                handleAddComment(recordingId, timestampSeconds);
                              }}
                              onCommentMarkerClick={(commentIds) => {
                                handleCommentMarkerClick(recordingId, commentIds);
                              }}
                            />

                            {/* Integrated Comment Thread - shown when UI is visible */}
                            {visibleCommentUIs[recordingId] && (
                              <div className="mt-4">
                                <CommentThread
                                  comments={recordingComments}
                                  onReply={(parentCommentId, commentText) =>
                                    handleReply(recordingId, parentCommentId, commentText)
                                  }
                                  currentUserName={profile?.display_name || user?.email?.split('@')[0] || 'Anonymous'}
                                  selectedCommentId={selectedCommentThreads[recordingId]}
                                  onClose={() => handleCloseCommentThread(recordingId)}
                                  recordingId={recordingId}
                                  recordingDuration={piece?.duration || 0}
                                  commentFormState={commentForms[recordingId]}
                                  onUpdateForm={(field, value) => handleUpdateCommentForm(recordingId, field, value)}
                                  onSubmitComment={() => handleSubmitComment(recordingId)}
                                  showForm={true}
                                />
                              </div>
                            )}
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
