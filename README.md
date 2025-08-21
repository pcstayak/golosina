# 🎵 Golosina - Voice Training Assistant

A modern Next.js application for voice training with real-time audio processing, built with React, TypeScript, and Tailwind CSS.

## ✨ Features

- **🎤 Real-time Audio Recording**: Advanced microphone recording with silence detection
- **✂️ Smart Audio Splitting**: Automatically splits recordings by silence
- **📊 Progress Tracking**: Track your progress across different exercise sets
- **🎯 Exercise Management**: Pre-built vocal exercises for breathing, warm-ups, and pitch training
- **⚙️ Customizable Settings**: Adjust recording parameters and audio settings
- **📱 Mobile Friendly**: Responsive design that works on all devices
- **🔄 State Persistence**: Automatically saves your progress and settings

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js 13+ app directory
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── lesson/          # Lesson-specific components
│   ├── modals/          # Modal components
│   ├── pages/           # Page components
│   └── ui/              # Reusable UI components
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
└── lib/                 # Utility functions
```

## 🎯 Key Components

### State Management
- **AppContext**: Centralized state management using React Context
- **Zustand**: Lightweight state management for notifications

### Audio Processing
- **useAudioRecording**: Custom hook handling all audio recording logic
- **Real-time Processing**: Splits audio by silence detection
- **Cross-browser Support**: Works on desktop and mobile browsers

### UI Components
- **Responsive Design**: Built with Tailwind CSS
- **Modern Interface**: Clean, professional design
- **Accessibility**: ARIA compliant components

## 🛠️ Technologies Used

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + Zustand
- **Icons**: Lucide React
- **Audio Processing**: Web Audio API
- **Build Tool**: Next.js built-in tooling

## ⚙️ Configuration

### Audio Settings
- **Sample Rate**: Configurable from 8kHz to 48kHz
- **Silence Threshold**: Adjustable sensitivity for speech detection
- **Silence Duration**: Customizable pause length for audio splitting

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

**Note**: HTTPS is required for microphone access on mobile devices.

## 🔧 Development

### Key Features Implemented

1. **Modular Architecture**
   - Separated concerns with custom hooks
   - Reusable UI components
   - Type-safe with TypeScript

2. **Audio Recording System**
   - Real-time microphone access
   - Automatic audio splitting
   - Multiple format support (WebM, MP4, WAV)

3. **Exercise Management**
   - Pre-built exercise sets
   - Progress tracking
   - Session management

4. **Settings & Persistence**
   - LocalStorage integration
   - Configurable audio parameters
   - Device selection

### Adding New Exercise Sets

Exercise sets are defined in `src/contexts/AppContext.tsx`. Each set contains:

```typescript
{
  id: number,
  name: string,
  description: string,
  color: string, // CSS color for theming
  exercises: Exercise[]
}
```

### Custom Hooks

- **useApp**: Access global application state
- **useAudioRecording**: Handle all recording functionality
- **useNotification**: Show toast notifications
- **usePersistence**: Handle data persistence

## 🎨 Styling

The application uses a custom design system built on Tailwind CSS:

- **Primary Colors**: Purple gradient theme
- **Components**: Consistent button styles, cards, and layouts
- **Responsive**: Mobile-first responsive design
- **Dark Mode Ready**: Easy to extend with dark mode support

## 📱 Mobile Support

- **Touch-friendly**: Large touch targets and intuitive gestures
- **iOS Audio**: Special handling for iOS Safari audio context
- **Permission Handling**: Graceful microphone permission requests
- **Offline Capable**: Works without internet connection

## 🚨 Known Limitations

- **HTTPS Required**: Mobile devices require HTTPS for microphone access
- **Browser Support**: Some older browsers may have limited audio support
- **File Size**: Large recordings are processed in memory

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Web Audio API for real-time audio processing
- Next.js team for the excellent React framework
- Tailwind CSS for the utility-first CSS framework
- Lucide for the beautiful icons