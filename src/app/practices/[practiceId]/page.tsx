'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Panel, PanelHeader, PanelContent } from '@/components/ui/Panel';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Calendar, BookOpen, Mic, Send, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { PracticeService, Practice, PracticeComment } from '@/services/practiceService';
import { LessonService, Lesson } from '@/services/lessonService';
import VideoEmbed from '@/components/lesson/VideoEmbed';
import { formatTime } from '@/utils/audioAnalysis';
import { VideoEmbedService } from '@/services/videoEmbedService';
import AudioPlayer from '@/components/lesson/AudioPlayer';
import CommentThread from '@/components/lesson/CommentThread';
import { AudioPiece } from '@/contexts/AppContext';
import MediaPreview from '@/components/lessons/MediaPreview';
import { TeacherStudentService } from '@/services/teacherStudentService';
import { NotificationService } from '@/services/notificationService';

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
  const [isTeacher, setIsTeacher] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [markingAsReviewed, setMarkingAsReviewed] = useState(false);
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

        const teacherRole = profile?.role === 'teacher';
        setIsTeacher(teacherRole);

        if (teacherRole && user?.id && practiceData.created_by !== user.id) {
          const hasRelationship = await TeacherStudentService.canAssignLesson(
            user.id,
            practiceData.created_by
          );
          setCanReview(hasRelationship);
        }

        // Fetch lesson if lesson_id exists (not archived)
        if (practiceData.lesson_id) {
          const lessonData = await LessonService.getLesson(practiceData.lesson_id);
          if (lessonData) {
            setLesson(lessonData);
          }

          const lessonPractices = await PracticeService.getPracticesForLesson(practiceData.lesson_id);
          setAllPractices(lessonPractices);
          const index = lessonPractices.findIndex(p => p.practice_id === practiceId);
          setCurrentIndex(index);
        }

        const commentsData = await PracticeService.getComments(practiceId);
        setComments(commentsData);

        // Mark practice notifications as read when the user views the practice
        if (user?.id) {
          await NotificationService.markPracticeNotificationsAsRead(user.id, practiceId);

          // Only update last_viewed_at if this is not the practice owner viewing their own work
          // This tracks when teachers/reviewers last viewed the practice
          if (user.id !== practiceData.created_by) {
            await NotificationService.updatePracticeLastViewed(practiceId, user.id);
          }
        }
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
  }, [practiceId, profile?.role, user?.id]);

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

  const handleMarkAsReviewed = async () => {
    if (!user?.id || !practice) return;

    try {
      setMarkingAsReviewed(true);
      const result = await PracticeService.markPracticeAsReviewed(practiceId, user.id);

      if (result.success) {
        setPractice(prev => prev ? {
          ...prev,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        } : null);
      } else {
        alert('Failed to mark as reviewed: ' + result.error);
      }
    } catch (error) {
      console.error('Error marking as reviewed:', error);
      alert('Failed to mark as reviewed');
    } finally {
      setMarkingAsReviewed(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading practice...</div>
      </div>
    );
  }

  if (error || !practice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div style={{ color: 'var(--text)', fontSize: '16px', marginBottom: '16px' }}>{error || 'Practice not found'}</div>
          <Button variant="secondary" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Handle archived practice (lesson was deleted)
  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div style={{ color: 'var(--text)', fontSize: '16px', marginBottom: '16px' }}>
            This practice session is archived
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '16px' }}>
            The original lesson has been deleted, but your practice recordings are preserved.
          </div>
          <Button variant="secondary" onClick={() => router.push('/')}>
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
    <div className="min-h-screen">
      <div className="max-w-custom mx-auto px-4 py-6">
        <Panel>
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--panel)', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <PanelHeader>
              <div>
                <h1 className="text-lg font-extrabold text-text m-0">
                  {lesson.title}{!practice.lesson_id && ' (archived)'}
                </h1>
                {lesson.description && (
                  <div className="text-[12.5px] text-muted mt-1">{lesson.description}</div>
                )}
                <div className="flex items-center gap-3 flex-wrap mt-2">
                  <div className="flex items-center gap-2" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <span>{formatDate(practice.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <span>{lesson.steps.length} steps</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    <Mic className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <span>{recordingCount} recordings</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push('/')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                {canReview && !practice.reviewed_at && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleMarkAsReviewed}
                    disabled={markingAsReviewed}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {markingAsReviewed ? 'Marking...' : 'Mark as Reviewed'}
                  </Button>
                )}
                {practice.reviewed_at && (
                  <Badge variant="reviewed">
                    Reviewed
                  </Badge>
                )}
                {allPractices.length > 1 && currentIndex >= 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handlePreviousPractice}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', padding: '0 12px' }}>
                      {currentIndex + 1} / {allPractices.length}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleNextPractice}
                      disabled={currentIndex === allPractices.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </PanelHeader>
          </div>

          <PanelContent>
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
                <div key={step.id || stepIndex} style={{ marginBottom: '24px' }}>
                  <Card>
                    <CardBody>
                      {/* Step Header */}
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="flex-shrink-0 rounded-full flex items-center justify-center font-black text-xs"
                          style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-2))',
                            color: 'var(--primary-contrast)'
                          }}
                        >
                          {stepIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h2 className="font-black mb-2" style={{ fontSize: '18px', color: 'var(--text)' }}>
                            {step.title}
                          </h2>
                          {step.description && (
                            <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '12px' }}>
                              {step.description}
                            </p>
                          )}
                          {step.tips && step.tips.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {step.tips.map((tip, index) => (
                                <span
                                  key={index}
                                  className="border border-border bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)] text-muted font-extrabold text-xs px-2.5 py-1.5 rounded-full"
                                >
                                  {tip}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reference Media */}
                      {step.media && step.media.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-black mb-3" style={{ fontSize: '14px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Reference Media
                          </h3>
                          <div className="space-y-4">
                            {step.media.map((media, mediaIndex) => (
                              <div key={media.id || mediaIndex} className="space-y-2">
                                {(media.media_type === 'video' || media.media_type === 'audio') ? (
                                  <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                                    <MediaPreview
                                      mediaUrl={media.media_url}
                                      mediaType={media.media_type}
                                      mediaPlatform={media.media_platform}
                                      embedId={media.embed_id}
                                      comments={[]}
                                      onAddComment={() => {}}
                                      onDeleteComment={() => {}}
                                      isEditable={false}
                                      lyrics={media.lyrics}
                                      mediaId={media.id}
                                      userId={user?.id}
                                      isTeacher={profile?.role === 'teacher'}
                                      assignmentId={practice.assignment_id}
                                      studentId={practice.created_by}
                                    />
                                  </div>
                                ) : (
                                  <img
                                    src={media.media_url}
                                    alt={media.caption || `Media ${mediaIndex + 1}`}
                                    className="w-full rounded-lg"
                                    style={{ maxWidth: '700px', margin: '0 auto', display: 'block' }}
                                  />
                                )}
                                {media.caption && (media.media_type === 'image' || media.media_type === 'gif') && (
                                  <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
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
                        <div className="text-center py-8" style={{ color: 'var(--muted)', fontSize: '13px' }}>
                          No recordings for this step
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              );
            })}
          </PanelContent>
        </Panel>
      </div>
    </div>
  );
}
