'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
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
  userId?: string
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
  userId,
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
    <Card className={isDragging ? 'opacity-50' : ''}>
      <div
        className="flex items-center gap-3 px-3 py-3 cursor-pointer bg-panel-2 border-b border-border"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={(e) => {
          if (!isDragging) {
            setIsExpanded(!isExpanded)
          }
        }}
      >
        <GripVertical className="w-5 h-5 text-muted cursor-grab active:cursor-grabbing flex-shrink-0" />
        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-2 text-primary-contrast text-sm font-black flex-shrink-0">
          {stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-text text-[13.5px] truncate">
            {step.title || 'Untitled Step'}
          </h3>
          <p className="text-xs text-muted">
            {step.media.length} media item{step.media.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center text-muted hover:text-text transition-colors"
          >
            {isExpanded ? '−' : '+'}
          </button>
          {canRemove && (
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              title="Remove step"
              className="w-7 h-7 p-0 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <CardBody className="space-y-3.5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] uppercase tracking-wide font-extrabold text-muted mb-2">
                  Step Title *
                </label>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="e.g., Breathing Exercise"
                  className="w-full px-3 py-2.5 bg-panel border border-border rounded-[10px] text-[13.5px] text-text placeholder:text-faint focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide font-extrabold text-muted mb-2">
                  Description
                </label>
                <textarea
                  value={step.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Explain what the student should do in this step..."
                  className="w-full px-3 py-2.5 bg-panel border border-border rounded-[10px] text-[13.5px] text-text placeholder:text-faint focus:outline-none focus:border-primary transition-colors resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wide font-extrabold text-muted mb-2">
                Tips
              </label>
              <div className="space-y-2">
                {(step.tips || []).map((tip, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-muted text-sm flex-shrink-0">•</span>
                    <input
                      type="text"
                      value={tip}
                      onChange={(e) => {
                        const newTips = [...(step.tips || [])];
                        newTips[index] = e.target.value;
                        handleFieldChange('tips', newTips);
                      }}
                      placeholder="Enter a tip..."
                      className="flex-1 px-3 py-2.5 bg-panel border border-border rounded-[10px] text-[13.5px] text-text placeholder:text-faint focus:outline-none focus:border-primary transition-colors"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const newTips = (step.tips || []).filter((_, i) => i !== index);
                        handleFieldChange('tips', newTips.length > 0 ? newTips : undefined);
                      }}
                      title="Remove tip"
                      className="w-8 h-8 p-0 flex items-center justify-center flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const newTips = [...(step.tips || []), ''];
                    handleFieldChange('tips', newTips);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Tip
                </Button>
              </div>
            </div>
          </div>

          <div>
            <MediaInput
              media={step.media}
              onChange={(media) => handleFieldChange('media', media)}
              userId={userId}
            />
          </div>
        </CardBody>
      )}
    </Card>
  )
}
