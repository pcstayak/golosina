'use client'

import { useApp } from '@/contexts/AppContext';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Loader, ChevronDown, ChevronUp, Scissors } from 'lucide-react';
import AudioLevelMeter from '@/components/ui/AudioLevelMeter';
import { useState, useRef } from 'react';
import { useNotification } from '@/hooks/useNotification';
import type { AudioPiece } from '@/contexts/AppContext';

export default function RecordingControls() {
  const { state, dispatch } = useApp();
  const { toggleRecording, currentAudioLevel, silenceDetection } = useAudioRecording();
  const [showSettings, setShowSettings] = useState(false);
  const { showSuccess, showError } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRecordingToggle = async () => {
    try {
      await toggleRecording();
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const handleUploadAudio = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      showError('Please select an audio file');
      return;
    }

    try {
      // Create an audio element to get the duration
      const audioElement = document.createElement('audio');
      const objectUrl = URL.createObjectURL(file);

      audioElement.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        audioElement.onloadedmetadata = () => resolve();
        audioElement.onerror = () => reject(new Error('Failed to load audio file'));
      });

      const duration = audioElement.duration;
      URL.revokeObjectURL(objectUrl);

      // Create AudioPiece from uploaded file
      const currentStepId = state.currentStepId;
      const currentStepIndex = state.currentStepIndex;
      const stepId = `step_${currentStepId}`;

      const pieceId = `upload_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const piece: AudioPiece = {
        id: pieceId,
        blob: file,
        timestamp,
        duration,
        exerciseId: currentStepId,
        exerciseName: `Step ${currentStepIndex + 1} - Uploaded`
      };

      dispatch({ type: 'ADD_AUDIO_PIECE', payload: { stepId, piece } });
      showSuccess(`Audio uploaded successfully (${duration.toFixed(1)}s)`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      showError('Failed to upload audio file');
    }
  };

  const handleUpdateRecordingSettings = (updates: {
    autoSplitEnabled?: boolean;
    autoSplitThreshold?: number;
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecordingToggle}
            className={`
              w-[84px] h-[84px] rounded-full border-0 cursor-pointer relative flex items-center justify-center
              ${state.isRecording
                ? 'bg-danger animate-pulse-recording'
                : 'bg-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.15)]'
              }
              ${!state.microphonePermissionGranted ? 'opacity-75' : ''}
            `}
            disabled={false}
            aria-label="Record"
          >
            <Mic size={36} color="white" />
            {state.isAutoSplitting && (
              <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1.5 shadow-md">
                <Scissors className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </button>

          <div className="grid gap-1.5">
            <Button size="sm" variant="primary" onClick={handleRecordingToggle}>
              {state.isRecording ? 'Stop recording' : 'Start new take'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleUploadAudio}>
              Upload audio
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Real-time waveform */}
        {state.isRecording && state.settings.autoSplitEnabled ? (
          <div className="w-full">
            <AudioLevelMeter
              level={currentAudioLevel}
              isSilent={silenceDetection.isSilent}
              silenceDuration={silenceDetection.silenceDuration}
              autoSplitThreshold={state.settings.autoSplitThreshold}
              autoSplitDuration={state.settings.autoSplitDuration}
              showSilenceIndicator={true}
              className="bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)] rounded-[12px] p-2.5 border border-border"
            />
          </div>
        ) : (
          <div className="w-full h-12 flex items-center justify-center border border-border rounded-[12px] bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)] text-faint font-black tracking-widest text-xs">
            {state.isRecording ? 'Recording...' : 'Ready to record'}
          </div>
        )}

        {/* Microphone permission message (simplified) */}
        {!state.microphonePermissionGranted && (
          <p className="text-xs text-muted text-center max-w-xs">
            Click the microphone to start recording
          </p>
        )}

        {/* Expandable Recording Settings */}
        <details className="w-full border border-border rounded-[14px] bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)] p-3">
          <summary className="cursor-pointer font-black text-muted list-none">
            Recording settings
          </summary>
          <div className="mt-2.5 grid gap-2.5 text-muted text-[13px]">
            {/* Auto-split after silence */}
            <div className="grid gap-1.5">
              <label className="flex items-center gap-2 text-xs font-black text-text">
                <input
                  type="checkbox"
                  checked={state.settings.autoSplitEnabled}
                  onChange={(e) => handleUpdateRecordingSettings({ autoSplitEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
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
                    className="w-20 px-2 py-1 text-xs border border-border rounded bg-panel text-text focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <span className="text-xs text-muted">seconds</span>
                </div>
              )}
            </div>

            {/* Auto-split threshold */}
            {state.settings.autoSplitEnabled && (
              <div className="grid gap-1.5">
                <label className="text-xs font-black text-text">
                  Auto-split threshold
                </label>
                <div className="flex items-center gap-2 ml-6">
                  <input
                    type="number"
                    min="0.01"
                    max="0.1"
                    step="0.01"
                    value={state.settings.autoSplitThreshold}
                    onChange={(e) => handleUpdateRecordingSettings({ autoSplitThreshold: parseFloat(e.target.value) || 0.02 })}
                    className="w-20 px-2 py-1 text-xs border border-border rounded bg-panel text-text focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <span className="text-xs text-muted">threshold</span>
                </div>
              </div>
            )}

            {/* Drop short recordings */}
            <div className="grid gap-1.5">
              <label className="flex items-center gap-2 text-xs font-black text-text">
                <input
                  type="checkbox"
                  checked={state.settings.minRecordingLength > 0}
                  onChange={(e) => handleUpdateRecordingSettings({
                    minRecordingLength: e.target.checked ? 3.0 : 0
                  })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                Min recording length
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
                    className="w-20 px-2 py-1 text-xs border border-border rounded bg-panel text-text focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <span className="text-xs text-muted">seconds</span>
                </div>
              )}
            </div>

            {/* Drop silent recordings */}
            <div className="grid gap-1.5">
              <label className="flex items-center gap-2 text-xs font-black text-text">
                <input
                  type="checkbox"
                  checked={state.settings.dropSilentRecordings}
                  onChange={(e) => handleUpdateRecordingSettings({ dropSilentRecordings: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                Drop silent recordings
              </label>
            </div>

            {/* Trim silence from edges */}
            <div className="grid gap-1.5">
              <label className="flex items-center gap-2 text-xs font-black text-text">
                <input
                  type="checkbox"
                  checked={state.settings.trimSilenceFromEdges}
                  onChange={(e) => handleUpdateRecordingSettings({ trimSilenceFromEdges: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                Trim silence from edges
              </label>
              {state.settings.trimSilenceFromEdges && (
                <div className="flex items-center gap-2 ml-6">
                  <span className="text-xs text-muted">Keep max</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={state.settings.maxEdgeSilence}
                    onChange={(e) => handleUpdateRecordingSettings({ maxEdgeSilence: parseFloat(e.target.value) || 2.0 })}
                    className="w-20 px-2 py-1 text-xs border border-border rounded bg-panel text-text focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <span className="text-xs text-muted">seconds</span>
                </div>
              )}
            </div>

            {/* Sample rate */}
            <div className="grid gap-1.5">
              <label className="text-xs font-black text-text">
                Sample rate
              </label>
              <select
                value={state.settings.sampleRate}
                onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { sampleRate: parseInt(e.target.value) } })}
                className="ml-6 px-2 py-1 text-xs border border-border rounded bg-panel text-text focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value={8000}>8 kHz</option>
                <option value={16000}>16 kHz</option>
                <option value={22050}>22.05 kHz</option>
                <option value={44100}>44.1 kHz</option>
                <option value={48000}>48 kHz</option>
              </select>
            </div>

            {/* Recording debug mode */}
            <div className="grid gap-1.5">
              <label className="flex items-center gap-2 text-xs font-black text-text">
                <input
                  type="checkbox"
                  checked={state.settings.recordingDebugMode}
                  onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { recordingDebugMode: e.target.checked } })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                Debug mode
              </label>
            </div>
          </div>
        </details>
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