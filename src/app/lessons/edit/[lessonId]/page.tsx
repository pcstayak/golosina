'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import Link from 'next/link'
import StepEditor from '@/components/lessons/StepEditor'
import { LessonService, type LessonStep } from '@/services/lessonService'
import { useNotification } from '@/hooks/useNotification'

export default function EditLessonPage() {
  const router = useRouter()
  const params = useParams()
  const lessonId = params.lessonId as string
  const { user, profile } = useAuth()
  const { showSuccess, showError } = useNotification()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [steps, setSteps] = useState<(LessonStep & { _tempId?: string })[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [lessonNotFound, setLessonNotFound] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) {
        setLessonNotFound(true)
        setIsLoading(false)
        return
      }

      try {
        const lesson = await LessonService.getLesson(lessonId)

        if (!lesson) {
          setLessonNotFound(true)
          setIsLoading(false)
          return
        }

        // Check permission - user must be creator
        if (lesson.created_by !== user?.id) {
          setPermissionDenied(true)
          setIsLoading(false)
          return
        }

        // Pre-populate form with existing data
        setTitle(lesson.title)
        setDescription(lesson.description || '')
        setIsTemplate(lesson.is_template)
        setSteps(
          lesson.steps.map((step, idx) => ({
            ...step,
            _tempId: step.id || `temp_${Date.now()}_${idx}`,
          }))
        )
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching lesson:', error)
        showError('Failed to load lesson')
        setIsLoading(false)
      }
    }

    if (user) {
      fetchLesson()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, user])

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        _tempId: `temp_${Date.now()}_${steps.length}`,
        step_order: steps.length,
        title: '',
        description: '',
        tips: '',
        media: [],
      },
    ])
  }

  const handleUpdateStep = (index: number, updatedStep: LessonStep) => {
    const newSteps = [...steps]
    newSteps[index] = updatedStep
    setSteps(newSteps)
  }

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    // Update step_order
    setSteps(newSteps.map((step, i) => ({ ...step, step_order: i })))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      return
    }

    const newSteps = [...steps]
    const draggedStep = newSteps[draggedIndex]

    // Remove from old position
    newSteps.splice(draggedIndex, 1)
    // Insert at new position
    newSteps.splice(index, 0, draggedStep)

    // Update step_order for all steps
    const reorderedSteps = newSteps.map((step, i) => ({
      ...step,
      step_order: i,
    }))

    setSteps(reorderedSteps)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Please enter a lesson title')
      return
    }

    if (steps.length === 0) {
      showError('Please add at least one step')
      return
    }

    // Validate all steps have titles
    const invalidSteps = steps.filter((s) => !s.title.trim())
    if (invalidSteps.length > 0) {
      showError('All steps must have a title')
      return
    }

    setIsSaving(true)

    try {
      const result = await LessonService.updateLesson(lessonId, {
        title,
        description,
        steps: steps.map((step) => ({
          step_order: step.step_order,
          title: step.title,
          description: step.description,
          tips: step.tips,
          media: step.media,
        })),
      })

      if (result.success) {
        showSuccess('Lesson updated successfully!')
        router.push('/')
      } else {
        showError(result.error || 'Failed to update lesson')
      }
    } catch (error) {
      console.error('Error updating lesson:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (lessonNotFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-sm border p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lesson Not Found</h2>
          <p className="text-gray-600 mb-6">
            The lesson you are looking for does not exist or has been deleted.
          </p>
          <Link href="/">
            <Button variant="primary">Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-sm border p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Permission Denied</h2>
          <p className="text-gray-600 mb-6">
            You do not have permission to edit this lesson. Only the creator can edit a lesson.
          </p>
          <Link href="/">
            <Button variant="primary">Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Lesson</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lesson Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Beginner Vocal Warm-up"
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this lesson is about..."
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>

            {profile?.role === 'teacher' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTemplate"
                  checked={isTemplate}
                  onChange={(e) => setIsTemplate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  disabled
                />
                <label htmlFor="isTemplate" className="text-sm text-gray-500">
                  Template status (cannot be changed after creation)
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              Lesson Steps ({steps.length})
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddStep}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Step
            </Button>
          </div>

          {steps.map((step, index) => (
            <div
              key={step._tempId || step.id || index}
              className={`${dragOverIndex === index ? 'border-t-4 border-blue-500' : ''}`}
            >
              <StepEditor
                step={step}
                stepNumber={index + 1}
                onChange={(updatedStep) => handleUpdateStep(index, updatedStep)}
                onRemove={() => handleRemoveStep(index)}
                canRemove={steps.length > 1}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={() => handleDragOver(index)}
                onDrop={() => handleDrop(index)}
                isDragging={draggedIndex === index}
              />
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Break your lesson into clear, manageable steps</li>
            <li>Add videos, images, or GIFs to demonstrate techniques</li>
            <li>Include helpful tips to guide students through each step</li>
            <li>You can reorder or remove steps as needed</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
