'use client'

import { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNotification } from './useNotification';

interface TestRecording {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: string;
}

export const useTestRecording = () => {
  const { state, dispatch } = useApp();
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [isTestRecording, setIsTestRecording] = useState(false);
  const [testRecording, setTestRecording] = useState<TestRecording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const ensureMicrophonePermission = useCallback(async () => {
    try {
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '::1';
      
      if (isMobile && location.protocol !== 'https:' && !isLocalHost) {
        throw new Error('Audio recording requires HTTPS on mobile devices');
      }

      const constraints = {
        audio: isMobile ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : {
          deviceId: state.settings.microphoneId ? { exact: state.settings.microphoneId } : undefined,
          sampleRate: state.settings.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (getUserMediaError) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      return stream;
    } catch (error: any) {
      console.error('Failed to get microphone permission:', error);
      throw error;
    }
  }, [state.settings]);

  const startTestRecording = useCallback(async () => {
    try {
      const stream = await ensureMicrophonePermission();
      
      // Audio level monitoring
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const updateAudioLevel = () => {
        if (isTestRecording) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      // MediaRecorder setup
      let mediaRecorderOptions: MediaRecorderOptions = {};
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mediaRecorderOptions.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mediaRecorderOptions.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mediaRecorderOptions.mimeType = 'audio/mp4';
        }
      } else {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mediaRecorderOptions.mimeType = 'audio/webm;codecs=opus';
          mediaRecorderOptions.audioBitsPerSecond = 128000;
        }
      }

      const recorder = new MediaRecorder(stream, mediaRecorderOptions);
      const chunks: BlobPart[] = [];
      const startTime = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const duration = (Date.now() - startTime) / 1000;
        const audioBlob = new Blob(chunks, { 
          type: chunks.length > 0 && chunks[0] instanceof Blob ? (chunks[0] as Blob).type : 'audio/webm'
        });

        if (audioBlob.size === 0) {
          showError('Test recording failed: No audio data captured');
          return;
        }

        const testRec: TestRecording = {
          id: Date.now().toString(),
          blob: audioBlob,
          duration,
          timestamp: new Date().toISOString()
        };

        setTestRecording(testRec);
        showSuccess(`Test recording completed! (${duration.toFixed(1)}s)`);
        
        // Stop audio level monitoring
        setAudioLevel(0);
        
        // Clean up streams
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      };

      recorder.onerror = (event: any) => {
        console.error('Test recording error:', event.error);
        showError('Test recording error: ' + event.error.message);
        setIsTestRecording(false);
        setAudioLevel(0);
      };

      setIsTestRecording(true);
      updateAudioLevel();
      recorder.start(100);
      
    } catch (error: any) {
      console.error('Error starting test recording:', error);
      
      let errorMessage = 'Could not start test recording';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DeviceNotFoundError') {
        errorMessage = 'No microphone found. Please check your device settings.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Audio recording not supported on this device/browser.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Microphone is being used by another application.';
      } else if (error.message.includes('HTTPS')) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
      setIsTestRecording(false);
      setAudioLevel(0);
    }
  }, [ensureMicrophonePermission, showError, showSuccess, isTestRecording]);

  const stopTestRecording = useCallback(() => {
    setIsTestRecording(false);
  }, []);

  const playTestRecording = useCallback(async () => {
    if (!testRecording || isPlaying) return;

    try {
      setIsPlaying(true);
      const audio = new Audio(URL.createObjectURL(testRecording.blob));
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audio.src);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audio.src);
        showError('Could not play test recording');
      };

      await audio.play();
    } catch (error) {
      setIsPlaying(false);
      showError('Could not play test recording');
    }
  }, [testRecording, isPlaying, showError]);

  const clearTestRecording = useCallback(() => {
    if (testRecording) {
      URL.revokeObjectURL(URL.createObjectURL(testRecording.blob));
    }
    setTestRecording(null);
  }, [testRecording]);

  return {
    isTestRecording,
    testRecording,
    isPlaying,
    audioLevel,
    startTestRecording,
    stopTestRecording,
    playTestRecording,
    clearTestRecording
  };
};