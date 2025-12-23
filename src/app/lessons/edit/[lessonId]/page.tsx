'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader, PanelContent } from '@/components/ui/Panel'
import { Card, CardBody } from '@/components/ui/Card'
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

  // Fetch lesson data - refetch when lessonId changes
  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) {
        setLessonNotFound(true)
        setIsLoading(false)
        return
      }

      if (!user) {
        return
      }

      setIsLoading(true)

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
        console.log('[EditLesson] Loaded lesson:', {
          id: lesson.id,
          title: lesson.title,
          steps: lesson.steps.length,
          firstStepMedia: lesson.steps[0]?.media?.map(m => ({
            id: m.id,
            lesson_step_id: (m as any).lesson_step_id,
            url: m.media_url?.substring(0, 50)
          }))
        });

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

    fetchLesson()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, user?.id]) // Refetch when lessonId or user changes

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        _tempId: `temp_${Date.now()}_${steps.length}`,
        step_order: steps.length,
        title: '',
        description: '',
        tips: [],
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
          id: step.id,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (lessonNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <Panel>
            <PanelContent className="text-center py-8">
              <h2 className="text-lg font-extrabold text-text mb-2">Lesson Not Found</h2>
              <p className="text-[13.5px] text-muted mb-6">
                The lesson you are looking for does not exist or has been deleted.
              </p>
              <Link href="/">
                <Button variant="primary">Back to Home</Button>
              </Link>
            </PanelContent>
          </Panel>
        </div>
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <Panel>
            <PanelContent className="text-center py-8">
              <h2 className="text-lg font-extrabold text-text mb-2">Permission Denied</h2>
              <p className="text-[13.5px] text-muted mb-6">
                You do not have permission to edit this lesson. Only the creator can edit a lesson.
              </p>
              <Link href="/">
                <Button variant="primary">Back to Home</Button>
              </Link>
            </PanelContent>
          </Panel>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-custom mx-auto px-4 py-6">
        <Panel>
          <PanelHeader className="sticky top-0 z-50">
            <div>
              <h1 className="text-lg font-extrabold text-text m-0">Edit Lesson</h1>
              <div className="text-[12.5px] text-muted mt-1">Update lesson details and steps</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancel}
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </PanelHeader>

          <PanelContent className="space-y-4">
            {/* Lesson Details */}
            <Card>
              <CardBody className="space-y-3.5">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide font-extrabold text-muted mb-2">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Beginner Vocal Warm-up"
                    className="w-full px-3 py-2.5 bg-panel border border-border rounded-[10px] text-[13.5px] text-text placeholder:text-faint focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wide font-extrabold text-muted mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this lesson is about..."
                    className="w-full px-3 py-2.5 bg-panel border border-border rounded-[10px] text-[13.5px] text-text placeholder:text-faint focus:outline-none focus:border-primary transition-colors resize-none"
                    rows={3}
                  />
                </div>

                {profile?.role === 'teacher' && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="isTemplate"
                      checked={isTemplate}
                      onChange={(e) => setIsTemplate(e.target.checked)}
                      className="w-4 h-4 border-border rounded cursor-not-allowed opacity-50"
                      disabled
                    />
                    <label htmlFor="isTemplate" className="text-[13px] text-faint select-none">
                      Template status (cannot be changed after creation)
                    </label>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Steps Section */}
            <div className="flex items-center justify-between gap-2.5 pt-2">
              <div>
                <h2 className="text-[14px] font-extrabold text-text m-0">Lesson Steps ({steps.length})</h2>
                <div className="text-[12px] text-muted mt-0.5">Drag to reorder</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddStep}
              >
                <Plus className="w-4 h-4" />
                Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step._tempId || step.id || index}
                  className={`${dragOverIndex === index ? 'border-t-2 border-primary' : ''}`}
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
                    userId={user?.id}
                  />
                </div>
              ))}
            </div>  
          </PanelContent>
        </Panel>
      </div>
    </div>
  )
}
