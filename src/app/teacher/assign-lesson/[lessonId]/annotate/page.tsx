'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ChevronLeft, ChevronRight, Share2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { LessonService, type Lesson } from '@/services/lessonService'
import { useNotification } from '@/hooks/useNotification'
import { supabase } from '@/lib/supabase'
import MediaPreview from '@/components/lessons/MediaPreview'

interface Student {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
}

export default function AnnotateLessonPage() {
  const params = useParams<{ lessonId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const { showSuccess, showError } = useNotification()

  const studentId = searchParams?.get('studentId')

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [stepAnnotations, setStepAnnotations] = useState<Record<string, string>>({})
  const [generalNotes, setGeneralNotes] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    if (profile?.role !== 'teacher') {
      router.push('/')
      return
    }

    if (!studentId) {
      showError('No student selected')
      router.push(`/teacher/assign-lesson/${params?.lessonId}`)
      return
    }

    const loadData = async () => {
      if (!params?.lessonId) {
        setLoading(false)
        return
      }

      try {
        const [fetchedLesson, fetchedStudent] = await Promise.all([
          LessonService.getLesson(params.lessonId),
          fetchStudent(studentId)
        ])

        if (fetchedLesson) {
          setLesson(fetchedLesson)

          const initialAnnotations: Record<string, string> = {}
          fetchedLesson.steps.forEach(step => {
            if (step.id) {
              initialAnnotations[step.id] = ''
            }
          })
          setStepAnnotations(initialAnnotations)
        }

        if (fetchedStudent) {
          setStudent(fetchedStudent)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        showError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.lessonId, studentId, profile?.role])

  const fetchStudent = async (studentId: string) => {
    if (!supabase) {
      console.error('Supabase is not configured')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, display_name')
        .eq('id', studentId)
        .single()

      if (error) {
        console.error('Error fetching student:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching student:', error)
      return null
    }
  }

  const handleAssignLesson = async () => {
    if (!lesson?.id || !user?.id || !studentId) {
      showError('Unable to assign lesson')
      return
    }

    setIsAssigning(true)

    try {
      const stepComments = lesson.steps
        .filter(step => step.id && stepAnnotations[step.id]?.trim())
        .map(step => ({
          step_id: step.id!,
          comment: stepAnnotations[step.id!].trim(),
          created_by: user.id
        }))

      const result = await LessonService.assignLesson({
        lesson_id: lesson.id,
        assigned_to: studentId,
        assigned_by: user.id,
        assignment_type: 'teacher_assigned',
        notes: generalNotes.trim() || undefined,
        step_comments: stepComments.length > 0 ? stepComments : undefined
      })

      if (result.success) {
        showSuccess('Lesson assigned successfully!')
        router.push('/teacher/lesson-plans')
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

  const getStudentDisplayName = (student: Student) => {
    if (student.display_name) return student.display_name
    if (student.first_name || student.last_name) {
      return `${student.first_name || ''} ${student.last_name || ''}`.trim()
    }
    return student.email
  }

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleNextStep = () => {
    if (lesson && currentStepIndex < lesson.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleStepAnnotationChange = (stepId: string, value: string) => {
    setStepAnnotations(prev => ({
      ...prev,
      [stepId]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!lesson || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Data Not Found</h1>
          <p className="text-gray-600 mb-6">
            Unable to load lesson or student information.
          </p>
          <Link href="/teacher/lesson-plans">
            <Button variant="primary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Lesson Plans
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentStep = lesson.steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === lesson.steps.length - 1

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href={`/teacher/assign-lesson/${lesson.id}`}>
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Student Selection
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={handleAssignLesson}
            disabled={isAssigning}
            className="flex items-center gap-2"
          >
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Assign Lesson
              </>
            )}
          </Button>
        </div>

        {/* Assignment Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Add Annotations for Student</h1>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-700 mb-1">Lesson</p>
              <p className="font-semibold text-blue-900">{lesson.title}</p>
            </div>
            <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-medium text-green-700 mb-1">Student</p>
              <p className="font-semibold text-green-900">{getStudentDisplayName(student)}</p>
            </div>
          </div>

          {/* General Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              General Notes for Student (Optional)
            </label>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Add general instructions or notes for this student..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePreviousStep}
              disabled={isFirstStep}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Step {currentStepIndex + 1} of {lesson.steps.length}
              </p>
              <p className="font-semibold text-gray-900">{currentStep.title}</p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextStep}
              disabled={isLastStep}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Step {currentStepIndex + 1}: {currentStep.title}
          </h2>

          {currentStep.description && (
            <div className="mb-4">
              <p className="text-gray-700 whitespace-pre-wrap">{currentStep.description}</p>
            </div>
          )}

          {/* Media */}
          {currentStep.media && currentStep.media.length > 0 && (
            <div className="mb-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Media</h3>
              {currentStep.media
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map((mediaItem, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    {(mediaItem.media_type === 'video' || mediaItem.media_type === 'audio') ? (
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
                        studentId={studentId || undefined}
                      />
                    ) : (
                      <img
                        src={mediaItem.media_url}
                        alt={mediaItem.caption || `Media ${index + 1}`}
                        className="max-w-full h-auto rounded"
                      />
                    )}
                    {mediaItem.caption && (
                      <p className="text-sm text-gray-600 mt-2">{mediaItem.caption}</p>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Tips */}
          {currentStep.tips && currentStep.tips.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">Tips</h4>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                {currentStep.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Annotation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes for this Step (Optional)
            </label>
            <textarea
              value={currentStep.id ? stepAnnotations[currentStep.id] || '' : ''}
              onChange={(e) => currentStep.id && handleStepAnnotationChange(currentStep.id, e.target.value)}
              placeholder={`Add specific notes or guidance for ${getStudentDisplayName(student)} about this step...`}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              These notes will be visible to the student when they practice this step
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-gray-700">Annotation Progress</p>
            <span className="text-xs text-gray-500">
              ({Object.values(stepAnnotations).filter(a => a.trim()).length} of {lesson.steps.length} steps annotated)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${(Object.values(stepAnnotations).filter(a => a.trim()).length / lesson.steps.length) * 100}%`
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            You can assign the lesson without adding annotations to all steps
          </p>
        </div>
      </div>
    </div>
  )
}
