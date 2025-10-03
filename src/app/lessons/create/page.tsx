'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import Link from 'next/link'
import StepEditor from '@/components/lessons/StepEditor'
import { LessonService, type LessonStep } from '@/services/lessonService'
import { useNotification } from '@/hooks/useNotification'

export default function CreateLessonPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { showSuccess, showError } = useNotification()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [steps, setSteps] = useState<LessonStep[]>([
    {
      step_order: 0,
      title: '',
      description: '',
      tips: '',
      media: [],
    },
  ])
  const [isSaving, setIsSaving] = useState(false)

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
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
      const result = await LessonService.createLesson({
        title,
        description,
        created_by: user.id,
        is_template: isTemplate,
        steps: steps.map((step) => ({
          title: step.title,
          description: step.description,
          tips: step.tips,
          media: step.media,
        })),
      })

      if (result.success) {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Lesson'}
          </Button>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New Lesson</h1>

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
                />
                <label htmlFor="isTemplate" className="text-sm text-gray-700">
                  Save as template (can be assigned to students)
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
            <StepEditor
              key={index}
              step={step}
              stepNumber={index + 1}
              onChange={(updatedStep) => handleUpdateStep(index, updatedStep)}
              onRemove={() => handleRemoveStep(index)}
              canRemove={steps.length > 1}
            />
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips</h3>
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
