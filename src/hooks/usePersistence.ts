'use client'

import { useApp } from '@/contexts/AppContext';
import { useCallback } from 'react';

export const usePersistence = () => {
  const { state, dispatch } = useApp();

  const loadSettings = useCallback(() => {
    try {
      // Load settings
      const savedSettings = localStorage.getItem('voiceSlicerSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      }
      
      // Load exercise sets
      const savedExerciseSets = localStorage.getItem('voiceSlicerExerciseSets');
      if (savedExerciseSets) {
        const exerciseSets = JSON.parse(savedExerciseSets);
        dispatch({ type: 'SET_EXERCISE_SETS', payload: exerciseSets });
      }

      // Load current indices
      const savedSetIndex = localStorage.getItem('voiceSlicerCurrentSetIndex');
      if (savedSetIndex !== null) {
        dispatch({ type: 'SET_CURRENT_SET_INDEX', payload: parseInt(savedSetIndex) });
      }

      const savedExerciseIndex = localStorage.getItem('voiceSlicerCurrentExerciseIndex');
      if (savedExerciseIndex !== null) {
        dispatch({ type: 'SET_CURRENT_EXERCISE_INDEX', payload: parseInt(savedExerciseIndex) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [dispatch]);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('voiceSlicerSettings', JSON.stringify(state.settings));
      localStorage.setItem('voiceSlicerExerciseSets', JSON.stringify(state.exerciseSets));
      localStorage.setItem('voiceSlicerCurrentSetIndex', state.currentSetIndex.toString());
      localStorage.setItem('voiceSlicerCurrentExerciseIndex', state.currentExerciseIndex.toString());
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [state]);

  return {
    loadSettings,
    saveSettings,
  };
};