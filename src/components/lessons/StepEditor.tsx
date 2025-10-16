'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { X, GripVertical } from 'lucide-react'
import MediaInput from './MediaInput'
import type { LessonStep } from '@/services/lessonService'

interface StepEditorProps {
  step: LessonStep
  stepNumber: number
  onChange: (step: LessonStep) => void
  onRemove: () => void
  canRemove: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onDragOver?: () => void
  onDrop?: () => void
  isDragging?: boolean
}

export default function StepEditor({
  step,
  stepNumber,
  onChange,
  onRemove,
  canRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
}: StepEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const handleFieldChange = (field: keyof LessonStep, value: any) => {
    onChange({ ...step, [field]: value })
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
    if (onDragStart) {
      onDragStart()
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (onDragEnd) {
      onDragEnd()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (onDragOver) {
      onDragOver()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (onDrop) {
      onDrop()
    }
  }

  return (
    <div
      className={`border rounded-lg bg-white ${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer bg-gray-50 rounded-t-lg"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={(e) => {
          // Don't toggle if dragging
          if (!isDragging) {
            setIsExpanded(!isExpanded)
          }
        }}
      >
        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">
            Step {stepNumber}: {step.title || 'Untitled Step'}
          </h3>
          <p className="text-sm text-gray-500">
            {step.media.length} media item{step.media.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '−' : '+'}
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="p-1 text-red-600 hover:text-red-700"
              title="Remove step"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Step Title *
            </label>
            <input
              type="text"
              value={step.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="e.g., Breathing Exercise"
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={step.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Explain what the student should do in this step..."
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tips
            </label>
            <textarea
              value={step.tips || ''}
              onChange={(e) => handleFieldChange('tips', e.target.value)}
              placeholder="Add helpful tips or common mistakes to avoid..."
              className="w-full px-3 py-2 border rounded-md"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media Content
            </label>
            <MediaInput
              media={step.media}
              onChange={(media) => handleFieldChange('media', media)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
