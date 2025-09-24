'use client'

import { useApp } from '@/contexts/AppContext';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Loader } from 'lucide-react';
import AudioLevelMeter from '@/components/ui/AudioLevelMeter';

export default function RecordingControls() {
  const { state } = useApp();
  const { toggleRecording, currentAudioLevel, silenceDetection } = useAudioRecording();

  const handleRecordingToggle = async () => {
    try {
      await toggleRecording();
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  // Render simple mode
  if (!state.settings.recordingDebugMode) {
    return (
      <div className="flex flex-col items-center space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecordingToggle}
            className={`
              flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
              ${state.isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-400 hover:bg-gray-500 text-white'
              }
              ${!state.microphonePermissionGranted ? 'opacity-75' : ''}
            `}
            disabled={false}
          >
            {state.isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Processing indicator for auto-splitting */}
          {state.isAutoSplitting && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Slicing audio...</span>
            </div>
          )}
        </div>

        {/* Microphone permission message (simplified) */}
        {!state.microphonePermissionGranted && (
          <p className="text-xs text-gray-500 text-center max-w-xs">
            Click the microphone to start recording
          </p>
        )}
      </div>
    );
  }

  // Render debug mode (original behavior)
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex items-center gap-4">
        <button
          onClick={handleRecordingToggle}
          className={`record-btn-compact ${state.isRecording ? 'recording' : ''}`}
          disabled={false}
        >
          {state.isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <div className="text-left flex-1">
          <div className={`text-sm font-medium ${
            state.isRecording
              ? 'text-red-600'
              : state.microphonePermissionGranted
                ? 'text-green-600'
                : 'text-gray-600'
          }`}>
            {state.isRecording
              ? `Recording ${state.settings.autoSplitEnabled ? `segment ${state.currentRecordingSegment}` : ''}...`
              : state.microphonePermissionGranted
                ? 'Ready to record'
                : 'Click to start recording'
            }
          </div>

          {state.isRecording && (
            <div className="text-xs text-gray-500 mt-0.5">
              {state.settings.autoSplitEnabled
                ? `Auto-split: pause ${state.settings.autoSplitDuration}s for new recording`
                : 'Speak clearly and pause between phrases'
              }
            </div>
          )}

          {/* Auto-splitting status indicator */}
          {state.isRecording && state.settings.autoSplitEnabled && state.isAutoSplitting && (
            <div className="text-xs text-yellow-600 mt-0.5 font-medium animate-pulse">
              ⚡ Auto-splitting active
            </div>
          )}
        </div>
      </div>

      {/* Audio Level Meter - show when recording and auto-split enabled */}
      {state.isRecording && state.settings.autoSplitEnabled && (
        <div className="w-full max-w-md">
          <AudioLevelMeter
            level={currentAudioLevel}
            isSilent={silenceDetection.isSilent}
            silenceDuration={silenceDetection.silenceDuration}
            autoSplitThreshold={state.settings.autoSplitThreshold}
            autoSplitDuration={state.settings.autoSplitDuration}
            showSilenceIndicator={true}
            className="bg-gray-50 rounded-lg p-2 border border-gray-200"
          />
        </div>
      )}

      {!state.microphonePermissionGranted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 max-w-md">
          <p className="text-xs text-amber-800">
            🎤 Microphone access required for recording. Click the record button to grant permission.
          </p>
        </div>
      )}
    </div>
  );
}