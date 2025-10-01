'use client'

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Settings, LogOut, Home, Video, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import SettingsModal from '@/components/modals/SettingsModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FreehandLessonCard from '@/components/student/FreehandLessonCard';
import SharedLessonCard from '@/components/student/SharedLessonCard';
import { FreehandLessonService, FreehandLesson } from '@/services/freehandLessonService';
import { SharedLessonService, SharedLessonListItem } from '@/services/sharedLessonService';
import { useNotification } from '@/hooks/useNotification';

export default function LandingPage() {
  const { state, dispatch } = useApp();
  const { signOut, profile, user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useNotification();
  const [showSettings, setShowSettings] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [freehandLessons, setFreehandLessons] = useState<FreehandLesson[]>([]);
  const [sharedLessons, setSharedLessons] = useState<SharedLessonListItem[]>([]);
  const [loadingFreehand, setLoadingFreehand] = useState(true);
  const [loadingShared, setLoadingShared] = useState(true);
  const [showFreehandSection, setShowFreehandSection] = useState(true);
  const [showSharedSection, setShowSharedSection] = useState(true);

  const selectExerciseSet = (setIndex: number) => {
    dispatch({ type: 'SET_CURRENT_SET_INDEX', payload: setIndex });
    dispatch({ type: 'SET_CURRENT_EXERCISE_INDEX', payload: 0 });
    startNewSession();
  };

  const startNewSession = () => {
    dispatch({ type: 'SET_SESSION_ACTIVE', payload: true });
    dispatch({ type: 'CLEAR_SESSION_PIECES' });
    dispatch({ type: 'SET_SHARED_SESSION', payload: { isShared: false } });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'lesson' });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await signOut();
      if (!result.success) {
        console.error('Logout failed:', result.error);
        // You could add toast notification here if available
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleReturnToDashboard = () => {
    if (profile?.role === 'admin') {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'admin-dashboard' });
    } else if (profile?.role === 'teacher') {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'teacher-dashboard' });
    }
  };

  const getSetRecordingsCount = (setId: number): number => {
    let count = 0;
    Object.keys(state.audioPieces).forEach(exerciseKey => {
      if (exerciseKey.startsWith(setId + '_')) {
        count += state.audioPieces[exerciseKey]?.length || 0;
      }
    });
    return count;
  };

  useEffect(() => {
    const loadFreehandLessons = async () => {
      if (!user?.id) {
        setLoadingFreehand(false);
        return;
      }

      try {
        const lessons = await FreehandLessonService.getFreehandLessonsByCreator(user.id);
        setFreehandLessons(lessons);
      } catch (error) {
        console.error('Error loading freehand lessons:', error);
      } finally {
        setLoadingFreehand(false);
      }
    };

    loadFreehandLessons();
  }, [user?.id]);

  useEffect(() => {
    const loadSharedLessons = async () => {
      try {
        const lessons = await SharedLessonService.getSharedLessonsByOwner();
        setSharedLessons(lessons);
      } catch (error) {
        console.error('Error loading shared lessons:', error);
      } finally {
        setLoadingShared(false);
      }
    };

    loadSharedLessons();
  }, []);

  const handleDeleteFreehandLesson = async (sessionId: string) => {
    const result = await FreehandLessonService.deleteFreehandLesson(sessionId);

    if (result.success) {
      setFreehandLessons(prev => prev.filter(lesson => lesson.session_id !== sessionId));
      showSuccess('Lesson deleted successfully');
    } else {
      showError(result.error || 'Failed to delete lesson');
    }
  };


  const handleCopyShareLink = (sessionId: string, type: 'regular' | 'freehand') => {
    const baseUrl = window.location.origin;
    const url = type === 'freehand'
      ? `${baseUrl}/freehand?id=${sessionId}`
      : `${baseUrl}/shared?id=${sessionId}`;

    navigator.clipboard.writeText(url);
    showSuccess('Link copied to clipboard');
  };

  const handleViewSharedLesson = (sessionId: string, type: 'regular' | 'freehand') => {
    if (type === 'freehand') {
      router.push(`/freehand?id=${sessionId}`);
    } else {
      router.push(`/shared?id=${sessionId}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-between mb-8">
          <div></div>
          <h1 className="text-5xl font-bold text-white">
            🎵 Golosina
          </h1>
          <div className="flex items-center gap-2">
            {(profile?.role === 'admin' || profile?.role === 'teacher') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReturnToDashboard}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>
        <p className="text-xl text-white/80 mb-8">
          Your AI-powered voice training companion
        </p>
      </div>

      {/* Freehand Lesson Card */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Freehand Lesson</h2>
                  <p className="text-white/80 text-sm">Create custom practice sessions</p>
                </div>
              </div>
            </div>
            <p className="text-white/90 mb-4">
              Add YouTube videos and record yourself practicing to share with your teacher. Perfect for getting feedback on specific techniques or songs.
            </p>
            <Link href="/freehand">
              <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                <Video className="w-4 h-4" />
                Create Freehand Lesson
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* My Freehand Lessons Section */}
      {loadingFreehand ? (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">My Freehand Lessons</h2>
          <div className="text-center text-white/60 py-8">
            Loading your lessons...
          </div>
        </div>
      ) : freehandLessons.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">My Freehand Lessons</h2>
            <button
              onClick={() => setShowFreehandSection(!showFreehandSection)}
              className="text-white/80 hover:text-white transition-colors"
            >
              {showFreehandSection ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
          {showFreehandSection && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {freehandLessons.map((lesson) => (
                <FreehandLessonCard
                  key={lesson.session_id}
                  lesson={lesson}
                  onDelete={handleDeleteFreehandLesson}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* My Shared Lessons Section */}
      {loadingShared ? (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">My Shared Lessons</h2>
          <div className="text-center text-white/60 py-8">
            Loading your shared lessons...
          </div>
        </div>
      ) : sharedLessons.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">My Shared Lessons</h2>
            <button
              onClick={() => setShowSharedSection(!showSharedSection)}
              className="text-white/80 hover:text-white transition-colors"
            >
              {showSharedSection ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
          {showSharedSection && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedLessons.map((lesson) => (
                <SharedLessonCard
                  key={lesson.session_id}
                  lesson={lesson}
                  onCopyLink={handleCopyShareLink}
                  onViewLesson={handleViewSharedLesson}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Exercise Sets Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.exerciseSets.map((set, index) => {
          const recordingsCount = getSetRecordingsCount(set.id);
          
          return (
            <div key={set.id} className="set-card">
              <div 
                className="set-header"
                style={{ background: set.color }}
              >
                <h3 className="text-xl font-semibold mb-2">{set.name}</h3>
                <div className="flex justify-between text-sm opacity-90">
                  <span>{set.exercises.length} exercises</span>
                  <span>{recordingsCount} recordings</span>
                </div>
              </div>
              <div className="set-content">
                <p className="text-gray-600 mb-4">{set.description}</p>
                <Button
                  onClick={() => selectExerciseSet(index)}
                  className="w-full"
                  variant="primary"
                >
                  Start Practice
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Welcome Message */}
      {Object.keys(state.audioPieces).length === 0 && (
        <div className="mt-12 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Welcome to Your Voice Training Journey! 🎤
            </h2>
            <p className="text-white/80 mb-6">
              Choose an exercise set above to begin your vocal training. Each session will help you 
              improve your breathing, vocal technique, and pitch accuracy.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl mb-2">🫁</div>
                <h3 className="font-medium text-white">Breathing</h3>
                <p className="text-sm text-white/70">Master diaphragmatic breathing</p>
              </div>
              <div>
                <div className="text-3xl mb-2">🎵</div>
                <h3 className="font-medium text-white">Warm-ups</h3>
                <p className="text-sm text-white/70">Prepare your voice safely</p>
              </div>
              <div>
                <div className="text-3xl mb-2">🎶</div>
                <h3 className="font-medium text-white">Pitch Training</h3>
                <p className="text-sm text-white/70">Develop perfect pitch</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}