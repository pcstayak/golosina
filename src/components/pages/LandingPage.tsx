'use client'

import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import { Settings, Shield } from 'lucide-react';
import { useState } from 'react';
import SettingsModal from '@/components/modals/SettingsModal';
import Link from 'next/link';

export default function LandingPage() {
  const { state, dispatch } = useApp();
  const [showSettings, setShowSettings] = useState(false);

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

  const getSetRecordingsCount = (setId: number): number => {
    let count = 0;
    Object.keys(state.audioPieces).forEach(exerciseKey => {
      if (exerciseKey.startsWith(setId + '_')) {
        count += state.audioPieces[exerciseKey]?.length || 0;
      }
    });
    return count;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin">
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Button>
          </Link>
          <h1 className="text-5xl font-bold text-white">
            🎵 Golosina
          </h1>
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
        <p className="text-xl text-white/80 mb-8">
          Your AI-powered voice training companion
        </p>
      </div>

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