'use client'

import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { state, dispatch } = useApp();
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    // Load available audio devices
    const loadAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
      } catch (error) {
        console.error('Error loading audio devices:', error);
      }
    };

    loadAudioDevices();
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    dispatch({ 
      type: 'UPDATE_SETTINGS', 
      payload: { [key]: value } 
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Audio Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Audio Settings</h3>
            
            {/* Microphone Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Microphone
              </label>
              <select
                value={state.settings.microphoneId}
                onChange={(e) => handleSettingChange('microphoneId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Default microphone</option>
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.substr(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Sample Rate */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sample Rate: <span className="font-normal">{state.settings.sampleRate} Hz</span>
              </label>
              <input
                type="range"
                min="8000"
                max="48000"
                step="1000"
                value={state.settings.sampleRate}
                onChange={(e) => handleSettingChange('sampleRate', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Silence Threshold */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Silence Threshold: <span className="font-normal">{state.settings.silenceThreshold}</span>
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={state.settings.silenceThreshold}
                onChange={(e) => handleSettingChange('silenceThreshold', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower values detect quieter sounds as speech
              </p>
            </div>

            {/* Silence Duration */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Silence Duration: <span className="font-normal">{state.settings.silenceDuration}s</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={state.settings.silenceDuration}
                onChange={(e) => handleSettingChange('silenceDuration', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long silence must last to split recordings
              </p>
            </div>
          </div>

          {/* Test Recording Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Test Recording</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                Test your microphone settings before starting a session.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  // TODO: Implement test recording
                  console.log('Test recording');
                }}
              >
                🎤 Test Record
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}