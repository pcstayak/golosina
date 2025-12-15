'use client'

import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import RecordingControls from '@/components/lesson/RecordingControls';
import ExerciseDisplay from '@/components/lesson/ExerciseDisplay';
import AudioPiecesDisplay from '@/components/lesson/AudioPiecesDisplay';
import NavigationControls from '@/components/lesson/NavigationControls';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function LessonPage() {
  const { state, dispatch } = useApp();
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const handleBackToLanding = () => {
    if (Object.keys(state.currentPracticePieces).some(key =>
      state.currentPracticePieces[key]?.length > 0
    )) {
      setShowAbandonConfirm(true);
    } else {
      endSession();
    }
  };

  const confirmAbandonSession = () => {
    dispatch({ type: 'CLEAR_PRACTICE_PIECES' });
    endSession();
  };

  const endSession = () => {
    dispatch({ type: 'SET_SESSION_ACTIVE', payload: false });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'landing' });
    dispatch({ type: 'CLEAR_PRACTICE_PIECES' });
  };

  const showRecap = () => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'recap' });
  };

  // Deprecated: This page is for the old exercise set system
  const currentSet = null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        {/* Top row - Back button (left) | Lesson title (center) | View Recap (right) */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBackToLanding}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Stop the lesson
          </Button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">
              Practice Session
            </h2>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={showRecap}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            View Recap
          </Button>
        </div>

        {/* Bottom row - Exercise navigation controls centered */}
        <div className="flex justify-center">
          <NavigationControls />
        </div>
      </div>

      <div className="space-y-6">
        {/* Exercise Info with integrated Recording Controls */}
        <ExerciseDisplay />

        {/* Full-width Audio Pieces */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recordings</h3>
          <AudioPiecesDisplay />
        </div>
      </div>

      {/* Abandon Session Confirmation */}
      <ConfirmDialog
        isOpen={showAbandonConfirm}
        onClose={() => setShowAbandonConfirm(false)}
        onConfirm={confirmAbandonSession}
        title="Abandon Session"
        message="You have unsaved recordings in this session. Are you sure you want to abandon this lesson? All current session recordings will be lost."
        confirmText="Abandon Session"
        cancelText="Stay in Session"
        variant="warning"
        confirmButtonVariant="danger"
      />
    </div>
  );
}