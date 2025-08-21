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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={previousExercise}
          disabled={!canGoPrevious}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <div className="text-center">
          <div className="text-sm text-gray-500">Exercise</div>
          <div className="font-semibold text-gray-800">
            {state.currentExerciseIndex + 1} of {exercises.length}
          </div>
        </div>
        
        <Button
          variant="secondary"
          onClick={nextExercise}
          disabled={!canGoNext}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary rounded-full h-2 transition-all duration-300"
            style={{ 
              width: `${((state.currentExerciseIndex + 1) / exercises.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}