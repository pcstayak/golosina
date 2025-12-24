'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader, PanelContent } from '@/components/ui/Panel'
import { Card, CardBody } from '@/components/ui/Card'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import StepEditor from '@/components/lessons/StepEditor'
import { LessonService, type LessonStep } from '@/services/lessonService'
import { useNotification } from '@/hooks/useNotification'

const DRAFT_STORAGE_KEY = 'lesson_draft'

export default function CreateLessonPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { showSuccess, showError } = useNotification()
  const isInitialMount = useRef(true)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [steps, setSteps] = useState<(LessonStep & { _tempId?: string })[]>([
    {
      _tempId: `temp_${Date.now()}_0`,
      step_order: 0,
      title: '',
      description: '',
      tips: [],
      media: [],
    },
  ])

  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Restore draft on mount ONCE - use a ref to ensure it truly only runs once
  const hasRestoredRef = useRef(false)
  useEffect(() => {
    if (hasRestoredRef.current) {
      return
    }

    hasRestoredRef.current = true

    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setTitle(draft.title || '')
        setDescription(draft.description || '')
        setIsTemplate(draft.isTemplate || false)
        if (draft.steps && draft.steps.length > 0) {
          setSteps(draft.steps)
        }
        showSuccess('Draft restored')
      } catch (error) {
        console.error('Error restoring draft:', error)
      }
    }
    isInitialMount.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run ONCE on mount, never again

  // Auto-save draft on state changes (debounced)
  useEffect(() => {
    // Don't save on initial mount
    if (isInitialMount.current) return

    // Debounce auto-save to avoid race conditions
    const timeoutId = setTimeout(() => {
      const draft = {
        title,
        description,
        isTemplate,
        steps,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    }, 500) // Wait 500ms after last change before saving

    return () => clearTimeout(timeoutId)
  }, [title, description, isTemplate, steps])

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

  const handleUpdateStep = useCallback((index: number, updatedStep: LessonStep) => {
    // Use functional update to always get latest state
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps]
      // Preserve _tempId when updating
      newSteps[index] = {
        ...updatedStep,
        _tempId: prevSteps[index]?._tempId
      }
      return newSteps
    })
  }, []) // Empty deps - function never changes

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

  const handleClearDraft = () => {
    if (confirm('Are you sure you want to clear the draft? All unsaved changes will be lost.')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setTitle('')
      setDescription('')
      setIsTemplate(false)
      setSteps([
        {
          _tempId: `temp_${Date.now()}_0`,
          step_order: 0,
          title: '',
          description: '',
          tips: [],
          media: [],
        },
      ])
      showSuccess('Draft cleared')
    }
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

    if (!user?.id) {
      showError('You must be logged in to create a lesson')
      return
    }

    setIsSaving(true)

    try {
      const stepsToSave = steps.map((step) => ({
        title: step.title,
        description: step.description,
        tips: step.tips,
        media: step.media,
      }))

      const result = await LessonService.createLesson({
        title,
        description,
        created_by: user.id,
        is_template: isTemplate,
        steps: stepsToSave,
      })

      if (result.success) {
        // Clear draft after successful save
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        showSuccess('Lesson created successfully!')
        router.push('/')
      } else {
        showError(result.error || 'Failed to create lesson')
      }
    } catch (error) {
      console.error('Error creating lesson:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-custom mx-auto px-4 py-6">
        <Panel>
          <PanelHeader className="sticky top-0 z-50">
            <div>
              <h1 className="text-lg font-extrabold text-text m-0">Create New Lesson</h1>
              <div className="text-[12.5px] text-muted mt-1">Build step-by-step guided practice</div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDraft}
                disabled={isSaving}
              >
                <Trash2 className="w-4 h-4" />
                Clear Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Lesson'}
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
                      className="w-4 h-4 border-border rounded cursor-pointer accent-primary"
                    />
                    <label htmlFor="isTemplate" className="text-[13px] text-muted cursor-pointer select-none">
                      Save as template (can be assigned to students)
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
                  key={step._tempId || index}
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
