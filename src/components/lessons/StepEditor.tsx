'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { X, GripVertical, Plus } from 'lucide-react'
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
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0">
              Step Title *
            </label>
            <input
              type="text"
              value={step.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="e.g., Breathing Exercise"
              className="flex-1 px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div className="flex items-start gap-4">
            <label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0 pt-2">
              Description
            </label>
            <textarea
              value={step.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Explain what the student should do in this step..."
              className="flex-1 px-3 py-2 border rounded-md"
              rows={3}
            />
          </div>

          {/* Tips - Bullet Point List */}
          <div className="flex items-start gap-4">
            <label className="text-sm font-medium text-gray-700 w-32 flex-shrink-0 pt-2">
              Tips
            </label>
            <div className="flex-1 space-y-2">
              {(step.tips || []).map((tip, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-500">•</span>
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => {
                      const newTips = [...(step.tips || [])];
                      newTips[index] = e.target.value;
                      handleFieldChange('tips', newTips);
                    }}
                    placeholder="Enter a tip..."
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newTips = (step.tips || []).filter((_, i) => i !== index);
                      handleFieldChange('tips', newTips.length > 0 ? newTips : undefined);
                    }}
                    className="p-1 text-red-600 hover:text-red-700"
                    title="Remove tip"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newTips = [...(step.tips || []), ''];
                  handleFieldChange('tips', newTips);
                }}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Tip
              </button>
            </div>
          </div>

          <div>
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
