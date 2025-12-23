'use client'

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface MediaContent {
  id: string;
  type: 'image' | 'gif' | 'video';
  url: string;
  altText: string;
  caption?: string;
  thumbnailUrl?: string; // For videos
  videoType?: 'local' | 'youtube'; // Distinguish between local and YouTube videos
}

export interface Exercise {
  id: number;
  name: string;
  instructions: string;
  duration?: string;
  tips?: string;
  media?: MediaContent[];
}

export interface ExerciseSet {
  id: number;
  name: string;
  description: string;
  color: string;
  exercises: Exercise[];
}

export interface AudioPiece {
  id: string;
  blob: Blob;
  timestamp: string;
  duration: number;
  exerciseId: string | number | null;
  exerciseName: string;
  customTitle?: string;
}

export interface FreehandVideo {
  id?: string;
  video_url: string;
  video_platform: 'youtube' | 'vimeo' | 'audio' | 'other';
  embed_id: string;
  description?: string;
  display_order: number;
}

export interface Settings {
  microphoneId: string;
  sampleRate: number;
  silenceThreshold: number;
  silenceDuration: number;
  // Auto-splitting settings
  autoSplitEnabled: boolean;
  autoSplitThreshold: number;
  autoSplitDuration: number;
  minRecordingLength: number;
  dropSilentRecordings: boolean;
  // Edge trimming settings
  trimSilenceFromEdges: boolean;
  maxEdgeSilence: number;
  // Recording UI settings
  recordingDebugMode: boolean;
}

interface AppState {
  // Recording state
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
  audioStream: MediaStream | null;
  recordedChunks: BlobPart[];
  recordingStartTime: number | null;

  // Auto-splitting state
  currentRecordingSegment: number;
  isAutoSplitting: boolean;

  // Audio pieces
  audioPieces: Record<string, AudioPiece[]>;
  currentPracticePieces: Record<string, AudioPiece[]>;

  // UI state
  currentView: 'landing' | 'settings' | 'practice' | 'admin-dashboard' | 'teacher-dashboard' | 'lesson' | 'recap';
  sessionActive: boolean;

  // Permissions and settings
  microphonePermissionGranted: boolean;
  settings: Settings;

  // Current practice state
  currentLessonId: string | null;
  currentAssignmentId: string | null;
  currentPracticeId: string | null;
  currentStepId: string | null;
  currentStepIndex: number;
}

type AppAction =
  | { type: 'SET_IS_RECORDING'; payload: boolean }
  | { type: 'SET_RECORDING_START_TIME'; payload: number | null }
  | { type: 'SET_MEDIA_RECORDER'; payload: MediaRecorder | null }
  | { type: 'SET_AUDIO_STREAM'; payload: MediaStream | null }
  | { type: 'SET_RECORDED_CHUNKS'; payload: BlobPart[] }
  | { type: 'SET_CURRENT_VIEW'; payload: 'landing' | 'settings' | 'practice' | 'admin-dashboard' | 'teacher-dashboard' | 'lesson' | 'recap' }
  | { type: 'SET_SESSION_ACTIVE'; payload: boolean }
  | { type: 'SET_MICROPHONE_PERMISSION'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'UPDATE_RECORDING_SETTINGS'; payload: { autoSplitEnabled?: boolean; autoSplitThreshold?: number; autoSplitDuration?: number; minRecordingLength?: number; dropSilentRecordings?: boolean; trimSilenceFromEdges?: boolean; maxEdgeSilence?: number } }
  | { type: 'ADD_AUDIO_PIECE'; payload: { stepId: string; piece: AudioPiece } }
  | { type: 'REMOVE_AUDIO_PIECE'; payload: { stepId: string; pieceId: string } }
  | { type: 'REPLACE_AUDIO_PIECE'; payload: { stepId: string; pieceId: string; piece: AudioPiece } }
  | { type: 'UPDATE_AUDIO_PIECE_TITLE'; payload: { stepId: string; pieceId: string; title: string } }
  | { type: 'CLEAR_PRACTICE_PIECES' }
  | { type: 'SET_CURRENT_RECORDING_SEGMENT'; payload: number }
  | { type: 'SET_IS_AUTO_SPLITTING'; payload: boolean }
  | { type: 'SET_CURRENT_LESSON_ID'; payload: string | null }
  | { type: 'SET_CURRENT_ASSIGNMENT_ID'; payload: string | null }
  | { type: 'SET_CURRENT_PRACTICE_ID'; payload: string | null }
  | { type: 'SET_CURRENT_STEP_ID'; payload: string | null }
  | { type: 'SET_CURRENT_STEP_INDEX'; payload: number }
  | { type: 'SET_CURRENT_STEP'; payload: { stepId: string; stepIndex: number } };

