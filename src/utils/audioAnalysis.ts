/**
 * Audio analysis utilities for generating waveform data and processing audio blobs
 */

export interface WaveformData {
  samples: number[];
  duration: number;
  sampleRate: number;
}

/**
 * Analyzes an audio blob and generates waveform data
 * @param blob - The audio blob to analyze
 * @param targetSamples - Number of waveform samples to generate (default: 100)
 * @returns Promise resolving to waveform data
 */
export async function analyzeAudioBlob(blob: Blob, targetSamples: number = 100): Promise<WaveformData> {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get channel data (use first channel if stereo)
    const channelData = audioBuffer.getChannelData(0);
    const samples = channelData.length;
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;

    // Calculate samples per chunk for downsampling
    const samplesPerChunk = Math.floor(samples / targetSamples);
    const waveformSamples: number[] = [];

    // Generate waveform by taking RMS (Root Mean Square) of chunks
    for (let i = 0; i < targetSamples; i++) {
      const start = i * samplesPerChunk;
      const end = Math.min(start + samplesPerChunk, samples);

      let sum = 0;
      let count = 0;

      // Calculate RMS for this chunk
      for (let j = start; j < end; j++) {
        sum += channelData[j] * channelData[j];
        count++;
      }

      const rms = count > 0 ? Math.sqrt(sum / count) : 0;
      waveformSamples.push(rms);
    }

    // Normalize samples to 0-1 range
    const maxSample = Math.max(...waveformSamples);
    const normalizedSamples = maxSample > 0
      ? waveformSamples.map(sample => sample / maxSample)
      : waveformSamples;

    // Close audio context to free resources
    await audioContext.close();

    return {
      samples: normalizedSamples,
      duration,
      sampleRate
    };
  } catch (error) {
    console.error('Error analyzing audio blob:', error);

    // Return fallback waveform data
    return {
      samples: Array(targetSamples).fill(0.1), // Small uniform waveform
      duration: 0,
      sampleRate: 44100
    };
  }
}

/**
 * Formats time in seconds to MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculates the time position based on click position and element width
 * @param clickX - X coordinate of click relative to element
 * @param elementWidth - Width of the clickable element
 * @param duration - Total duration of audio
 * @returns Time position in seconds
 */
export function calculateSeekTime(clickX: number, elementWidth: number, duration: number): number {
  const ratio = Math.max(0, Math.min(1, clickX / elementWidth));
  return ratio * duration;
}

/**
 * Checks if an audio blob contains only silence
 * @param blob - The audio blob to analyze
 * @param silenceThreshold - Amplitude threshold below which is considered silence (default: 0.02)
 * @param silencePercentage - Percentage of samples that must be below threshold to consider recording silent (default: 0.95)
 * @returns Promise resolving to true if the audio is all silence, false otherwise
 */
export async function isAudioSilent(
  blob: Blob,
  silenceThreshold: number = 0.02,
  silencePercentage: number = 0.95
): Promise<boolean> {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get channel data (use first channel if stereo)
    const channelData = audioBuffer.getChannelData(0);
    const samples = channelData.length;

    // Count samples below silence threshold
    let silentSamples = 0;
    let totalAmplitude = 0;

    for (let i = 0; i < samples; i++) {
      const amplitude = Math.abs(channelData[i]);
      totalAmplitude += amplitude;

      if (amplitude < silenceThreshold) {
        silentSamples++;
      }
    }

    // Calculate average amplitude
    const averageAmplitude = totalAmplitude / samples;

    // Close audio context to free resources
    await audioContext.close();

    // Recording is considered silent if:
    // 1. Average amplitude is very low OR
    // 2. More than silencePercentage of samples are below threshold
    const isSilentByAverage = averageAmplitude < silenceThreshold;
    const isSilentByPercentage = (silentSamples / samples) > silencePercentage;

    return isSilentByAverage || isSilentByPercentage;
  } catch (error) {
    console.error('Error checking if audio is silent:', error);
    // If we can't analyze the audio, assume it's not silent (keep the recording)
    return false;
  }
}

/**
 * Trims silence from the beginning and end of an audio blob
 * @param blob - The audio blob to trim
 * @param silenceThreshold - Amplitude threshold below which is considered silence (default: 0.02)
 * @param maxEdgeSilence - Maximum silence duration to keep at each edge in seconds (default: 2.0)
 * @returns Promise resolving to a new trimmed audio blob
 */
