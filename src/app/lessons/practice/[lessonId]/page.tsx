'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Share2 } from 'lucide-react'
import Link from 'next/link'
import StepDisplay from '@/components/lessons/StepDisplay'
import RecordingControls from '@/components/lesson/RecordingControls'
import AudioPlayer from '@/components/lesson/AudioPlayer'
import { LessonService, type Lesson } from '@/services/lessonService'
import { SharedLessonService } from '@/services/sharedLessonService'
import { useNotification } from '@/hooks/useNotification'

export default function LessonPracticePage() {
  const params = useParams<{ lessonId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { state, dispatch } = useApp()
  const { user } = useAuth()
  const { showSuccess, showError } = useNotification()

  const assignmentId = searchParams?.get('assignmentId')

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)

  const recordingKey = 'lesson_recording'
  const currentRecordings = state.currentSessionPieces[recordingKey] || []

  useEffect(() => {
    const fetchLesson = async () => {
      if (!params?.lessonId) {
        setLoading(false)
        return
      }

      try {
        const fetchedLesson = await LessonService.getLesson(params.lessonId)
        if (fetchedLesson) {
          setLesson(fetchedLesson)

          // Fetch step comments if this is an assigned lesson
          if (assignmentId) {
            // TODO: Fetch and attach step comments
          }

          dispatch({ type: 'SET_CURRENT_VIEW', payload: 'lesson' })
          dispatch({ type: 'CLEAR_SESSION_PIECES' })
        }
      } catch (error) {
        console.error('Error loading lesson:', error)
        showError('Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()

    return () => {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'landing' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.lessonId, assignmentId])

  const handleSaveAndShare = useCallback(async () => {
    if (!lesson?.id || !user?.id) {
      showError('Unable to save practice session')
      return
    }

    if (Object.keys(state.currentSessionPieces).length === 0) {
      showError('Please record at least one audio clip before sharing')
      return
    }

    setIsSaving(true)

    try {
      const createResult = await LessonService.createPracticeSession({
        lesson_id: lesson.id,
        assignment_id: assignmentId || undefined,
        created_by: user.id,
      })

      if (!createResult.success || !createResult.sessionId) {
        showError(createResult.error || 'Failed to create practice session')
        setIsSaving(false)
        return
      }

      const uploadResult = await LessonService.savePracticeRecordings(
        createResult.sessionId,
        state.currentSessionPieces
      )

      if (!uploadResult.success) {
        showError(uploadResult.error || 'Failed to save recordings')
        setIsSaving(false)
        return
      }

      // Track this session in localStorage so it appears in "My Shared Lessons"
      SharedLessonService.markSessionAsOwned(createResult.sessionId)

      const shareUrl = `${window.location.origin}/share/lesson/${createResult.sessionId}`
      await navigator.clipboard.writeText(shareUrl)

      showSuccess('Practice saved! Share link copied to clipboard')

      // Clear recordings after successful save
      dispatch({ type: 'CLEAR_SESSION_PIECES' })

      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error) {
      console.error('Error saving practice session:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }, [lesson, user, state.currentSessionPieces, assignmentId, dispatch, router, showSuccess, showError])

  const handlePlayStateChange = useCallback((pieceId: string, playing: boolean) => {
    if (playing) {
      setCurrentlyPlaying(pieceId)
    } else {
      if (currentlyPlaying === pieceId) {
        setCurrentlyPlaying(null)
      }
    }
  }, [currentlyPlaying])

  const downloadPiece = useCallback((piece: any) => {
    try {
      const url = URL.createObjectURL(piece.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lesson_recording_${piece.id}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading recording:', error)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Lesson Not Found</h1>
          <p className="text-gray-600 mb-6">
            The lesson you are trying to practice could not be found.
          </p>
          <Link href="/">
            <Button variant="primary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAndShare}
            disabled={isSaving || currentRecordings.length === 0}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save & Share'}
          </Button>
        </div>

        {/* Lesson Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{lesson.title}</h1>
          {lesson.description && (
            <p className="text-gray-600">{lesson.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson Steps */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Lesson Steps ({lesson.steps.length})
            </h2>
            {lesson.steps.map((step, index) => (
              <StepDisplay
                key={step.id || index}
                step={step}
                stepNumber={index + 1}
                showComments={!!assignmentId}
              />
            ))}
          </div>

          {/* Recording Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Practice Recording
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                Record yourself practicing this lesson
              </p>

              <RecordingControls />

              {currentRecordings.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Recordings ({currentRecordings.length})
                  </h3>
                  {currentRecordings.map((piece, index) => (
                    <AudioPlayer
                      key={piece.id}
                      piece={piece}
                      index={index}
                      onDelete={() => {
                        dispatch({
                          type: 'REMOVE_AUDIO_PIECE',
                          payload: { exerciseKey: recordingKey, pieceId: piece.id },
                        })
                      }}
                      onDownload={downloadPiece}
                      onTitleUpdate={undefined}
                      isPlaying={currentlyPlaying === piece.id}
                      onPlayStateChange={handlePlayStateChange}
                      exerciseName="Practice Recording"
                      showDeleteButton={true}
                    />
                  ))}
                </div>
              )}

              {currentRecordings.length === 0 && !state.isRecording && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    No recordings yet. Click the microphone to start.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
