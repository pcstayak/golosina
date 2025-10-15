'use client'

import { useState } from 'react'
import { Lesson, LessonService } from '@/services/lessonService'
import { Button } from '@/components/ui/Button'
import { Play, Calendar, Layers, Trash2, Copy, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useNotification } from '@/hooks/useNotification'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface LessonCardProps {
  lesson: Lesson
  onDelete?: () => void
  onCopy?: () => void
}

export default function LessonCard({ lesson, onDelete, onCopy }: LessonCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { showSuccess, showError } = useNotification()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Unknown date'
    }
  }

  const truncateDescription = (text?: string, maxLength: number = 100) => {
    if (!text) return 'No description'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await LessonService.deleteLesson(lesson.id)
      if (result.success) {
        showSuccess('Lesson deleted successfully')
        setShowDeleteDialog(false)
        if (onDelete) onDelete()
      } else {
        showError(result.error || 'Failed to delete lesson')
      }
    } catch (error) {
      console.error('Error deleting lesson:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopy = async () => {
    if (!user?.id) {
      showError('You must be logged in to copy lessons')
      return
    }

    setIsCopying(true)
    try {
      // Create a copy of the lesson
      const result = await LessonService.createLesson({
        title: `${lesson.title} (Copy)`,
        description: lesson.description,
        created_by: user.id,
        is_template: lesson.is_template,
        steps: lesson.steps.map(step => ({
          title: step.title,
          description: step.description,
          tips: step.tips,
          media: step.media.map(m => ({
            media_type: m.media_type,
            media_url: m.media_url,
            media_platform: m.media_platform,
            embed_id: m.embed_id,
            display_order: m.display_order,
            caption: m.caption,
          })),
        })),
      })

      if (result.success) {
        showSuccess('Lesson copied successfully!')
        if (onCopy) onCopy()
      } else {
        showError(result.error || 'Failed to copy lesson')
      }
    } catch (error) {
      console.error('Error copying lesson:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex-1 mr-2">
              {lesson.title}
            </h3>
            <div className="flex items-center gap-2">
              {lesson.is_template && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                  Template
                </span>
              )}
              <button
                onClick={() => router.push(`/lessons/edit/${lesson.id}`)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit lesson"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                disabled={isCopying}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                title="Copy lesson"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete lesson"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {truncateDescription(lesson.description)}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Layers className="w-4 h-4" />
              <span>{lesson.steps.length} {lesson.steps.length === 1 ? 'step' : 'steps'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>Created {formatDate(lesson.created_at)}</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/lessons/practice/${lesson.id}`)}
            className="w-full flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Practice
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Lesson"
        message={`Are you sure you want to delete "${lesson.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        confirmButtonVariant="danger"
        isLoading={isDeleting}
      />
    </>
  )
}
