'use client'

import { useApp } from '@/contexts/AppContext';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { Button } from '@/components/ui/Button';
import { Mic, Square } from 'lucide-react';

export default function RecordingControls() {
  const { state } = useApp();
  const { toggleRecording } = useAudioRecording();

  const handleRecordingToggle = async () => {
    try {
      await toggleRecording();
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={handleRecordingToggle}
        className={`record-btn ${state.isRecording ? 'recording' : ''}`}
        disabled={false}
      >
        {state.isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
      </button>
      
      <div className="text-center">
        <div className={`text-sm font-medium ${
          state.isRecording 
            ? 'text-red-600' 
            : state.microphonePermissionGranted 
              ? 'text-green-600' 
              : 'text-gray-600'
        }`}>
          {state.isRecording 
            ? 'Recording in progress...' 
            : state.microphonePermissionGranted
              ? 'Ready to record'
              : 'Click to start recording'
          }
        </div>
        
        {state.isRecording && (
          <div className="text-xs text-gray-500 mt-1">
            Speak clearly and pause between phrases
          </div>
        )}
      </div>
      
      {!state.microphonePermissionGranted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm">
          <p className="text-xs text-amber-800">
            🎤 Microphone access required for recording. Click the record button to grant permission.
          </p>
        </div>
      )}
    </div>
  );
}