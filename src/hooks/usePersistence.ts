'use client'

import { useApp, ExerciseSet, Exercise } from '@/contexts/AppContext';
import { useCallback } from 'react';

// Validation function to ensure exercise sets have proper structure
const validateExerciseSets = (exerciseSets: any): ExerciseSet[] | null => {
  if (!Array.isArray(exerciseSets)) {
    console.error('Exercise sets must be an array');
    return null;
  }

  try {
    const validatedSets = exerciseSets.map((set: any) => {
      // Validate set structure
      if (!set || typeof set !== 'object') {
        throw new Error('Invalid exercise set object');
      }

      if (!set.id || !set.name || !set.description || !set.color) {
        throw new Error('Exercise set missing required properties');
      }

      if (!Array.isArray(set.exercises)) {
        throw new Error('Exercise set must have exercises array');
      }

      // Validate each exercise
      const validatedExercises = set.exercises.map((exercise: any) => {
        if (!exercise || typeof exercise !== 'object') {
          throw new Error('Invalid exercise object');
        }

        if (!exercise.id || !exercise.name) {
          throw new Error('Exercise missing required properties');
        }

        // Ensure instructions property exists
        return {
          ...exercise,
          instructions: exercise.instructions || '' // Default to empty string if missing
        };
      });

      return {
        ...set,
        exercises: validatedExercises
      };
    });

    console.log('Validated exercise sets successfully');
    return validatedSets;
  } catch (error) {
    console.error('Exercise set validation failed:', error);
    return null;
  }
};

export const usePersistence = () => {
  const { state, dispatch } = useApp();

  const loadSettingsOnly = useCallback(() => {
    try {
      // Load settings
      const savedSettings = localStorage.getItem('voiceSlicerSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      }

      // Load exercise sets with validation
      const savedExerciseSets = localStorage.getItem('voiceSlicerExerciseSets');
      if (savedExerciseSets) {
        const exerciseSets = JSON.parse(savedExerciseSets);

        // Validate exercise sets structure
        const validatedExerciseSets = validateExerciseSets(exerciseSets);
        if (validatedExerciseSets) {
          // TODO: Exercise sets are no longer part of AppContext - this is legacy code
          // dispatch({ type: 'SET_EXERCISE_SETS', payload: validatedExerciseSets });
          console.log('Validated exercise sets (legacy):', validatedExerciseSets);
        } else {
          console.warn('Invalid exercise sets in localStorage, using defaults');
          // Clear corrupted data
          localStorage.removeItem('voiceSlicerExerciseSets');
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [dispatch]);

  const loadSettings = useCallback(() => {
    const sessionActive = state.sessionActive;
    try {
      // Load settings
      const savedSettings = localStorage.getItem('voiceSlicerSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      }

      // Load exercise sets with validation
      const savedExerciseSets = localStorage.getItem('voiceSlicerExerciseSets');
      if (savedExerciseSets) {
        const exerciseSets = JSON.parse(savedExerciseSets);

        // Validate exercise sets structure
        const validatedExerciseSets = validateExerciseSets(exerciseSets);
        if (validatedExerciseSets) {
          // TODO: Exercise sets are no longer part of AppContext - this is legacy code
          // dispatch({ type: 'SET_EXERCISE_SETS', payload: validatedExerciseSets });
          console.log('Validated exercise sets (legacy):', validatedExerciseSets);
        } else {
          console.warn('Invalid exercise sets in localStorage, using defaults');
          // Clear corrupted data
          localStorage.removeItem('voiceSlicerExerciseSets');
        }
      }

      // Only load current indices if no session is active
      // This prevents overriding indices when a lesson is started
      if (!sessionActive) {
        const savedSetIndex = localStorage.getItem('voiceSlicerCurrentSetIndex');
        const savedExerciseIndex = localStorage.getItem('voiceSlicerCurrentExerciseIndex');

        // TODO: These actions no longer exist - this is legacy code
        // if (savedSetIndex !== null) {
        //   dispatch({ type: 'SET_CURRENT_SET_INDEX', payload: parseInt(savedSetIndex) });
        // }

        // if (savedExerciseIndex !== null) {
        //   dispatch({ type: 'SET_CURRENT_EXERCISE_INDEX', payload: parseInt(savedExerciseIndex) });
        // }

        console.log('Legacy saved indices:', { savedSetIndex, savedExerciseIndex });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [dispatch, state.sessionActive]);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('voiceSlicerSettings', JSON.stringify(state.settings));
      // TODO: exerciseSets, currentSetIndex, currentExerciseIndex no longer exist - legacy code
      // localStorage.setItem('voiceSlicerExerciseSets', JSON.stringify(state.exerciseSets));
      // localStorage.setItem('voiceSlicerCurrentSetIndex', state.currentSetIndex.toString());
      // localStorage.setItem('voiceSlicerCurrentExerciseIndex', state.currentExerciseIndex.toString());
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [state.settings]);

  return {
    loadSettings,
    loadSettingsOnly,
    saveSettings,
  };
};