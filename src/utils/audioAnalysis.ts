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