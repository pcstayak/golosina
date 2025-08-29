'use client'

import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import VoiceTrainerApp from '@/components/VoiceTrainerApp';

export default function Home() {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppProvider>
          <VoiceTrainerApp />
        </AppProvider>
      </AuthGuard>
    </AuthProvider>
  );
}