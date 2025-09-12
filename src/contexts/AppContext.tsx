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
  exerciseId: number;
  exerciseName: string;
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
}

interface AppState {
  // Exercise state
  currentSetIndex: number;
  currentExerciseIndex: number;
  exerciseSets: ExerciseSet[];
  
  // Recording state
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
  audioStream: MediaStream | null;
  recordedChunks: BlobPart[];
  
  // Auto-splitting state
  currentRecordingSegment: number;
  isAutoSplitting: boolean;
  
  // Audio pieces
  audioPieces: Record<string, AudioPiece[]>;
  currentSessionPieces: Record<string, AudioPiece[]>;
  
  // UI state
  currentView: 'landing' | 'lesson' | 'recap' | 'teacher-dashboard' | 'admin-dashboard';
  sessionActive: boolean;
  
  // Permissions and settings
  microphonePermissionGranted: boolean;
  settings: Settings;
  
  // Shared lesson state
  isSharedSession: boolean;
  sharedExercises: Exercise[];
}

type AppAction = 
  | { type: 'SET_CURRENT_SET_INDEX'; payload: number }
  | { type: 'SET_CURRENT_EXERCISE_INDEX'; payload: number }
  | { type: 'SET_IS_RECORDING'; payload: boolean }
  | { type: 'SET_MEDIA_RECORDER'; payload: MediaRecorder | null }
  | { type: 'SET_AUDIO_STREAM'; payload: MediaStream | null }
  | { type: 'SET_RECORDED_CHUNKS'; payload: BlobPart[] }
  | { type: 'SET_CURRENT_VIEW'; payload: 'landing' | 'lesson' | 'recap' | 'teacher-dashboard' | 'admin-dashboard' }
  | { type: 'SET_SESSION_ACTIVE'; payload: boolean }
  | { type: 'SET_MICROPHONE_PERMISSION'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'ADD_AUDIO_PIECE'; payload: { exerciseKey: string; piece: AudioPiece } }
  | { type: 'REMOVE_AUDIO_PIECE'; payload: { exerciseKey: string; pieceId: string } }
  | { type: 'SET_EXERCISE_SETS'; payload: ExerciseSet[] }
  | { type: 'CLEAR_SESSION_PIECES' }
  | { type: 'SET_SHARED_SESSION'; payload: { isShared: boolean; exercises?: Exercise[] } }
  | { type: 'SET_CURRENT_RECORDING_SEGMENT'; payload: number }
  | { type: 'SET_IS_AUTO_SPLITTING'; payload: boolean };

const defaultExerciseSets: ExerciseSet[] = [
  {
    id: 1,
    name: "Breathing Techniques",
    description: "Essential breathing exercises for vocal foundation",
    color: "#667eea",
    exercises: [
      {
        id: 1,
        name: "Diaphragmatic Breathing",
        instructions: "Place one hand on your chest and one on your stomach. Breathe slowly so that only the lower hand moves. Focus on expanding your diaphragm.",
        duration: "5-10 minutes",
        tips: "Practice daily for improved breath control",
        media: [
          {
            id: "diaphragm-demo-1",
            type: "image",
            url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            altText: "Person demonstrating proper hand placement for diaphragmatic breathing exercise",
            caption: "Correct hand placement: One hand on chest, one on diaphragm"
          },
          {
            id: "diaphragm-demo-2",
            type: "gif",
            url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
            altText: "Animation showing proper diaphragmatic breathing technique",
            caption: "Watch the movement pattern - stomach should expand, chest remains still"
          }
        ]
      },
      {
        id: 2,
        name: "Breath Control",
        instructions: "Inhale for 4 counts, hold for 4 counts, exhale for 8 counts. Gradually increase the duration as you improve.",
        duration: "10 minutes",
        tips: "Maintain consistent airflow during exhalation"
      },
      {
        id: 3,
        name: "Lip Trills",
        instructions: "Keep lips relaxed and let them flutter while exhaling. Start with comfortable pitch and explore your range.",
        duration: "5-8 minutes",
        tips: "Should feel like a gentle massage for your vocal cords"
      }
    ]
  },
  {
    id: 2,
    name: "Vocal Warm-ups",
    description: "Gentle exercises to prepare your voice",
    color: "#f093fb",
    exercises: [
      {
        id: 4,
        name: "Humming",
        instructions: "Hum gently with mouth closed, feeling vibrations in your face and chest. Start low and gradually go higher.",
        duration: "5 minutes",
        tips: "Keep jaw relaxed and tongue resting at bottom of mouth",
        media: [
          {
            id: "humming-demo-1",
            type: "video",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            altText: "Video demonstration of proper humming technique for vocal warm-up",
            caption: "Notice how the mouth stays closed and vibrations are felt throughout the face",
            thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videoType: "youtube"
          }
        ]
      },
      {
        id: 5,
        name: "Sirens",
        instructions: "Make a 'ng' sound (like 'sing') and glide from your lowest to highest note like a siren.",
        duration: "5-10 minutes",
        tips: "Smooth, connected sound throughout your range"
      },
      {
        id: 6,
        name: "Vowel Sounds",
        instructions: "Practice pure vowel sounds: Ah, Eh, Ee, Oh, Oo. Keep them clear and consistent.",
        duration: "8-12 minutes",
        tips: "Focus on consistent tongue and jaw position for each vowel"
      }
    ]
  },
  {
    id: 3,
    name: "Pitch & Intervals",
    description: "Develop accuracy in pitch and interval recognition",
    color: "#4facfe",
    exercises: [
      {
        id: 7,
        name: "Scale Practice",
        instructions: "Sing major scales using 'do-re-mi-fa-sol-la-ti-do'. Start in comfortable key and move up/down by semitones.",
        duration: "10-15 minutes",
        tips: "Use piano or app for reference pitch",
        media: [
          {
            id: "scale-practice-1",
            type: "image",
            url: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            altText: "Piano keyboard showing major scale pattern with do-re-mi labels",
            caption: "Major scale pattern: Do-Re-Mi-Fa-Sol-La-Ti-Do"
          },
          {
            id: "scale-practice-2",
            type: "image",
            url: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            altText: "Musical staff notation showing C major scale with solfege syllables",
            caption: "C Major scale notation with solfege syllables"
          }
        ]
      },
      {
        id: 8,
        name: "Interval Training",
        instructions: "Practice singing perfect 5ths, 4ths, and octaves. Use sol-fege syllables for better pitch recognition.",
        duration: "10-15 minutes",
        tips: "Start with easier intervals and gradually add more challenging ones"
      },
      {
        id: 9,
        name: "Chromatic Scales",
        instructions: "Sing chromatic scales (every semitone) slowly and accurately. Focus on smooth transitions between notes.",
        duration: "8-10 minutes",
        tips: "Use consistent vowel sound throughout the scale"
      }
    ]
  }
];

