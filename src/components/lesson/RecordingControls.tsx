'use client'

import { useApp } from '@/contexts/AppContext';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Loader, ChevronDown, ChevronUp, Scissors } from 'lucide-react';
import AudioLevelMeter from '@/components/ui/AudioLevelMeter';
import { useState } from 'react';

export default function RecordingControls() {
  const { state, dispatch } = useApp();
  const { toggleRecording, currentAudioLevel, silenceDetection } = useAudioRecording();
  const [showSettings, setShowSettings] = useState(false);

  const handleRecordingToggle = async () => {
    try {
      await toggleRecording();
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const handleUpdateRecordingSettings = (updates: {
    autoSplitEnabled?: boolean;
    autoSplitDuration?: number;
    minRecordingLength?: number;
    dropSilentRecordings?: boolean;
    trimSilenceFromEdges?: boolean;
    maxEdgeSilence?: number;
  }) => {
    dispatch({ type: 'UPDATE_RECORDING_SETTINGS', payload: updates });
  };

  // Render simple mode
  if (!state.settings.recordingDebugMode) {
    return (
      <div className="flex flex-col items-center space-y-3">
        <div className="relative inline-block">
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

          {/* Processing indicator for auto-splitting - absolutely positioned to avoid layout shift */}
          {state.isAutoSplitting && (
            <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1.5 shadow-md animate-in fade-in duration-200">
              <Scissors className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        {/* Microphone permission message (simplified) */}
        {!state.microphonePermissionGranted && (
          <p className="text-xs text-gray-500 text-center max-w-xs">
            Click the microphone to start recording
          </p>
        )}

        {/* Expandable Recording Settings */}
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors mx-auto"
          >
            {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>Recording Settings</span>
          </button>

          {showSettings && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
              {/* Auto-split after silence */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={state.settings.autoSplitEnabled}
                    onChange={(e) => handleUpdateRecordingSettings({ autoSplitEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Auto-split after silence
                </label>
                {state.settings.autoSplitEnabled && (
                  <div className="flex items-center gap-2 ml-6">
                    <input
                      type="number"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={state.settings.autoSplitDuration}
                      onChange={(e) => handleUpdateRecordingSettings({ autoSplitDuration: parseFloat(e.target.value) || 1.0 })}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                  </div>
                )}
              </div>

              {/* Drop short recordings */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={state.settings.minRecordingLength > 0}
                    onChange={(e) => handleUpdateRecordingSettings({
                      minRecordingLength: e.target.checked ? 3.0 : 0
                    })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Drop recordings shorter than
                </label>
                {state.settings.minRecordingLength > 0 && (
                  <div className="flex items-center gap-2 ml-6">
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={state.settings.minRecordingLength}
                      onChange={(e) => handleUpdateRecordingSettings({ minRecordingLength: parseFloat(e.target.value) || 3.0 })}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                  </div>
                )}
              </div>

              {/* Drop silent recordings */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={state.settings.dropSilentRecordings}
                    onChange={(e) => handleUpdateRecordingSettings({ dropSilentRecordings: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Drop silent recordings
                </label>
              </div>

              {/* Trim silence from edges */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={state.settings.trimSilenceFromEdges}
                    onChange={(e) => handleUpdateRecordingSettings({ trimSilenceFromEdges: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Trim silence from edges
                </label>
                {state.settings.trimSilenceFromEdges && (
                  <div className="flex items-center gap-2 ml-6">
                    <span className="text-sm text-gray-600">Keep max</span>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={state.settings.maxEdgeSilence}
                      onChange={(e) => handleUpdateRecordingSettings({ maxEdgeSilence: parseFloat(e.target.value) || 2.0 })}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-600">seconds</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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

      {/* Expandable Recording Settings (Debug Mode) */}
      <div className="w-full max-w-md">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors mx-auto"
        >
          {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>Recording Settings</span>
        </button>

        {showSettings && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            {/* Auto-split after silence */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={state.settings.autoSplitEnabled}
                  onChange={(e) => handleUpdateRecordingSettings({ autoSplitEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Auto-split after silence
              </label>
              {state.settings.autoSplitEnabled && (
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="number"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={state.settings.autoSplitDuration}
                    onChange={(e) => handleUpdateRecordingSettings({ autoSplitDuration: parseFloat(e.target.value) || 1.0 })}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">seconds</span>
                </div>
              )}
            </div>

            {/* Drop short recordings */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={state.settings.minRecordingLength > 0}
                  onChange={(e) => handleUpdateRecordingSettings({
                    minRecordingLength: e.target.checked ? 3.0 : 0
                  })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Drop recordings shorter than
              </label>
              {state.settings.minRecordingLength > 0 && (
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={state.settings.minRecordingLength}
                    onChange={(e) => handleUpdateRecordingSettings({ minRecordingLength: parseFloat(e.target.value) || 3.0 })}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">seconds</span>
                </div>
              )}
            </div>

            {/* Drop silent recordings */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={state.settings.dropSilentRecordings}
                  onChange={(e) => handleUpdateRecordingSettings({ dropSilentRecordings: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Drop silent recordings
              </label>
            </div>

            {/* Trim silence from edges */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={state.settings.trimSilenceFromEdges}
                  onChange={(e) => handleUpdateRecordingSettings({ trimSilenceFromEdges: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Trim silence from edges
              </label>
              {state.settings.trimSilenceFromEdges && (
                <div className="flex items-center gap-2 ml-6">
                  <span className="text-sm text-gray-600">Keep max</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={state.settings.maxEdgeSilence}
                    onChange={(e) => handleUpdateRecordingSettings({ maxEdgeSilence: parseFloat(e.target.value) || 2.0 })}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">seconds</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}