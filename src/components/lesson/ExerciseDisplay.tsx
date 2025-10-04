'use client'

import { useApp } from '@/contexts/AppContext';
import { BookOpen, Clock, Lightbulb, Image } from 'lucide-react';
import MediaGallery from './MediaGallery';
import RecordingControls from './RecordingControls';

export default function ExerciseDisplay() {
  // This component is deprecated and used only for the old exercise set system
  // The new unified lesson system uses StepDisplay instead
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="text-center text-gray-500">
        <p>This feature has been replaced. Please use the new lesson system.</p>
      </div>
    </div>
  );
}