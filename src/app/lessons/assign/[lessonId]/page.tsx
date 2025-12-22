'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { LessonService, type Lesson } from '@/services/lessonService'
import { useNotification } from '@/hooks/useNotification'
import MediaPreview from '@/components/lessons/MediaPreview'
import type { AnnotationContext } from '@/services/annotationsService'

export default function AssignLessonPage() {
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const { user, profile } = useAuth()
  const { showSuccess, showError } = useNotification()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState('')
  const [notes, setNotes] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

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
        }
      } catch (error) {
        console.error('Error loading lesson:', error)
        showError('Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()
  }, [params?.lessonId, showError])

  const handleAssign = async () => {
    if (!studentId.trim()) {
      showError('Please enter a student user ID')
      return
    }

    if (!lesson?.id || !user?.id) {
      showError('Unable to assign lesson')
      return
    }

    setIsAssigning(true)
    try {
      const result = await LessonService.assignLesson({
        lesson_id: lesson.id,
        assigned_to: studentId.trim(),
        assigned_by: user.id,
        assignment_type: 'teacher_assigned',
        notes: notes.trim() || undefined
      })

      if (result.success) {
        showSuccess('Lesson assigned successfully')
        router.push('/')
      } else {
        showError(result.error || 'Failed to assign lesson')
      }
    } catch (error) {
      console.error('Error assigning lesson:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsAssigning(false)
    }
  }

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
            The lesson you are trying to assign could not be found.
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

  if (profile?.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            Only teachers can assign lessons.
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
            onClick={handleAssign}
            disabled={isAssigning || !studentId.trim()}
            className="flex items-center gap-2"
          >
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Assign Lesson
              </>
            )}
          </Button>
        </div>

        {/* Assignment Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Assign Lesson to Student</h1>

          <div className="space-y-4">
            <div>
              <label htmlFor="lesson-title" className="block text-sm font-medium text-gray-700 mb-1">
                Lesson
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-900 font-medium">{lesson.title}</p>
                {lesson.description && (
                  <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                Student User ID <span className="text-red-500">*</span>
              </label>
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter student's user ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isAssigning}
              />
              <p className="mt-1 text-xs text-gray-500">
                Ask the student for their user ID from their profile settings
              </p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                General Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add general instructions or notes for the student..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isAssigning}
              />
            </div>
          </div>
        </div>

        {/* Lesson Preview with Annotation Capability */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Lesson Preview - Add Student-Specific Annotations
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Review the lesson content and add annotations specific to this student.
            These annotations will only be visible to this student and you.
          </p>

          <div className="space-y-6">
            {lesson.steps.map((step, index) => (
              <div key={step.id || index} className="border-t pt-6 first:border-t-0 first:pt-0">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Step {index + 1}: {step.title}
                </h3>
                {step.description && (
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{step.description}</p>
                )}

                {/* Display media with annotations */}
                {step.media && step.media.length > 0 && (
                  <div className="space-y-4">
                    {step.media
                      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                      .map((mediaItem, mediaIndex) => {
                        // Only show media with lyrics for annotation purposes
                        if (!mediaItem.lyrics) {
                          return null
                        }

                        const annotationContext: AnnotationContext = {
                          mode: 'assignment',
                          userId: user!.id,
                          isTeacher: true,
                          studentId: studentId.trim() || undefined,
                        }

                        return (
                          <div key={mediaIndex} className="border rounded-lg p-4 bg-gray-50">
                            {(mediaItem.media_type === 'video' || mediaItem.media_type === 'audio') && (
                              <MediaPreview
                                mediaUrl={mediaItem.media_url}
                                mediaType={mediaItem.media_type}
                                mediaPlatform={mediaItem.media_platform}
                                embedId={mediaItem.embed_id}
                                comments={[]}
                                onAddComment={() => {}}
                                onDeleteComment={() => {}}
                                isEditable={false}
                                lyrics={mediaItem.lyrics}
                                mediaId={mediaItem.id}
                                userId={user!.id}
                                isTeacher={true}
                              />
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}

                {/* Tips */}
                {step.tips && step.tips.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                    <h4 className="text-sm font-semibold text-yellow-900 mb-2">Tips</h4>
                    <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                      {step.tips.map((tip, tipIndex) => (
                        <li key={tipIndex}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