const initialState: AppState = {
  currentSetIndex: 0,
  currentExerciseIndex: 0,
  exerciseSets: defaultExerciseSets,
  isRecording: false,
  mediaRecorder: null,
  audioStream: null,
  recordedChunks: [],
  
  // Auto-splitting state
  currentRecordingSegment: 1,
  isAutoSplitting: false,
  audioPieces: {},
  currentSessionPieces: {},
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
    minRecordingLength: 0.5
  },
  isSharedSession: false,
  sharedExercises: []
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_SET_INDEX':
      return { ...state, currentSetIndex: action.payload };
    case 'SET_CURRENT_EXERCISE_INDEX':
      return { ...state, currentExerciseIndex: action.payload };
    case 'SET_IS_RECORDING':
      return { ...state, isRecording: action.payload };
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
    case 'ADD_AUDIO_PIECE':
      const { exerciseKey, piece } = action.payload;
      return {
        ...state,
        audioPieces: {
          ...state.audioPieces,
          [exerciseKey]: [...(state.audioPieces[exerciseKey] || []), piece]
        },
        currentSessionPieces: {
          ...state.currentSessionPieces,
          [exerciseKey]: [...(state.currentSessionPieces[exerciseKey] || []), piece]
        }
      };
    case 'REMOVE_AUDIO_PIECE':
      const { exerciseKey: removeKey, pieceId } = action.payload;
      return {
        ...state,
        audioPieces: {
          ...state.audioPieces,
          [removeKey]: state.audioPieces[removeKey]?.filter(p => p.id !== pieceId) || []
        },
        currentSessionPieces: {
          ...state.currentSessionPieces,
          [removeKey]: state.currentSessionPieces[removeKey]?.filter(p => p.id !== pieceId) || []
        }
      };
    case 'SET_EXERCISE_SETS':
      return { ...state, exerciseSets: action.payload };
    case 'CLEAR_SESSION_PIECES':
      return { ...state, currentSessionPieces: {} };
    case 'SET_SHARED_SESSION':
      return {
        ...state,
        isSharedSession: action.payload.isShared,
        sharedExercises: action.payload.exercises || []
      };
    case 'SET_CURRENT_RECORDING_SEGMENT':
      return { ...state, currentRecordingSegment: action.payload };
    case 'SET_IS_AUTO_SPLITTING':
      return { ...state, isAutoSplitting: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Computed values
  getCurrentExercises: () => Exercise[];
  getCurrentSet: () => ExerciseSet | null;
  getCurrentExercise: () => Exercise | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const getCurrentExercises = (): Exercise[] => {
    if (state.isSharedSession) {
      return state.sharedExercises;
    }
    
    if (state.currentSetIndex >= 0 && state.currentSetIndex < state.exerciseSets.length) {
      return state.exerciseSets[state.currentSetIndex].exercises;
    }
    return [];
  };

  const getCurrentSet = (): ExerciseSet | null => {
    if (state.currentSetIndex >= 0 && state.currentSetIndex < state.exerciseSets.length) {
      return state.exerciseSets[state.currentSetIndex];
    }
    return null;
  };

  const getCurrentExercise = (): Exercise | null => {
    const exercises = getCurrentExercises();
    if (state.currentExerciseIndex >= 0 && state.currentExerciseIndex < exercises.length) {
      return exercises[state.currentExerciseIndex];
    }
    return null;
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    getCurrentExercises,
    getCurrentSet,
    getCurrentExercise,
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