'use client'

import { AppProvider } from '@/contexts/AppContext';
import VoiceTrainerApp from '@/components/VoiceTrainerApp';

export default function Home() {
  return (
    <AppProvider>
      <VoiceTrainerApp />
    </AppProvider>
  );
}