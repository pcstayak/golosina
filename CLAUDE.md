# CLAUDE.md

## Claude Agent Usage Policy

Claude acts solely as an orchestrator and coordinator. It must **never** write code, implement features, or directly create tasks in GitHub. All implementation, coding, and building activities are delegated to the `developer` agent. Creation of new tasks or issues in GitHub is the responsibility of the `business-analyst-requirements` agent. Claude's role is limited to orchestrating communication and workflow between these agents, ensuring that all technical and project management actions are performed by the appropriate specialized agents.

## Development Commands

- **Development server**: `npm run dev` - Start Next.js development server on http://localhost:3000 (NEVER auto-start - user manages this)
- **Build**: `npm run build` - Build production version
- **Start production**: `npm start` - Run production build  
- **Lint**: `npm run lint` - Run ESLint checks

## Important Development Rules

- **NEVER automatically start `npm run dev`** - The user manages the development server themselves
- Only suggest running development commands when explicitly requested by the user
- Always kill/stop running development servers when asked by the user

## Project Architecture

Golosina is a Next.js 14 voice training application with real-time audio processing capabilities.

### Core Architecture

**State Management**: Centralized React Context (`src/contexts/AppContext.tsx`) managing:
- Exercise sets and current progress
- Audio recording state and auto-splitting
- Settings and microphone permissions
- Shared lesson functionality

**Audio System**: Built around `useAudioRecording` hook (`src/hooks/useAudioRecording.ts`) featuring:
- Real-time silence detection with automatic audio splitting
- Cross-platform MediaRecorder support (WebM/MP4/WAV)
- Mobile-specific audio handling for iOS/Android
- Configurable silence thresholds and recording parameters

### Key Components Structure

```
src/
├── contexts/AppContext.tsx     # Central state management
├── hooks/
│   ├── useAudioRecording.ts    # Core audio recording logic
│   ├── useRealTimeSilenceDetection.ts  # Silence detection
│   └── usePersistence.ts       # LocalStorage persistence
├── components/
│   ├── lesson/                 # Lesson-specific UI components
│   ├── modals/                 # Settings, sharing modals
│   └── pages/                  # Main page components
└── services/
    └── sharedLessonService.ts  # Supabase integration
```

### Exercise System

Exercise sets are defined in `AppContext.tsx` with structure:
```typescript
{
  id: number,
  name: string, 
  description: string,
  color: string,      // CSS theming color
  exercises: Exercise[]
}
```

Default sets: Breathing Techniques, Vocal Warm-ups, Pitch & Intervals

### Audio Recording Features

**Auto-splitting**: Configurable silence detection automatically splits recordings into segments during practice sessions.

**Cross-platform Support**: Handles different audio codecs and constraints for desktop vs mobile browsers.

**HTTPS Requirement**: Mobile browsers require HTTPS for microphone access (except localhost).

### Database Integration

Uses Supabase for shared lesson functionality with tables:
- `shared_lessons`: Store shared exercise sessions
- `recording_comments`: Comments on recordings

Connection configured in `src/lib/supabase.ts`.

### Settings Configuration

Audio settings managed through context include:
- Sample rate (8kHz-48kHz)
- Silence threshold and duration for auto-splitting
- Microphone device selection
- Minimum recording length filters

### Mobile Considerations

- Touch-friendly UI with large interaction targets
- iOS Safari audio context handling
- Graceful permission request flows
- Offline capability for core recording features