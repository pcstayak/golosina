'use client'

import { useApp } from '@/contexts/AppContext';
import { useNotification } from './useNotification';
import { useCallback, useRef, useState } from 'react';
import type { AudioPiece } from '@/contexts/AppContext';
import { useRealTimeSilenceDetection } from './useRealTimeSilenceDetection';

export const useAudioRecording = () => {
  const { state, dispatch, getCurrentExercises, getCurrentSet } = useApp();
  const { showSuccess, showError, showWarning } = useNotification();
  
  // Auto-splitting state
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const currentRecorderRef = useRef<MediaRecorder | null>(null);
  const currentChunksRef = useRef<BlobPart[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Auto-splitting callbacks
  const handleSilenceDetected = useCallback(() => {
    if (!state.isRecording || !state.settings.autoSplitEnabled) return;
    
    console.log('🔇 Silence detected - auto-splitting recording');
    dispatch({ type: 'SET_IS_AUTO_SPLITTING', payload: true });
    
    // Finish current segment
    if (currentRecorderRef.current && currentRecorderRef.current.state === 'recording') {
      currentRecorderRef.current.stop();
    }
  }, [state.isRecording, state.settings.autoSplitEnabled, dispatch]);

  const handleSpeechDetected = useCallback(() => {
    if (state.isAutoSplitting) {
      dispatch({ type: 'SET_IS_AUTO_SPLITTING', payload: false });
    }
  }, [state.isAutoSplitting, dispatch]);

  const handleAudioLevelUpdate = useCallback((level: number) => {
    setCurrentAudioLevel(level);
  }, []);

  // Silence detection configuration
  const silenceConfig = {
    threshold: state.settings.autoSplitThreshold,
    duration: state.settings.autoSplitDuration,
    minRecordingLength: state.settings.minRecordingLength,
    enabled: state.settings.autoSplitEnabled && state.isRecording,
    onSilenceDetected: handleSilenceDetected,
    onSpeechDetected: handleSpeechDetected,
    onAudioLevelUpdate: handleAudioLevelUpdate
  };

  // Initialize silence detection
  const silenceDetection = useRealTimeSilenceDetection(state.audioStream, silenceConfig);

  // Helper function to start a new recording segment
  const startNewRecordingSegment = useCallback(async (stream: MediaStream) => {
    // Increment segment counter
    const newSegment = state.isRecording ? state.currentRecordingSegment + 1 : 1;
    dispatch({ type: 'SET_CURRENT_RECORDING_SEGMENT', payload: newSegment });

    // Mobile device detection for codec selection
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let mediaRecorderOptions: MediaRecorderOptions = {};
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
    currentRecorderRef.current = recorder;
    currentChunksRef.current = [];
    recordingStartTimeRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        currentChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (recordingStartTimeRef.current) {
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        processRecordingSegment(currentChunksRef.current, duration, newSegment);
      }

      // Start new segment if auto-splitting and still recording
      if (state.isRecording && state.settings.autoSplitEnabled && state.isAutoSplitting) {
        setTimeout(() => {
          if (state.isRecording) {
            startNewRecordingSegment(stream);
          }
        }, 100); // Small delay to ensure smooth transition
      }
    };

    recorder.onerror = (event: any) => {
      console.error('🚨 MediaRecorder error:', event.error);
      showError('Recording error: ' + event.error.message);
    };

    recorder.start(100);
    console.log(`🎤 Recording segment ${newSegment} started`);
  }, [state.isRecording, state.currentRecordingSegment, state.settings.autoSplitEnabled, state.isAutoSplitting, dispatch, showError]);

  // Process a completed recording segment
  const processRecordingSegment = useCallback(async (chunks: BlobPart[], duration: number, segmentNumber: number) => {
    if (chunks.length === 0) {
      console.warn('No audio data recorded for segment', segmentNumber);
      return;
    }

    // Check minimum recording length
    if (duration < state.settings.minRecordingLength) {
      console.log(`Segment ${segmentNumber} too short (${duration.toFixed(1)}s), skipping`);
      return;
    }

    try {
      const audioBlob = new Blob(chunks, { 
        type: chunks.length > 0 && chunks[0] instanceof Blob ? (chunks[0] as Blob).type : 'audio/webm'
      });

      if (audioBlob.size === 0) {
        console.warn('Empty audio blob for segment', segmentNumber);
        return;
      }

      const currentExercise = getCurrentExercises()[state.currentExerciseIndex];
      if (!currentExercise) {
        console.error('No current exercise found');
        return;
      }

      const exerciseKey = `${getCurrentSet()?.id || 'shared'}_${currentExercise.id}`;
      const pieceId = `${Date.now()}_seg${segmentNumber}`;
      const timestamp = new Date().toISOString();

      const pieceData: AudioPiece = {
        id: pieceId,
        blob: audioBlob,
        timestamp: timestamp,
        duration: duration,
        exerciseId: currentExercise.id,
        exerciseName: `${currentExercise.name} (Segment ${segmentNumber})`
      };

      dispatch({ type: 'ADD_AUDIO_PIECE', payload: { exerciseKey, piece: pieceData } });

      const message = state.settings.autoSplitEnabled ? 
        `Segment ${segmentNumber} saved! (${duration.toFixed(1)}s)` :
        `Recording saved! (${duration.toFixed(1)}s)`;
      
      showSuccess(message);

    } catch (error: any) {
      console.error('Error processing recording segment:', error);
      showError('Error processing recording: ' + error.message);
    }
  }, [state.settings.minRecordingLength, state.settings.autoSplitEnabled, state.currentExerciseIndex, dispatch, getCurrentExercises, getCurrentSet, showError, showSuccess]);

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
      
      // Get microphone stream
      const stream = await ensureMicrophonePermission();
      
      // Reset segment counter for new recording session
      dispatch({ type: 'SET_CURRENT_RECORDING_SEGMENT', payload: 1 });
      dispatch({ type: 'SET_IS_AUTO_SPLITTING', payload: false });
      dispatch({ type: 'SET_IS_RECORDING', payload: true });
      
      // Start first recording segment
      await startNewRecordingSegment(stream);
      
      console.log('🎤 Recording is now active with auto-splitting support!');
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
  }, [dispatch, ensureMicrophonePermission, startNewRecordingSegment, showError]);

  const stopRecording = useCallback(() => {
    if (state.isRecording) {
      console.log('⏹ Stopping recording...');
      
      // Stop current recording segment
      if (currentRecorderRef.current && currentRecorderRef.current.state === 'recording') {
        currentRecorderRef.current.stop();
      }
      
      // Update recording state
      dispatch({ type: 'SET_IS_RECORDING', payload: false });
      dispatch({ type: 'SET_IS_AUTO_SPLITTING', payload: false });
      dispatch({ type: 'SET_CURRENT_RECORDING_SEGMENT', payload: 1 });
      
      // Reset refs
      currentRecorderRef.current = null;
      currentChunksRef.current = [];
      recordingStartTimeRef.current = null;
      setCurrentAudioLevel(0);
    }
  }, [state.isRecording, dispatch]);

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
    // Auto-splitting data
    currentAudioLevel,
    silenceDetection,
  };
};