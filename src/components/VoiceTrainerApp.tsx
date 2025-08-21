'use client'

import { useApp } from '@/contexts/AppContext';
import LandingPage from './pages/LandingPage';
import LessonPage from './pages/LessonPage';
import SummaryPage from './pages/SummaryPage';
import StatusNotification from './ui/StatusNotification';
import { useEffect } from 'react';
import { usePersistence } from '@/hooks/usePersistence';

export default function VoiceTrainerApp() {
  const { state } = useApp();
  const { loadSettings } = usePersistence();

  useEffect(() => {
    // Load settings on app initialization
    loadSettings();
  }, [loadSettings]);

  const renderCurrentPage = () => {
    switch (state.currentView) {
      case 'landing':
        return <LandingPage />;
      case 'lesson':
        return <LessonPage />;
      case 'summary':
        return <SummaryPage />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="container mx-auto px-4 py-8">
        {renderCurrentPage()}
      </div>
      <StatusNotification />
    </div>
  );
}