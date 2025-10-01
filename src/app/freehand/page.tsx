'use client'

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Save, Video, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VideoInputForm from '@/components/lesson/VideoInputForm';
import VideoList from '@/components/lesson/VideoList';
import VideoCarousel from '@/components/lesson/VideoCarousel';
import { FreehandLessonService } from '@/services/freehandLessonService';
import AlertDialog from '@/components/ui/AlertDialog';

export default function FreehandLessonPage() {
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({ show: false, title: '', message: '', variant: 'info' });
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);

  useEffect(() => {
    dispatch({ type: 'SET_FREEHAND_MODE', payload: true });
    dispatch({ type: 'CLEAR_SESSION_PIECES' });

    return () => {
      dispatch({ type: 'SET_FREEHAND_MODE', payload: false });
    };
  }, [dispatch]);

  const handleAddVideo = useCallback((videoData: {
    video_url: string;
    video_platform: 'youtube' | 'vimeo' | 'audio' | 'other';
    embed_id: string;
    description?: string;
  }) => {
    const newVideo = {
      ...videoData,
      display_order: state.freehandVideos.length,
    };
    dispatch({ type: 'ADD_FREEHAND_VIDEO', payload: newVideo });
  }, [dispatch, state.freehandVideos.length]);

  const handleRemoveVideo = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FREEHAND_VIDEO', payload: index });
  }, [dispatch]);

  const handleReorderVideo = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_FREEHAND_VIDEO', payload: { fromIndex, toIndex } });
  }, [dispatch]);

  const handleUpdateVideo = useCallback((index: number, updates: any) => {
    const updatedVideo = {
      ...state.freehandVideos[index],
      ...updates,
    };
    dispatch({ type: 'UPDATE_FREEHAND_VIDEO', payload: { index, video: updatedVideo } });
  }, [dispatch, state.freehandVideos]);

  const handleSave = useCallback(async () => {
    if (!state.freehandTitle.trim()) {
      setAlertDialog({
        show: true,
        title: 'Missing Title',
        message: 'Please enter a title for your lesson template',
        variant: 'warning',
      });
      return;
    }

    if (state.freehandVideos.length === 0) {
      setAlertDialog({
        show: true,
        title: 'No Videos',
        message: 'Please add at least one video to your lesson',
        variant: 'warning',
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await FreehandLessonService.createFreehandLesson({
        title: state.freehandTitle,
        description: state.freehandDescription,
        createdBy: user?.id || 'anonymous',
        videos: state.freehandVideos.map(v => ({
          video_url: v.video_url,
          video_platform: v.video_platform,
          embed_id: v.embed_id,
          description: v.description,
        })),
      });

      if (result.success && result.sessionId) {
        dispatch({ type: 'SET_FREEHAND_LESSON_ID', payload: result.sessionId });
        setSavedLessonId(result.sessionId);

        setAlertDialog({
          show: true,
          title: 'Lesson Template Saved',
          message: 'Your freehand lesson template has been saved successfully!',
          variant: 'success',
        });
      } else {
        setAlertDialog({
          show: true,
          title: 'Save Failed',
          message: result.error || 'Failed to save lesson',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      setAlertDialog({
        show: true,
        title: 'Save Failed',
        message: 'An unexpected error occurred',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [state.freehandTitle, state.freehandDescription, state.freehandVideos, dispatch]);

  const handleStartPractice = useCallback(() => {
    if (!savedLessonId && !state.currentFreehandLessonId) {
      setAlertDialog({
        show: true,
        title: 'Save Lesson First',
        message: 'Please save your lesson template before starting practice',
        variant: 'warning',
      });
      return;
    }

    const lessonId = savedLessonId || state.currentFreehandLessonId;
    router.push(`/freehand/practice/${lessonId}`);
  }, [savedLessonId, state.currentFreehandLessonId, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Lesson'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Create Freehand Lesson
          </h1>
          <p className="text-gray-600">
            Create a lesson template with reference videos. After saving, you can practice with recordings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Lesson Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="lesson-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title *
                  </label>
                  <input
                    id="lesson-title"
                    type="text"
                    value={state.freehandTitle}
                    onChange={(e) => dispatch({ type: 'SET_FREEHAND_TITLE', payload: e.target.value })}
                    placeholder="e.g., Practicing High Notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="lesson-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="lesson-description"
                    value={state.freehandDescription}
                    onChange={(e) => dispatch({ type: 'SET_FREEHAND_DESCRIPTION', payload: e.target.value })}
                    placeholder="What are you working on? What feedback do you need?"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Video className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Reference Videos
                </h2>
              </div>

              <VideoInputForm
                onAddVideo={handleAddVideo}
                currentVideoCount={state.freehandVideos.length}
                maxVideos={5}
              />

              {state.freehandVideos.length > 0 && (
                <div className="mt-6">
                  <VideoList
                    videos={state.freehandVideos}
                    onRemove={handleRemoveVideo}
                    onReorder={handleReorderVideo}
                    onUpdate={handleUpdateVideo}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {state.freehandVideos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Video Preview
                </h2>
                <VideoCarousel videos={state.freehandVideos} />
              </div>
            )}

            {savedLessonId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Lesson Saved Successfully!
                </h2>
                <p className="text-gray-700 mb-4">
                  Your lesson template is ready. Now you can start practicing with recordings.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleStartPractice}
                    className="flex items-center justify-center gap-2"
                  >
                    Start Practice Session
                  </Button>
                  <Link href="/">
                    <Button
                      variant="secondary"
                      size="md"
                      className="flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Lessons
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {!state.freehandTitle && !state.freehandVideos.length && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to create a freehand lesson:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Give your lesson template a descriptive title</li>
                  <li>Add reference videos (YouTube or Vimeo) to show what you want to practice</li>
                  <li>Save your lesson template</li>
                  <li>Start a practice session to record yourself along with the videos</li>
                  <li>Share your practice session with your teacher for feedback</li>
                </ol>
              </div>
            </div>
          </div>
        )}
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
