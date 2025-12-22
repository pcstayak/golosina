'use client'

import { useCallback, useRef, useEffect, useState } from 'react';

export interface SilenceDetectionConfig {
  threshold: number;
  duration: number;
  minRecordingLength: number;
  enabled: boolean;
  onSilenceDetected: () => void;
  onSpeechDetected: () => void;
  onAudioLevelUpdate: (level: number) => void;
}

interface SilenceDetectionState {
  isActive: boolean;
  currentLevel: number;
  isSilent: boolean;
  silenceDuration: number;
}

export const useRealTimeSilenceDetection = (
  audioStream: MediaStream | null,
  config: SilenceDetectionConfig
) => {
  const [state, setState] = useState<SilenceDetectionState>({
    isActive: false,
    currentLevel: 0,
    isSilent: false,
    silenceDuration: 0
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceStartTimeRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number | null>(null);
  const hasSpeechDetectedRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    silenceStartTimeRef.current = null;
    lastSpeechTimeRef.current = null;
    hasSpeechDetectedRef.current = false;

    setState(prev => ({ ...prev, isActive: false, currentLevel: 0, isSilent: false, silenceDuration: 0 }));
  }, []);

  const startDetection = useCallback(async () => {
    if (!audioStream || !config.enabled) {
      return;
    }

    try {
      // Clean up any existing detection
      cleanup();

      // Create new audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyser
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Create microphone source
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(audioStream);
      microphoneRef.current.connect(analyserRef.current);

      // Initialize timing - no speech detected yet
      lastSpeechTimeRef.current = null;
      silenceStartTimeRef.current = null;
      hasSpeechDetectedRef.current = false;

      console.log('Silence detection initialized - waiting for speech');

      setState(prev => ({ ...prev, isActive: true }));

      // Start analysis loop
      const analyzeAudio = () => {
        if (!analyserRef.current || !config.enabled) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS (Root Mean Square) for better silence detection
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        
        // Normalize to 0-1 range (dataArray values are 0-255)
        const normalizedLevel = rms / 255;

        // Update audio level
        config.onAudioLevelUpdate(normalizedLevel);
        
        const currentTime = Date.now();
        const isSilent = normalizedLevel < config.threshold;

        if (isSilent) {
          // Only start tracking silence if speech has been detected in this segment
          if (hasSpeechDetectedRef.current) {
            // Start tracking silence if not already
            if (silenceStartTimeRef.current === null) {
              silenceStartTimeRef.current = currentTime;
            }

            const silenceDuration = (currentTime - silenceStartTimeRef.current) / 1000;

            setState(prev => ({
              ...prev,
              currentLevel: normalizedLevel,
              isSilent: true,
              silenceDuration
            }));

            // Check if silence duration exceeds threshold
            if (silenceDuration >= config.duration) {
              // Ensure we have a minimum recording length since last speech started
              const timeSinceLastSpeech = lastSpeechTimeRef.current
                ? (currentTime - lastSpeechTimeRef.current) / 1000
                : 0;

              console.log('Silence after speech detected', {
                silenceDuration: silenceDuration.toFixed(2),
                timeSinceLastSpeech: timeSinceLastSpeech.toFixed(2),
                minRequired: config.minRecordingLength
              });

              if (timeSinceLastSpeech >= config.minRecordingLength) {
                console.log('Triggering silence detection callback - splitting audio');
                config.onSilenceDetected();
                silenceStartTimeRef.current = null; // Reset silence tracking
                lastSpeechTimeRef.current = null; // Reset speech tracking
                hasSpeechDetectedRef.current = false; // Reset for next segment
              } else {
                console.log('Recording too short - waiting for more content');
              }
            }
          } else {
            // Silence before any speech - just update level, don't track silence duration
            setState(prev => ({
              ...prev,
              currentLevel: normalizedLevel,
              isSilent: true,
              silenceDuration: 0
            }));
          }
        } else {
          // Speech detected
          if (!hasSpeechDetectedRef.current) {
            console.log('First speech detected in this segment!');
            hasSpeechDetectedRef.current = true;
            lastSpeechTimeRef.current = currentTime;
            config.onSpeechDetected();
          } else if (silenceStartTimeRef.current !== null) {
            // Transitioning from silence to speech (continuing speech after pause)
            console.log('Speech resumed after silence');
            config.onSpeechDetected();
          }

          // Always update last speech time when there's speech
          lastSpeechTimeRef.current = currentTime;
          silenceStartTimeRef.current = null;

          setState(prev => ({
            ...prev,
            currentLevel: normalizedLevel,
            isSilent: false,
            silenceDuration: 0
          }));
        }

        // Continue analysis if analyser is still available and detection is enabled
        // Use ref check instead of state to avoid stale closure issues
        if (analyserRef.current && config.enabled) {
          animationFrameRef.current = requestAnimationFrame(analyzeAudio);
        }
      };

      // Start the analysis loop
      analyzeAudio();

    } catch (error) {
      console.error('Error starting silence detection:', error);
      cleanup();
    }
  }, [audioStream, config, cleanup]);

  const stopDetection = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Effect to start/stop detection based on config and stream
  useEffect(() => {
    if (audioStream && config.enabled) {
      startDetection();
    } else {
      stopDetection();
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      stopDetection();
    };
  }, [audioStream, config.enabled, config.threshold, config.duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isActive: state.isActive,
    currentLevel: state.currentLevel,
    isSilent: state.isSilent,
    silenceDuration: state.silenceDuration,
    startDetection,
    stopDetection
  };
};