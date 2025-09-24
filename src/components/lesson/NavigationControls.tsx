'use client'

import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function NavigationControls() {
  const { state, dispatch, getCurrentExercises } = useApp();
  
  const exercises = getCurrentExercises();
  const canGoPrevious = state.currentExerciseIndex > 0;
  const canGoNext = state.currentExerciseIndex < exercises.length - 1;

  const previousExercise = () => {
    if (canGoPrevious) {
      dispatch({ 
        type: 'SET_CURRENT_EXERCISE_INDEX', 
        payload: state.currentExerciseIndex - 1 
      });
    }
  };

  const nextExercise = () => {
    if (canGoNext) {
      dispatch({ 
        type: 'SET_CURRENT_EXERCISE_INDEX', 
        payload: state.currentExerciseIndex + 1 
      });
    }
  };

  if (exercises.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={previousExercise}
        disabled={!canGoPrevious}
        className="flex items-center gap-1 px-2 py-1"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Prev</span>
      </Button>

      <div className="text-center min-w-0">
        <div className="text-sm font-semibold text-gray-800">
          {state.currentExerciseIndex + 1} of {exercises.length}
        </div>
        {/* Compact Progress Bar */}
        <div className="mt-1 w-16 mx-auto">
          <div className="bg-gray-200 rounded-full h-1">
            <div
              className="bg-primary rounded-full h-1 transition-all duration-300"
              style={{
                width: `${((state.currentExerciseIndex + 1) / exercises.length) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={nextExercise}
        disabled={!canGoNext}
        className="flex items-center gap-1 px-2 py-1"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}