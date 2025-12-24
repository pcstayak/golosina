'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader, PanelContent } from '@/components/ui/Panel'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, Clock, Mic, Calendar } from 'lucide-react'
import { SharedLessonService, type SharedLessonData, type RecordingComment } from '@/services/sharedLessonService'
import AudioPlayer from '@/components/lesson/AudioPlayer'
import { AudioPiece } from '@/contexts/AppContext'
import { MessageSquare, Send, User } from 'lucide-react'
import { formatTime } from '@/utils/audioAnalysis'
import Link from 'next/link'

export default function SharedLessonPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params?.sessionId
  const [lessonData, setLessonData] = useState<SharedLessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [convertedAudioPieces, setConvertedAudioPieces] = useState<Record<string, AudioPiece[]>>({})
  const [comments, setComments] = useState<Record<string, RecordingComment[]>>({})
  const [commentForms, setCommentForms] = useState<Record<string, {
    commentText: string
    timestampSeconds?: number
    includeTimestamp: boolean
  }>>({})

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

  // Load comments for all recordings
  useEffect(() => {
    const loadComments = async () => {
      if (!sessionId || typeof sessionId !== 'string' || !lessonData) return

      try {
        const allComments = await SharedLessonService.getComments(sessionId)

        // Group comments by recording ID
        const commentsByRecording: Record<string, RecordingComment[]> = {}
        allComments.forEach(comment => {
          if (!commentsByRecording[comment.recording_id]) {
            commentsByRecording[comment.recording_id] = []
          }
          commentsByRecording[comment.recording_id].push(comment)
        })

        setComments(commentsByRecording)
      } catch (error) {
        console.error('Error loading comments:', error)
      }
    }

    loadComments()
  }, [sessionId, lessonData])

  const handleAddComment = useCallback((recordingId: string, timestampSeconds?: number) => {
    setCommentForms(prev => ({
      ...prev,
      [recordingId]: {
        commentText: prev[recordingId]?.commentText || '',
        timestampSeconds,
        includeTimestamp: prev[recordingId]?.includeTimestamp || false
      }
    }))
  }, [])

  const handleSubmitComment = useCallback(async (recordingId: string) => {
    const form = commentForms[recordingId]
    if (!sessionId || !recordingId || !form?.commentText.trim()) {
      return
    }

    try {
      const result = await SharedLessonService.addComment(
        sessionId,
        recordingId,
        'Anonymous User',
        form.commentText.trim(),
        undefined,
        form.includeTimestamp ? form.timestampSeconds : undefined
      )

      if (result.success) {
        // Reload comments for this recording
        const recordingComments = await SharedLessonService.getComments(sessionId, recordingId)
        setComments(prev => ({
          ...prev,
          [recordingId]: recordingComments
        }))

        // Reset form
        setCommentForms(prev => ({
          ...prev,
          [recordingId]: {
            commentText: '',
            timestampSeconds: undefined,
            includeTimestamp: false
          }
        }))
      } else {
        alert('Failed to add comment: ' + result.error)
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to add comment. Please try again.')
    }
  }, [sessionId, commentForms])

  const handleUpdateCommentForm = useCallback((recordingId: string, field: string, value: string | boolean) => {
    setCommentForms(prev => ({
      ...prev,
      [recordingId]: {
        ...prev[recordingId],
        [field]: field === 'includeTimestamp' ? (value === 'true' || value === true) : value
      }
    }))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px' }}>Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !lessonData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center p-8">
            <div className="text-6xl mb-4">🎤</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Session Not Found</h1>
            <p className="mb-6" style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: '1.6' }}>
              {error || 'This session may have expired or the link is invalid.'}
            </p>
            <Link href="/">
              <Button variant="primary" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Go to Voice Trainer
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  const totalRecordings = lessonData.recording_count
  const totalDuration = Object.values(lessonData.files).reduce((total, exercise) => {
    return total + exercise.files.reduce((sum, file) => sum + file.duration, 0)
  }, 0)

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <Panel className="mb-6">
          <PanelHeader>
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-2))',
                  boxShadow: '0 4px 12px rgba(31, 122, 107, 0.25)'
                }}
              >
                <Mic className="w-6 h-6" style={{ color: 'white' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                  {lessonData.set_name}
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: '13.5px' }}>
                  Shared Vocal Training Session
                </p>
              </div>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to App
              </Button>
            </Link>
          </PanelHeader>

          <PanelContent>
            {lessonData.set_description && (
              <p className="mb-4" style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: '1.6' }}>
                {lessonData.set_description}
              </p>
            )}

            {/* Session Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardBody className="p-4">
                  <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--muted)' }}>
                    <Calendar className="w-4 h-4" />
                    <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Session Date
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>
                    {formatDate(lessonData.created_at)}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="p-4">
                  <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--muted)' }}>
                    <Mic className="w-4 h-4" />
                    <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Recordings
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>
                    {totalRecordings}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="p-4">
                  <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--muted)' }}>
                    <Clock className="w-4 h-4" />
                    <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total Duration
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px' }}>
                    {formatDuration(totalDuration)}
                  </p>
                </CardBody>
              </Card>
            </div>
          </PanelContent>
        </Panel>

        {/* Exercises with AudioPlayer */}
        <div className="space-y-6">
          {Object.entries(convertedAudioPieces).map(([exerciseKey, pieces]) => {
            if (pieces.length === 0) return null

            const exerciseId = exerciseKey.split('_')[1]
            const exercise = lessonData?.files[exerciseId]

            if (!exercise) return null

            return (
              <Panel key={exerciseKey}>
                <PanelHeader
                  style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-2))',
                    borderBottom: 'none'
                  }}
                >
                  <div>
                    <h3 className="text-xl font-semibold" style={{ color: 'white' }}>
                      {exercise.name}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13.5px' }}>
                      {pieces.length} recording{pieces.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </PanelHeader>

                <PanelContent className="space-y-6">
                  {pieces.map((piece, index) => {
                    const form = commentForms[piece.id]
                    const recordingComments = comments[piece.id] || []

                    return (
                      <div key={piece.id} className="space-y-4">
                        <AudioPlayer
                          piece={piece}
                          index={index}
                          onDelete={() => {}} // No-op for shared lessons
                          onDownload={downloadPiece}
                          onTitleUpdate={undefined} // No title editing for shared lessons
                          isPlaying={currentlyPlaying === piece.id}
                          onPlayStateChange={handlePlayStateChange}
                          exerciseName={exercise.name}
                          showDeleteButton={false}
                          comments={recordingComments}
                          onAddComment={(timestampSeconds) => handleAddComment(piece.id, timestampSeconds)}
                        />

                        {/* Comments Section */}
                        <Card>
                          <CardBody className="space-y-4">
                            {/* Comments Header */}
                            <div className="flex items-center justify-between">
                              <h4
                                className="flex items-center gap-2"
                                style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)' }}
                              >
                                <MessageSquare className="w-4 h-4" />
                                Comments ({recordingComments.length})
                              </h4>
                              {recordingComments.length === 0 && (
                                <span style={{ fontSize: '12px', color: 'var(--faint)' }}>
                                  Click on waveform to add timestamp comments
                                </span>
                              )}
                            </div>

                            {/* Existing Comments */}
                            {recordingComments.length > 0 && (
                              <div className="space-y-3">
                                {recordingComments
                                  .sort((a, b) => (a.timestamp_seconds || 0) - (b.timestamp_seconds || 0))
                                  .map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="rounded-lg p-3"
                                      style={{
                                        background: 'var(--panel)',
                                        border: '1px solid var(--border)'
                                      }}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
                                            <User className="w-3.5 h-3.5" />
                                            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>
                                              {comment.user_name}
                                            </span>
                                          </div>
                                          {comment.timestamp_seconds != null && (
                                            <Badge
                                              className="px-2 py-0.5"
                                              style={{
                                                background: 'linear-gradient(135deg, var(--primary), var(--primary-2))',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: '11px'
                                              }}
                                            >
                                              {formatTime(comment.timestamp_seconds)}
                                            </Badge>
                                          )}
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'var(--faint)' }}>
                                          {formatDate(comment.created_at)}
                                        </span>
                                      </div>
                                      <p style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: '1.6' }}>
                                        {comment.comment_text}
                                      </p>
                                    </div>
                                  ))}
                              </div>
                            )}

                            {/* Add Comment Form */}
                            <div
                              className="rounded-lg p-3"
                              style={{
                                border: '1px solid var(--border)',
                                background: 'var(--panel-2)'
                              }}
                            >
                              <h5
                                className="mb-2"
                                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}
                              >
                                Add a Comment
                              </h5>

                              <div className="space-y-2">
                                {/* Comment textarea with inline submit button */}
                                <div className="flex gap-2 items-end">
                                  <div className="flex-1">
                                    <textarea
                                      value={form?.commentText || ''}
                                      onChange={(e) => handleUpdateCommentForm(piece.id, 'commentText', e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg resize-none"
                                      style={{
                                        fontSize: '13.5px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--panel)',
                                        color: 'var(--text)'
                                      }}
                                      placeholder="Enter your comment..."
                                      rows={2}
                                    />
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleSubmitComment(piece.id)}
                                    disabled={!form?.commentText?.trim()}
                                    className="flex items-center gap-2 whitespace-nowrap"
                                  >
                                    <Send className="w-3 h-3" />
                                    Post
                                  </Button>
                                </div>

                                {/* Timestamp checkbox */}
                                {form?.timestampSeconds != null && (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`timestamp-${piece.id}`}
                                      checked={form.includeTimestamp || false}
                                      onChange={(e) => handleUpdateCommentForm(piece.id, 'includeTimestamp', e.target.checked)}
                                      className="w-4 h-4 rounded"
                                      style={{
                                        accentColor: 'var(--primary)'
                                      }}
                                    />
                                    <label
                                      htmlFor={`timestamp-${piece.id}`}
                                      style={{ fontSize: '13px', color: 'var(--muted)' }}
                                    >
                                      Comment applies to specific moment in recording
                                      {form.includeTimestamp && form.timestampSeconds != null && (
                                        <span style={{ color: 'var(--primary)', marginLeft: '8px' }}>
                                          ({formatTime(form.timestampSeconds)})
                                        </span>
                                      )}
                                    </label>
                                  </div>
                                )}

                                <div style={{ fontSize: '12px', color: 'var(--faint)' }}>
                                  Tip: Click on the waveform above to set a timestamp position
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      </div>
                    )
                  })}
                </PanelContent>
              </Panel>
            )
          })}

          {Object.keys(convertedAudioPieces).length === 0 && !loading && (
            <Card>
              <CardBody className="p-8 text-center">
                <div className="text-6xl mb-4">🎤</div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
                  No recordings available
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '13.5px' }}>
                  This shared session doesn&apos;t contain any audio recordings.
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="mb-4" style={{ color: 'var(--muted)', fontSize: '13.5px' }}>
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