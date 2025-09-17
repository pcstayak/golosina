'use client'

import { AppProvider } from '@/contexts/AppContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import VoiceTrainerApp from '@/components/VoiceTrainerApp';

export default function Home() {
  return (
    <AuthGuard>
      <AppProvider>
        <VoiceTrainerApp />
      </AppProvider>
    </AuthGuard>
  );
}