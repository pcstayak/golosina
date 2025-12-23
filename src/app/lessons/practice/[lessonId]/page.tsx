'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader, PanelContent } from '@/components/ui/Panel'
import { ArrowLeft, Share2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import StepDisplay from '@/components/lessons/StepDisplay'
import RecordingControls from '@/components/lesson/RecordingControls'
import AudioPlayer from '@/components/lesson/AudioPlayer'
import { LessonService, type Lesson } from '@/services/lessonService'
import { PracticeService } from '@/services/practiceService'
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

  // Get all recordings across all steps
  const allRecordings = Object.values(state.currentPracticePieces).flat()
  const hasRecordings = allRecordings.length > 0

  // Get current step and recordings for current step only
  const currentStep = lesson?.steps[state.currentStepIndex]
  const currentStepId = state.currentStepId || ''
  const recordingStepId = `step_${currentStepId}`
  const currentStepRecordings = state.currentPracticePieces[recordingStepId] || []

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

          // Set initial step context for recording
          if (fetchedLesson.steps.length > 0) {
            const firstStep = fetchedLesson.steps[0];
            const stepId = firstStep.id || `order_${firstStep.step_order}`;

            console.log('Setting initial step context:', { stepId, stepIndex: 0, fullStep: firstStep });

            dispatch({
              type: 'SET_CURRENT_STEP',
              payload: {
                stepId,
                stepIndex: 0
              }
            })
          }

          // Fetch step comments if this is an assigned lesson
          if (assignmentId) {
            const stepsWithComments = await Promise.all(
              fetchedLesson.steps.map(async (step) => {
                if (!step.id) return step
                const comments = await LessonService.getStepComments(step.id, assignmentId)
                return { ...step, comments }
              })
            )
            fetchedLesson.steps = stepsWithComments
          }

          dispatch({ type: 'SET_CURRENT_VIEW', payload: 'practice' })
          dispatch({ type: 'CLEAR_PRACTICE_PIECES' })
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

    if (Object.keys(state.currentPracticePieces).length === 0) {
      showError('Please record at least one audio clip before sharing')
      return
    }

    setIsSaving(true)

    try {
      const createResult = await PracticeService.createPractice(
        lesson.id,
        user.id,
        assignmentId || undefined
      )

      if (!createResult.success || !createResult.practiceId) {
        showError(createResult.error || 'Failed to create practice')
        setIsSaving(false)
        return
      }

      // Create step names map from lesson steps
      const stepNames: Record<string, string> = {}
      lesson.steps.forEach((step, index) => {
        stepNames[`step_${step.id}`] = `Step ${index + 1}: ${step.title || 'Untitled'}`
      })

      const uploadResult = await PracticeService.savePracticeRecordings(
        createResult.practiceId,
        state.currentPracticePieces,
        stepNames
      )

      if (!uploadResult.success) {
        showError(uploadResult.error || 'Failed to save recordings')
        setIsSaving(false)
        return
      }

      // Mark practice as shared
      const shareResult = await PracticeService.sharePractice(createResult.practiceId)
      if (!shareResult.success) {
        showError(shareResult.error || 'Failed to share practice')
        setIsSaving(false)
        return
      }

      // Track this practice in localStorage so it appears in "My Shared Practices"
      PracticeService.markPracticeAsOwned(createResult.practiceId)

      const shareUrl = `${window.location.origin}/practices/${createResult.practiceId}`
      await navigator.clipboard.writeText(shareUrl)

      showSuccess('Practice saved! Share link copied to clipboard')

      // Clear recordings after successful save
      dispatch({ type: 'CLEAR_PRACTICE_PIECES' })

      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error) {
      console.error('Error saving practice session:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }, [lesson, user, state.currentPracticePieces, assignmentId, dispatch, router, showSuccess, showError])

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

  const handlePreviousStep = useCallback(() => {
    if (!lesson || state.currentStepIndex <= 0) return

    const newIndex = state.currentStepIndex - 1
    const step = lesson.steps[newIndex]
    const stepId = step.id || `order_${step.step_order}`

    dispatch({
      type: 'SET_CURRENT_STEP',
      payload: { stepId, stepIndex: newIndex }
    })
  }, [lesson, state.currentStepIndex, dispatch])

  const handleNextStep = useCallback(() => {
    if (!lesson || state.currentStepIndex >= lesson.steps.length - 1) return

    const newIndex = state.currentStepIndex + 1
    const step = lesson.steps[newIndex]
    const stepId = step.id || `order_${step.step_order}`

    dispatch({
      type: 'SET_CURRENT_STEP',
      payload: { stepId, stepIndex: newIndex }
    })
  }, [lesson, state.currentStepIndex, dispatch])

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
    <div className="min-h-screen">
      <div className="max-w-custom mx-auto px-4 py-6">
        <Panel>
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--panel)', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <PanelHeader>
              <div>
                <h1 className="text-lg font-extrabold text-text m-0">{lesson.title}</h1>
                <div className="text-[12.5px] text-muted mt-1">{lesson.description || 'Practice this lesson step by step'}</div>
              </div>
              <div className="flex gap-2.5 items-center">
                <Link href="/">
                  <Button size="sm" variant="ghost">← Back</Button>
                </Link>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveAndShare}
                  disabled={isSaving || !hasRecordings}
                >
                  {isSaving ? 'Saving...' : 'Save & Share'}
                </Button>
              </div>
            </PanelHeader>
          </div>

          <PanelContent>
            <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3.5 items-start">
              {/* LEFT: Step Content (only ONE step visible) */}
              <div>
                {currentStep && (
                  <StepDisplay
                    key={currentStep.id || state.currentStepIndex}
                    step={currentStep}
                    stepNumber={state.currentStepIndex + 1}
                    showComments={!!assignmentId}
                    assignmentId={assignmentId || undefined}
                  />
                )}

                {/* Footer Actions */}
                <div className="mt-3 flex justify-between items-center gap-2.5">
                  <div className="text-xs text-muted font-black">
                    Step {state.currentStepIndex + 1} of {lesson.steps.length}
                  </div>
                  <div className="flex gap-2.5">
                    {state.currentStepIndex > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handlePreviousStep}
                      >
                        ← Previous
                      </Button>
                    )}
                    {state.currentStepIndex === lesson.steps.length - 1 ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleSaveAndShare}
                        disabled={isSaving || !hasRecordings}
                      >
                        {isSaving ? 'Saving...' : 'Save & Share'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleNextStep}
                      >
                        Next →
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Recorder (calm, anchored) */}
              <aside style={{ position: 'sticky', top: 'calc(100px + 1rem)', alignSelf: 'flex-start' }}>
                <div className="border border-border rounded-[14px] overflow-hidden bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)]">
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-text m-0">Practice Recording</div>
                      <div className="text-[12.5px] text-muted mt-1">Record → review → keep moving</div>
                    </div>
                    {state.isRecording && (
                      <div className="font-black text-muted tabular-nums">
                        {Math.floor((Date.now() - (state.recordingStartTime || Date.now())) / 1000 / 60)}:
                        {String(Math.floor(((Date.now() - (state.recordingStartTime || Date.now())) / 1000) % 60)).padStart(2, '0')}
                      </div>
                    )}
                  </div>

                  <div className="p-3 grid gap-2.5">
                    <RecordingControls />

                    {currentStepRecordings.length > 0 && (
                      <div>
                        <div className="text-sm font-black text-text mb-2">Your takes</div>
                        <div className="border border-border rounded-[14px] overflow-hidden">
                          {currentStepRecordings.map((piece, index) => (
                            <div key={piece.id}>
                              <div className="grid grid-cols-[auto_1fr_auto] gap-2.5 px-3 py-2.5 items-center border-t first:border-t-0 border-border bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)]">
                                <div className="w-[26px] h-[26px] rounded-full grid place-items-center bg-gradient-to-br from-primary to-primary-2 text-primary-contrast font-black text-xs">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-black text-sm">Recording {index + 1}</div>
                                  <div className="text-xs text-muted mt-0.5">
                                    {Math.floor(piece.duration)}s · {new Date(piece.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handlePlayStateChange(piece.id, currentlyPlaying !== piece.id)}
                                    className="w-[34px] h-[34px] rounded-[10px] border border-border bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)] text-text font-black"
                                    title={currentlyPlaying === piece.id ? 'Pause' : 'Play'}
                                  >
                                    {currentlyPlaying === piece.id ? '⏸' : '▶'}
                                  </button>
                                  <button
                                    onClick={() => downloadPiece(piece)}
                                    className="w-[34px] h-[34px] rounded-[10px] border border-border bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)] text-text font-black"
                                    title="Download"
                                  >
                                    ⇩
                                  </button>
                                  <button
                                    onClick={() => {
                                      dispatch({
                                        type: 'REMOVE_AUDIO_PIECE',
                                        payload: { stepId: recordingStepId, pieceId: piece.id },
                                      });
                                    }}
                                    className="w-[34px] h-[34px] rounded-[10px] border-0 bg-[rgba(255,77,109,0.18)] text-text font-black"
                                    title="Delete"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                              {/* Hidden AudioPlayer for playback functionality */}
                              <div className="hidden">
                                <AudioPlayer
                                  piece={piece}
                                  index={index}
                                  isPlaying={currentlyPlaying === piece.id}
                                  onPlayStateChange={handlePlayStateChange}
                                  showControls={false}
                                  showDeleteButton={false}
                                  showWaveform={false}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </PanelContent>
        </Panel>
      </div>
    </div>
  )
}
