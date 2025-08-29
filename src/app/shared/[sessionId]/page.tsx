'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Play, Pause, Download, ArrowLeft, Clock, Mic, Calendar } from 'lucide-react'
import { SharedLessonService, type SharedLessonData } from '@/services/sharedLessonService'
import Link from 'next/link'

export default function SharedLessonPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params?.sessionId
  const [lessonData, setLessonData] = useState<SharedLessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({})

  useEffect(() => {
    const fetchLessonData = async () => {
      if (!sessionId || typeof sessionId !== 'string') {
        setError('Invalid session ID')
        setLoading(false)
        return
      }

      try {
        const data = await SharedLessonService.getSharedLesson(sessionId)
        if (data) {
          setLessonData(data)
        } else {
          setError('Session not found or has expired')
        }
      } catch (err) {
        console.error('Error loading shared lesson:', err)
        setError('Failed to load session')
      } finally {
        setLoading(false)
      }
    }

    fetchLessonData()
  }, [sessionId])

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePlayPause = async (audioUrl: string, audioId: string) => {
    console.log('Attempting to play audio:', { audioUrl, audioId })
    
    // Stop any currently playing audio
    if (currentlyPlaying && currentlyPlaying !== audioId) {
      const currentAudio = audioElements[currentlyPlaying]
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
    }

    let audio = audioElements[audioId]
    
    if (!audio) {
      console.log('Creating new audio element for:', audioUrl)
      audio = new Audio()
      
      // Set crossOrigin to handle CORS
      audio.crossOrigin = 'anonymous'
      
      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started')
      })
      
      audio.addEventListener('canplay', () => {
        console.log('Audio can play')
      })
      
      audio.addEventListener('ended', () => {
        console.log('Audio ended')
        setCurrentlyPlaying(null)
      })
      
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e)
        console.error('Audio error details:', audio.error)
        
        // Provide user-friendly error message
        const errorMessage = audio.error ? 
          `Audio error ${audio.error.code}: ${getAudioErrorMessage(audio.error.code)}` :
          'Failed to load audio file'
        
        alert(`Could not play audio: ${errorMessage}\n\nTry downloading the file instead.`)
        setCurrentlyPlaying(null)
      })
      
      setAudioElements(prev => ({ ...prev, [audioId]: audio }))
      
      // Set source after setting up event listeners
      audio.src = audioUrl
    }

    if (currentlyPlaying === audioId) {
      console.log('Pausing audio')
      audio.pause()
      setCurrentlyPlaying(null)
    } else {
      try {
        console.log('Starting audio playback')
        
        // Load the audio if not already loaded
        if (audio.readyState === 0) {
          audio.load()
        }
        
        await audio.play()
        console.log('Audio playback started successfully')
        setCurrentlyPlaying(audioId)
      } catch (error) {
        console.error('Playback failed:', error)
        alert('Could not play audio. This may be due to browser restrictions or unsupported format. Try downloading the file instead.')
        setCurrentlyPlaying(null)
      }
    }
  }

  const getAudioErrorMessage = (errorCode: number): string => {
    switch (errorCode) {
      case 1: return 'Audio loading was aborted'
      case 2: return 'Network error occurred'
      case 3: return 'Audio decoding failed'
      case 4: return 'Audio format not supported'
      default: return 'Unknown error'
    }
  }

  const downloadAudio = (audioUrl: string, filename: string) => {
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = filename
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !lessonData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🎤</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Session Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'This session may have expired or the link is invalid.'}
          </p>
          <Link href="/">
            <Button variant="primary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go to Voice Trainer
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalRecordings = lessonData.recording_count
  const totalDuration = Object.values(lessonData.files).reduce((total, exercise) => {
    return total + exercise.files.reduce((sum, file) => sum + file.duration, 0)
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{lessonData.set_name}</h1>
                <p className="text-gray-600">Shared Vocal Training Session</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="secondary" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to App
              </Button>
            </Link>
          </div>

          {lessonData.set_description && (
            <p className="text-gray-700 mb-4">{lessonData.set_description}</p>
          )}

          {/* Session Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Session Date</span>
              </div>
              <p className="font-semibold">{formatDate(lessonData.created_at)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Mic className="w-4 h-4" />
                <span className="text-sm">Total Recordings</span>
              </div>
              <p className="font-semibold">{totalRecordings}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Total Duration</span>
              </div>
              <p className="font-semibold">{formatDuration(totalDuration)}</p>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-6">
          {Object.entries(lessonData.files).map(([exerciseId, exercise]) => (
            <div key={exerciseId} className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{exercise.name}</h2>
              
              <div className="space-y-3">
                {exercise.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{file.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(file.duration)}
                        </span>
                        <span>{formatDate(file.timestamp)}</span>
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs">WebM</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePlayPause(file.url, `${exerciseId}-${index}`)}
                        className="flex items-center gap-2"
                      >
                        {currentlyPlaying === `${exerciseId}-${index}` ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Play
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadAudio(file.url, `${file.name}.webm`)}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {exercise.files.length === 0 && (
                <p className="text-gray-500 text-center py-8">No recordings for this exercise</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            Want to create your own vocal training sessions?
          </p>
          <Link href="/">
            <Button variant="primary" className="flex items-center gap-2 mx-auto">
              🎤 Try Golosina Voice Trainer
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}