'use client'

import { useApp } from '@/contexts/AppContext';
import { BookOpen, Clock, Lightbulb, Image } from 'lucide-react';
import MediaGallery from './MediaGallery';
import RecordingControls from './RecordingControls';

export default function ExerciseDisplay() {
  const { getCurrentExercise, getCurrentExercises, state } = useApp();

  const currentExercise = getCurrentExercise();
  const allExercises = getCurrentExercises();

  if (!currentExercise) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <p>No exercise selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary" />
        {currentExercise.name}
      </h3>
      
      <div className="space-y-6">
        {/* Media content section */}
        {currentExercise.media && currentExercise.media.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Visual Guide
            </h4>
            <MediaGallery mediaItems={currentExercise.media} />
          </div>
        )}

        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Instructions</h4>
          <p className="text-gray-600 leading-relaxed">
            {currentExercise.instructions || "No instructions available for this exercise. Please check with your instructor or try refreshing the page."}
          </p>
          {!currentExercise.instructions && (
            <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
              <p className="text-sm text-yellow-700 mb-2">
                <strong>Debug Info:</strong> Exercise "{currentExercise.name}" has empty or undefined instructions.
              </p>
              <div className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded mt-2 font-mono">
                <p><strong>isSharedSession:</strong> {state.isSharedSession ? 'true' : 'false'}</p>
                <p><strong>sharedExercises.length:</strong> {state.sharedExercises?.length || 0}</p>
                <p><strong>currentSetIndex:</strong> {state.currentSetIndex}</p>
                <p><strong>currentExerciseIndex:</strong> {state.currentExerciseIndex}</p>
                <p><strong>exerciseSets.length:</strong> {state.exerciseSets?.length || 0}</p>
                <p><strong>allExercises.length:</strong> {allExercises?.length || 0}</p>
                <p><strong>currentExercise.id:</strong> {currentExercise.id}</p>
                <p><strong>instructions type:</strong> {typeof currentExercise.instructions}</p>
                <p><strong>instructions length:</strong> {currentExercise.instructions?.length || 0}</p>
              </div>
            </div>
          )}
        </div>
        
        {currentExercise.duration && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{currentExercise.duration}</span>
          </div>
        )}
        
        {currentExercise.tips && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-blue-800 mb-1">Tip</h5>
                <p className="text-blue-700 text-sm">
                  {currentExercise.tips}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recording Controls - Only show if not shared session */}
        {!state.isSharedSession && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">Recording</h4>
            <RecordingControls />
          </div>
        )}
      </div>
    </div>
  );
}