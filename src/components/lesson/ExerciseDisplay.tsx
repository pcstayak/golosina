'use client'

import { useApp } from '@/contexts/AppContext';
import { BookOpen, Clock, Lightbulb } from 'lucide-react';

export default function ExerciseDisplay() {
  const { getCurrentExercise } = useApp();
  
  const currentExercise = getCurrentExercise();

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
      
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Instructions</h4>
          <p className="text-gray-600 leading-relaxed">
            {currentExercise.instructions}
          </p>
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
      </div>
    </div>
  );
}