export async function trimSilenceFromEdges(
  blob: Blob,
  silenceThreshold: number = 0.02,
  maxEdgeSilence: number = 2.0
): Promise<Blob> {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get channel data (use first channel if stereo)
    const channelData = audioBuffer.getChannelData(0);
    const samples = channelData.length;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;

    // Find first non-silent sample from start
    let firstNonSilentSample = 0;
    for (let i = 0; i < samples; i++) {
      const amplitude = Math.abs(channelData[i]);
      if (amplitude >= silenceThreshold) {
        firstNonSilentSample = i;
        break;
      }
    }

    // Find last non-silent sample from end
    let lastNonSilentSample = samples - 1;
    for (let i = samples - 1; i >= 0; i--) {
      const amplitude = Math.abs(channelData[i]);
      if (amplitude >= silenceThreshold) {
        lastNonSilentSample = i;
        break;
      }
    }

    // Calculate how much silence to keep at each edge (in samples)
    const maxEdgeSilenceSamples = Math.floor(maxEdgeSilence * sampleRate);

    // Calculate start sample: keep maxEdgeSilence before first non-silent sample
    const startSample = Math.max(0, firstNonSilentSample - maxEdgeSilenceSamples);

    // Calculate end sample: keep maxEdgeSilence after last non-silent sample
    const endSample = Math.min(samples, lastNonSilentSample + maxEdgeSilenceSamples + 1);

    // If entire audio is silent or trimming would result in invalid range, return original blob
    if (startSample >= endSample || firstNonSilentSample >= lastNonSilentSample) {
      await audioContext.close();
      return blob;
    }

    // Create new audio buffer with trimmed length
    const trimmedLength = endSample - startSample;
    const trimmedBuffer = audioContext.createBuffer(
      numberOfChannels,
      trimmedLength,
      sampleRate
    );

    // Copy audio data for all channels
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalChannelData = audioBuffer.getChannelData(channel);
      const trimmedChannelData = trimmedBuffer.getChannelData(channel);

      for (let i = 0; i < trimmedLength; i++) {
        trimmedChannelData[i] = originalChannelData[startSample + i];
      }
    }

    // Convert trimmed audio buffer back to blob
    const trimmedBlob = await audioBufferToBlob(trimmedBuffer, audioContext, blob.type);

    // Close audio context
    await audioContext.close();

    console.log(`Trimmed audio from ${audioBuffer.duration.toFixed(2)}s to ${trimmedBuffer.duration.toFixed(2)}s`);

    return trimmedBlob;
  } catch (error) {
    console.error('Error trimming silence from edges:', error);
    // If we can't trim the audio, return the original blob
    return blob;
  }
}

/**
 * Converts an AudioBuffer to a Blob
 * @param audioBuffer - The audio buffer to convert
 * @param audioContext - The audio context
 * @param mimeType - The desired MIME type for the blob
 * @returns Promise resolving to an audio blob
 */
async function audioBufferToBlob(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext,
  mimeType: string
): Promise<Blob> {
  // For WAV format, we can encode directly
  if (mimeType.includes('wav')) {
    return audioBufferToWavBlob(audioBuffer);
  }

  // For other formats, try using MediaRecorder if supported
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
    try {
      return await audioBufferToBlobUsingMediaRecorder(audioBuffer, mimeType);
    } catch (error) {
      console.warn('Failed to use MediaRecorder for conversion, falling back to WAV:', error);
    }
  }

  // Fallback to WAV
  return audioBufferToWavBlob(audioBuffer);
}

/**
 * Converts an AudioBuffer to a WAV Blob
 * @param audioBuffer - The audio buffer to convert
 * @returns Promise resolving to a WAV audio blob
 */
async function audioBufferToWavBlob(audioBuffer: AudioBuffer): Promise<Blob> {
  const length = audioBuffer.length;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
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
      const sample = audioBuffer.getChannelData(channel)[i];
      const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Converts an AudioBuffer to a Blob using MediaRecorder
 * @param audioBuffer - The audio buffer to convert
 * @param mimeType - The desired MIME type
 * @returns Promise resolving to an audio blob
 */
async function audioBufferToBlobUsingMediaRecorder(
  audioBuffer: AudioBuffer,
  mimeType: string
): Promise<Blob> {
  // Create a new audio context for playback
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const destination = audioContext.createMediaStreamDestination();

  // Create a buffer source
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(destination);

  // Set up MediaRecorder
  const mediaRecorder = new MediaRecorder(destination.stream, { mimeType });
  const chunks: BlobPart[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      audioContext.close();
      resolve(blob);
    };

    mediaRecorder.onerror = (error) => {
      audioContext.close();
      reject(error);
    };

    // Start recording and playback
    mediaRecorder.start();
    source.start();

    // Stop recording when audio buffer finishes playing
    setTimeout(() => {
      mediaRecorder.stop();
    }, (audioBuffer.duration * 1000) + 100);
  });
}