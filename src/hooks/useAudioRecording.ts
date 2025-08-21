'use client'

import { useApp } from '@/contexts/AppContext';
import { useNotification } from './useNotification';
import { useCallback } from 'react';
import type { AudioPiece } from '@/contexts/AppContext';

export const useAudioRecording = () => {
  const { state, dispatch, getCurrentExercises, getCurrentSet } = useApp();
  const { showSuccess, showError, showWarning } = useNotification();

  const ensureMicrophonePermission = useCallback(async () => {
    if (state.microphonePermissionGranted && state.audioStream && state.audioStream.active) {
      return state.audioStream;
    }

    try {
      // Check if we have permission without requesting it first
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permission.state === 'denied') {
          throw new Error('Microphone permission denied');
        }
      }

      // Detect mobile device for constraints
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Check if HTTPS is required (only for mobile browsers)
      const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '::1';
      if (isMobile && location.protocol !== 'https:' && !isLocalHost) {
        throw new Error('Audio recording requires HTTPS on mobile devices. Please access this page via HTTPS.');
      }

      // Request microphone access
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

      console.log('🔧 Audio constraints:', constraints);
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Got audio stream:', stream);
      } catch (getUserMediaError) {
        console.warn('❌ Enhanced constraints failed, trying basic audio...', getUserMediaError);
        // Fallback to most basic audio constraints
        const basicConstraints = { audio: true };
        stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        console.log('✅ Got audio stream with basic constraints:', stream);
      }

      dispatch({ type: 'SET_AUDIO_STREAM', payload: stream });
      dispatch({ type: 'SET_MICROPHONE_PERMISSION', payload: true });
      console.log('✅ Microphone permission granted and cached');
      return stream;

    } catch (error: any) {
      dispatch({ type: 'SET_MICROPHONE_PERMISSION', payload: false });
      console.error('❌ Failed to get microphone permission:', error);
      throw error;
    }
  }, [state.microphonePermissionGranted, state.audioStream, state.settings, dispatch]);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting recording process...');
      
      // Check device type for mobile-specific handling
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log(`📱 Device detected: ${isMobile ? 'Mobile' : 'Desktop'}`);
      
      // Use cached permission and stream
      const stream = await ensureMicrophonePermission();
      
      // Use mobile-compatible MediaRecorder options
      let mediaRecorderOptions: MediaRecorderOptions = {};
      if (isMobile) {
        // Try different codecs for mobile compatibility
        console.log('🎵 Checking supported audio formats...');
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mediaRecorderOptions.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mediaRecorderOptions.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mediaRecorderOptions.mimeType = 'audio/mp4';
        }
      } else {
        // Desktop: prefer high quality
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mediaRecorderOptions.mimeType = 'audio/webm;codecs=opus';
          mediaRecorderOptions.audioBitsPerSecond = 128000;
        }
      }
      
      console.log('🔧 MediaRecorder options:', mediaRecorderOptions);
      
      const recorder = new MediaRecorder(stream, mediaRecorderOptions);
      dispatch({ type: 'SET_MEDIA_RECORDER', payload: recorder });
      dispatch({ type: 'SET_RECORDED_CHUNKS', payload: [] });
      
      const chunks: BlobPart[] = [];
      const startTime = Date.now();
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('📊 Chunk received:', event.data.size, 'bytes');
        }
      };
      
      recorder.onstop = () => {
        const duration = (Date.now() - startTime) / 1000; // Calculate actual duration
        console.log('⏹ Recording stopped, processing...', duration, 'seconds');
        dispatch({ type: 'SET_RECORDED_CHUNKS', payload: chunks });
        // Process recording with the collected chunks and actual duration
        processRecordingWithChunks(chunks, duration);
      };
      
      recorder.onerror = (event: any) => {
        console.error('🚨 MediaRecorder error:', event.error);
        showError('Recording error: ' + event.error.message);
      };
      
      recorder.start(100); // Collect data every 100ms
      dispatch({ type: 'SET_IS_RECORDING', payload: true });
      
      console.log('🎤 Recording is now active!');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      // Provide specific error messages for common mobile issues
      let errorMessage = 'Error: Could not start recording';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DeviceNotFoundError') {
        errorMessage = 'No microphone found. Please check your device settings.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Audio recording not supported on this device/browser.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
      } else if (error.message.includes('HTTPS')) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
    }
  }, [dispatch, ensureMicrophonePermission, showError]);

  const stopRecording = useCallback(() => {
    if (state.mediaRecorder && state.isRecording) {
      state.mediaRecorder.stop();
      dispatch({ type: 'SET_IS_RECORDING', payload: false });
    }
  }, [state.mediaRecorder, state.isRecording, dispatch]);

  const toggleRecording = useCallback(async () => {
    if (!state.isRecording) {
      await startRecording();
    } else {
      stopRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  const processRecordingWithChunks = useCallback(async (chunks: BlobPart[], duration?: number) => {
    if (chunks.length === 0) {
      showError('No audio data recorded');
      return;
    }

    try {
      console.log('🔄 Processing recorded chunks:', chunks.length);
      
      // Create blob from recorded chunks
      const audioBlob = new Blob(chunks, { 
        type: chunks.length > 0 && chunks[0] instanceof Blob ? (chunks[0] as Blob).type : 'audio/webm'
      });
      console.log('📦 Created audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
      
      if (audioBlob.size === 0) {
        throw new Error('Recorded audio blob is empty');
      }
      
      const currentExercise = getCurrentExercises()[state.currentExerciseIndex];
      if (!currentExercise) {
        throw new Error('No current exercise found');
      }
      
      const exerciseKey = `${getCurrentSet()?.id || 'shared'}_${currentExercise.id}`;
      
      // Use actual duration if provided, otherwise estimate
      const recordingDuration = duration || Math.max(chunks.length * 0.1, 1);
      
      const pieceId = Date.now().toString();
      const timestamp = new Date().toISOString();
      
      const pieceData: AudioPiece = {
        id: pieceId,
        blob: audioBlob,
        timestamp: timestamp,
        duration: recordingDuration,
        exerciseId: currentExercise.id,
        exerciseName: currentExercise.name
      };
      
      dispatch({ type: 'ADD_AUDIO_PIECE', payload: { exerciseKey, piece: pieceData } });
      
      showSuccess(`Recording saved! (${recordingDuration.toFixed(1)}s)`);
      
    } catch (error: any) {
      console.error('Error processing recording:', error);
      showError('Error processing recording: ' + error.message);
    }
  }, [state.currentExerciseIndex, dispatch, getCurrentExercises, getCurrentSet, showError, showSuccess]);

  // Keep the old function for compatibility
  const processRecording = useCallback(async () => {
    return processRecordingWithChunks(state.recordedChunks);
  }, [state.recordedChunks, processRecordingWithChunks]);

  // Audio processing utilities
  const splitAudioBySilence = async (audioBuffer: AudioBuffer, audioContext: AudioContext): Promise<AudioBuffer[]> => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const silenceThreshold = state.settings.silenceThreshold;
    const silenceDurationSamples = state.settings.silenceDuration * sampleRate;
    
    const pieces: AudioBuffer[] = [];
    let currentPieceStart = 0;
    let silenceStart: number | null = null;
    let consecutiveSilenceSamples = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);
      
      if (amplitude < silenceThreshold) {
        if (silenceStart === null) {
          silenceStart = i;
          consecutiveSilenceSamples = 1;
        } else {
          consecutiveSilenceSamples++;
        }
        
        // If silence is long enough, split here
        if (consecutiveSilenceSamples >= silenceDurationSamples) {
          const pieceEnd = silenceStart;
          const pieceDuration = (pieceEnd - currentPieceStart) / sampleRate;
          
          // Only include pieces longer than 0.1 seconds
          if (pieceDuration > 0.1) {
            const pieceBuffer = audioContext.createBuffer(
              audioBuffer.numberOfChannels,
              pieceEnd - currentPieceStart,
              sampleRate
            );
            
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
              const originalChannelData = audioBuffer.getChannelData(channel);
              const pieceChannelData = pieceBuffer.getChannelData(channel);
              
              for (let j = 0; j < pieceBuffer.length; j++) {
                pieceChannelData[j] = originalChannelData[currentPieceStart + j];
              }
            }
            
            pieces.push(pieceBuffer);
          }
          
          // Start next piece after silence
          currentPieceStart = i;
          silenceStart = null;
          consecutiveSilenceSamples = 0;
        }
      } else {
        silenceStart = null;
        consecutiveSilenceSamples = 0;
      }
    }
    
    // Handle the last piece
    if (currentPieceStart < channelData.length) {
      const pieceDuration = (channelData.length - currentPieceStart) / sampleRate;
      if (pieceDuration > 0.1) {
        const pieceBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          channelData.length - currentPieceStart,
          sampleRate
        );
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const originalChannelData = audioBuffer.getChannelData(channel);
          const pieceChannelData = pieceBuffer.getChannelData(channel);
          
          for (let j = 0; j < pieceBuffer.length; j++) {
            pieceChannelData[j] = originalChannelData[currentPieceStart + j];
          }
        }
        
        pieces.push(pieceBuffer);
      }
    }
    
    return pieces;
  };

  const audioBufferToBlob = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV format
    const length = renderedBuffer.length;
    const numberOfChannels = renderedBuffer.numberOfChannels;
    const sampleRate = renderedBuffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = renderedBuffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const blobToAudioBuffer = async (blob: Blob): Promise<AudioBuffer> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return await audioContext.decodeAudioData(arrayBuffer);
  };

  return {
    startRecording,
    stopRecording,
    toggleRecording,
    ensureMicrophonePermission,
  };
};