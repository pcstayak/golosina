'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Clock, Mic, Calendar } from 'lucide-react'
import { SharedLessonService, type SharedLessonData } from '@/services/sharedLessonService'
import AudioPlayer from '@/components/lesson/AudioPlayer'
import { AudioPiece } from '@/contexts/AppContext'
import Link from 'next/link'

export default function SharedLessonPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params?.sessionId
  const [lessonData, setLessonData] = useState<SharedLessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [convertedAudioPieces, setConvertedAudioPieces] = useState<Record<string, AudioPiece[]>>({})

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

  // Convert shared lesson file data to AudioPiece format
  const convertToAudioPiece = useCallback(async (file: any, exerciseId: string, exerciseName: string, index: number): Promise<AudioPiece> => {
    // Create a blob from the audio URL for waveform analysis
    const response = await fetch(file.url)
    const blob = await response.blob()

    return {
      id: `${exerciseId}-${index}`,
      blob,
      timestamp: file.timestamp,
      duration: file.duration,
      exerciseId: parseInt(exerciseId),
      exerciseName,
      customTitle: file.name
    }
  }, [])

  const handlePlayStateChange = useCallback((pieceId: string, playing: boolean) => {
    if (playing) {
      setCurrentlyPlaying(pieceId)
    } else {
      if (currentlyPlaying === pieceId) {
        setCurrentlyPlaying(null)
      }
    }
  }, [currentlyPlaying])

  const downloadPiece = useCallback((piece: AudioPiece) => {
    // For shared lessons, we'll download directly from the URL
    // Find the original file data to get the URL
    if (!lessonData) return

    for (const [exerciseId, exercise] of Object.entries(lessonData.files)) {
      const file = exercise.files.find((_, index) => `${exerciseId}-${index}` === piece.id)
      if (file) {
        const a = document.createElement('a')
        a.href = file.url
        a.download = `${file.name}.webm`
        a.click()
        break
      }
    }
  }, [lessonData])

  // Convert lesson data to AudioPieces when data loads
  useEffect(() => {
    const convertLessonData = async () => {
      if (!lessonData) {
        setConvertedAudioPieces({})
        return
      }

      const converted: Record<string, AudioPiece[]> = {}

      for (const [exerciseId, exercise] of Object.entries(lessonData.files)) {
        const pieces: AudioPiece[] = []

        for (let index = 0; index < exercise.files.length; index++) {
          const file = exercise.files[index]
          try {
            const audioPiece = await convertToAudioPiece(file, exerciseId, exercise.name, index)
            pieces.push(audioPiece)
          } catch (error) {
            console.error('Error converting audio file:', error)
          }
        }

        if (pieces.length > 0) {
          converted[`exercise_${exerciseId}`] = pieces
        }
      }

      setConvertedAudioPieces(converted)
    }

    convertLessonData()
  }, [lessonData, convertToAudioPiece])

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

        {/* Exercises with AudioPlayer */}
        <div className="space-y-6">
          {Object.entries(convertedAudioPieces).map(([exerciseKey, pieces]) => {
            if (pieces.length === 0) return null

            const exerciseId = exerciseKey.split('_')[1]
            const exercise = lessonData?.files[exerciseId]

            if (!exercise) return null

            return (
              <div key={exerciseKey} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                  <h3 className="text-xl font-semibold text-white">
                    {exercise.name}
                  </h3>
                  <p className="text-white/80">
                    {pieces.length} recording{pieces.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  {pieces.map((piece, index) => (
                    <AudioPlayer
                      key={piece.id}
                      piece={piece}
                      index={index}
                      onDelete={() => {}} // No-op for shared lessons
                      onDownload={downloadPiece}
                      onTitleUpdate={undefined} // No title editing for shared lessons
                      isPlaying={currentlyPlaying === piece.id}
                      onPlayStateChange={handlePlayStateChange}
                      exerciseName={exercise.name}
                      showDeleteButton={false}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {Object.keys(convertedAudioPieces).length === 0 && !loading && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-xl font-semibold mb-2">No recordings available</h3>
              <p className="text-gray-600">This shared session doesn't contain any audio recordings.</p>
            </div>
          )}
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