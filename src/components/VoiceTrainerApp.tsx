'use client'

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LessonPage from './pages/LessonPage';
import RecapPage from './pages/RecapPage';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StatusNotification from './ui/StatusNotification';
import { useEffect } from 'react';
import { usePersistence } from '@/hooks/usePersistence';

export default function VoiceTrainerApp() {
  const { state, dispatch } = useApp();
  const { loadSettings } = usePersistence();
  const { profile, loading } = useAuth();

  useEffect(() => {
    // Load settings on app initialization
    loadSettings();
  }, [loadSettings]);

  // Handle role-based initial view selection
  useEffect(() => {
    if (!loading && profile) {
      // Set initial view based on user role
      if (profile.role === 'admin' && state.currentView === 'landing') {
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'admin-dashboard' });
      } else if (profile.role === 'teacher' && state.currentView === 'landing') {
        dispatch({ type: 'SET_CURRENT_VIEW', payload: 'teacher-dashboard' });
      }
      // Students continue to use the regular voice training app (landing -> lesson -> recap flow)
    }
  }, [loading, profile, state.currentView, dispatch]);

  const renderCurrentPage = () => {
    switch (state.currentView) {
      case 'landing':
        return <LandingPage />;
      case 'lesson':
        return <LessonPage />;
      case 'recap':
        return <RecapPage />;
      case 'teacher-dashboard':
        return <TeacherDashboard />;
      case 'admin-dashboard':
        return <AdminDashboard />;
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