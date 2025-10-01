'use client'

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Save, Share2, Video, Mic } from 'lucide-react';
import Link from 'next/link';
import VideoCarousel from '@/components/lesson/VideoCarousel';
import RecordingControls from '@/components/lesson/RecordingControls';
import AudioPlayer from '@/components/lesson/AudioPlayer';
import { FreehandLessonService, type FreehandLesson } from '@/services/freehandLessonService';
import { FreehandPracticeService } from '@/services/freehandPracticeService';
import AlertDialog from '@/components/ui/AlertDialog';

export default function FreehandPracticePage() {
  const params = useParams<{ lessonId: string }>();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const { user } = useAuth();

  const [lessonData, setLessonData] = useState<FreehandLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({ show: false, title: '', message: '', variant: 'info' });

  useEffect(() => {
    const fetchLesson = async () => {
      if (!params?.lessonId || typeof params.lessonId !== 'string') {
        setAlertDialog({
          show: true,
          title: 'Invalid Lesson',
          message: 'Lesson ID is invalid',
          variant: 'error',
        });
        setLoading(false);
        return;
      }

      try {
        const lesson = await FreehandLessonService.getFreehandLesson(params.lessonId);
        if (lesson) {
          setLessonData(lesson);
          dispatch({ type: 'SET_FREEHAND_MODE', payload: true });
          dispatch({ type: 'CLEAR_SESSION_PIECES' });
        } else {
          setAlertDialog({
            show: true,
            title: 'Lesson Not Found',
            message: 'The requested lesson could not be found',
            variant: 'error',
          });
        }
      } catch (error) {
        console.error('Error loading lesson:', error);
        setAlertDialog({
          show: true,
          title: 'Loading Failed',
          message: 'Failed to load lesson',
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();

    return () => {
      dispatch({ type: 'SET_FREEHAND_MODE', payload: false });
    };
  }, [params?.lessonId, dispatch]);

  const handleSaveAndShare = useCallback(async () => {
    if (!lessonData?.id) {
      setAlertDialog({
        show: true,
        title: 'Invalid Lesson',
        message: 'Lesson data is not available',
        variant: 'error',
      });
      return;
    }

    if (Object.keys(state.currentSessionPieces).length === 0) {
      setAlertDialog({
        show: true,
        title: 'No Recordings',
        message: 'Please record at least one audio clip before saving',
        variant: 'warning',
      });
      return;
    }

    setIsSaving(true);

    try {
      const createResult = await FreehandPracticeService.createPracticeSession(
        lessonData.id,
        user?.id || 'anonymous'
      );

      if (!createResult.success || !createResult.sessionId) {
        setAlertDialog({
          show: true,
          title: 'Save Failed',
          message: createResult.error || 'Failed to create practice session',
          variant: 'error',
        });
        setIsSaving(false);
        return;
      }

      const uploadResult = await FreehandPracticeService.savePracticeRecordings(
        createResult.sessionId,
        state.currentSessionPieces
      );

      if (!uploadResult.success) {
        setAlertDialog({
          show: true,
          title: 'Upload Failed',
          message: uploadResult.error || 'Failed to save recordings',
          variant: 'error',
        });
        setIsSaving(false);
        return;
      }

      dispatch({ type: 'SET_FREEHAND_PRACTICE_ID', payload: createResult.sessionId });

      setAlertDialog({
        show: true,
        title: 'Practice Session Saved',
        message: 'Your practice session has been saved successfully!',
        variant: 'success',
      });

      setIsSharing(true);
      try {
        const shareUrl = `${window.location.origin}/share/freehand/${createResult.sessionId}`;
        await navigator.clipboard.writeText(shareUrl);

        setAlertDialog({
          show: true,
          title: 'Link Copied',
          message: 'Share link copied to clipboard!',
          variant: 'success',
        });
      } catch (error) {
        console.error('Error copying link:', error);
      } finally {
        setIsSharing(false);
      }
    } catch (error) {
      console.error('Error saving practice session:', error);
      setAlertDialog({
        show: true,
        title: 'Save Failed',
        message: 'An unexpected error occurred',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [lessonData, state.currentSessionPieces, dispatch]);

  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const recordingKey = 'freehand_recording';
  const currentRecordings = state.currentSessionPieces[recordingKey] || [];

  const handlePlayStateChange = useCallback((pieceId: string, playing: boolean) => {
    if (playing) {
      setCurrentlyPlaying(pieceId);
    } else {
      if (currentlyPlaying === pieceId) {
        setCurrentlyPlaying(null);
      }
    }
  }, [currentlyPlaying]);

  const downloadPiece = useCallback((piece: any) => {
    try {
      const url = URL.createObjectURL(piece.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `practice_recording_${piece.id}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading recording:', error);
    }
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

  if (!lessonData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🎤</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Lesson Not Found</h1>
          <p className="text-gray-600 mb-6">
            The lesson you are trying to practice could not be found.
          </p>
          <Link href="/freehand">
            <Button variant="primary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Lessons
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/freehand">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Lesson
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAndShare}
            disabled={isSaving || isSharing || currentRecordings.length === 0}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              'Saving...'
            ) : isSharing ? (
              'Copying Link...'
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Save & Share
              </>
            )}
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {lessonData.title}
          </h1>
          {lessonData.description && (
            <p className="text-gray-600">{lessonData.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {lessonData.videos && lessonData.videos.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                Reference Videos
              </h2>
              <VideoCarousel videos={lessonData.videos} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mic className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-800">
                Your Practice Recordings
              </h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Record yourself practicing with the reference videos
            </p>

            <RecordingControls />

            {currentRecordings.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Recordings ({currentRecordings.length})
                </h3>
                {currentRecordings.map((piece, index) => (
                  <AudioPlayer
                    key={piece.id}
                    piece={piece}
                    index={index}
                    onDelete={() => {
                      dispatch({
                        type: 'REMOVE_AUDIO_PIECE',
                        payload: { exerciseKey: recordingKey, pieceId: piece.id }
                      });
                    }}
                    onDownload={downloadPiece}
                    onTitleUpdate={undefined}
                    isPlaying={currentlyPlaying === piece.id}
                    onPlayStateChange={handlePlayStateChange}
                    exerciseName="Practice Recording"
                    showDeleteButton={true}
                  />
                ))}
              </div>
            )}

            {currentRecordings.length === 0 && !state.isRecording && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  No recordings yet. Start recording to capture your practice session.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        isOpen={alertDialog.show}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
      />
    </div>
  );
}