const initialState: AppState = {
  isRecording: false,
  mediaRecorder: null,
  audioStream: null,
  recordedChunks: [],
  recordingStartTime: null,

  // Auto-splitting state
  currentRecordingSegment: 1,
  isAutoSplitting: false,
  audioPieces: {},
  currentPracticePieces: {},
  currentView: 'landing',
  sessionActive: false,
  microphonePermissionGranted: false,
  settings: {
    microphoneId: '',
    sampleRate: 44100,
    silenceThreshold: 0.01,
    silenceDuration: 0.5,
    // Auto-splitting defaults
    autoSplitEnabled: true,
    autoSplitThreshold: 0.02,
    autoSplitDuration: 1.0,
    minRecordingLength: 3.0,
    dropSilentRecordings: true,
    // Edge trimming defaults
    trimSilenceFromEdges: true,
    maxEdgeSilence: 2.0,
    // Recording UI defaults
    recordingDebugMode: false
  },

  // Current practice state
  currentLessonId: null,
  currentAssignmentId: null,
  currentPracticeId: null,
  currentStepId: null,
  currentStepIndex: 0
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_IS_RECORDING':
      return { ...state, isRecording: action.payload };
    case 'SET_RECORDING_START_TIME':
      return { ...state, recordingStartTime: action.payload };
    case 'SET_MEDIA_RECORDER':
      return { ...state, mediaRecorder: action.payload };
    case 'SET_AUDIO_STREAM':
      return { ...state, audioStream: action.payload };
    case 'SET_RECORDED_CHUNKS':
      return { ...state, recordedChunks: action.payload };
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SESSION_ACTIVE':
      return { ...state, sessionActive: action.payload };
    case 'SET_MICROPHONE_PERMISSION':
      return { ...state, microphonePermissionGranted: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_RECORDING_SETTINGS':
      const updatedSettings = { ...state.settings, ...action.payload };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('recording-settings', JSON.stringify({
            autoSplitEnabled: updatedSettings.autoSplitEnabled,
            autoSplitThreshold: updatedSettings.autoSplitThreshold,
            autoSplitDuration: updatedSettings.autoSplitDuration,
            minRecordingLength: updatedSettings.minRecordingLength,
            dropSilentRecordings: updatedSettings.dropSilentRecordings,
            trimSilenceFromEdges: updatedSettings.trimSilenceFromEdges,
            maxEdgeSilence: updatedSettings.maxEdgeSilence
          }));
        } catch (error) {
          console.error('Failed to save recording settings to localStorage:', error);
        }
      }
      return { ...state, settings: updatedSettings };
    case 'ADD_AUDIO_PIECE':
      const { stepId, piece } = action.payload;
      return {
        ...state,
        audioPieces: {
          ...state.audioPieces,
          [stepId]: [...(state.audioPieces[stepId] || []), piece]
        },
        currentPracticePieces: {
          ...state.currentPracticePieces,
          [stepId]: [...(state.currentPracticePieces[stepId] || []), piece]
        }
      };
    case 'REMOVE_AUDIO_PIECE':
      const { stepId: removeKey, pieceId } = action.payload;
      return {
        ...state,
        audioPieces: {
          ...state.audioPieces,
          [removeKey]: state.audioPieces[removeKey]?.filter(p => p.id !== pieceId) || []
        },
        currentPracticePieces: {
          ...state.currentPracticePieces,
          [removeKey]: state.currentPracticePieces[removeKey]?.filter(p => p.id !== pieceId) || []
        }
      };
    case 'REPLACE_AUDIO_PIECE':
      const { stepId: replaceKey, pieceId: replacePieceId, piece: replacePiece } = action.payload;
      return {
        ...state,
        audioPieces: {
          ...state.audioPieces,
          [replaceKey]: state.audioPieces[replaceKey]?.map(p =>
            p.id === replacePieceId ? replacePiece : p
          ) || []
        },
        currentPracticePieces: {
          ...state.currentPracticePieces,
          [replaceKey]: state.currentPracticePieces[replaceKey]?.map(p =>
            p.id === replacePieceId ? replacePiece : p
          ) || []
        }
      };
    case 'UPDATE_AUDIO_PIECE_TITLE':
      const { stepId: updateKey, pieceId: updatePieceId, title } = action.payload;
      return {
        ...state,
        audioPieces: {
          ...state.audioPieces,
          [updateKey]: state.audioPieces[updateKey]?.map(p =>
            p.id === updatePieceId ? { ...p, customTitle: title } : p
          ) || []
        },
        currentPracticePieces: {
          ...state.currentPracticePieces,
          [updateKey]: state.currentPracticePieces[updateKey]?.map(p =>
            p.id === updatePieceId ? { ...p, customTitle: title } : p
          ) || []
        }
      };
    case 'CLEAR_PRACTICE_PIECES':
      return { ...state, currentPracticePieces: {} };
    case 'SET_CURRENT_RECORDING_SEGMENT':
      return { ...state, currentRecordingSegment: action.payload };
    case 'SET_IS_AUTO_SPLITTING':
      return { ...state, isAutoSplitting: action.payload };
    case 'SET_CURRENT_LESSON_ID':
      return { ...state, currentLessonId: action.payload };
    case 'SET_CURRENT_ASSIGNMENT_ID':
      return { ...state, currentAssignmentId: action.payload };
    case 'SET_CURRENT_PRACTICE_ID':
      return { ...state, currentPracticeId: action.payload };
    case 'SET_CURRENT_STEP_ID':
      return { ...state, currentStepId: action.payload };
    case 'SET_CURRENT_STEP_INDEX':
      return { ...state, currentStepIndex: action.payload };
    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStepId: action.payload.stepId,
        currentStepIndex: action.payload.stepIndex,
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadRecordingSettings(): Partial<Settings> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem('recording-settings');
    if (stored) {
      const settings = JSON.parse(stored);
      return {
        autoSplitEnabled: settings.autoSplitEnabled ?? true,
        autoSplitThreshold: settings.autoSplitThreshold ?? 0.02,
        autoSplitDuration: settings.autoSplitDuration ?? 1.0,
        minRecordingLength: settings.minRecordingLength ?? 3.0,
        dropSilentRecordings: settings.dropSilentRecordings ?? true,
        trimSilenceFromEdges: settings.trimSilenceFromEdges ?? true,
        maxEdgeSilence: settings.maxEdgeSilence ?? 2.0
      };
    }
  } catch (error) {
    console.error('Failed to load recording settings from localStorage:', error);
  }

  return {};
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    settings: {
      ...initialState.settings,
      ...loadRecordingSettings()
    }
  });

  const contextValue: AppContextType = {
    state,
    dispatch,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}