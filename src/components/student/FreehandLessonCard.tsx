'use client'

import { FreehandLesson } from '@/services/freehandLessonService'
import { Button } from '@/components/ui/Button'
import { Video, Calendar, Trash2, Play } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useRouter } from 'next/navigation'

interface FreehandLessonCardProps {
  lesson: FreehandLesson
  onDelete: (sessionId: string) => Promise<void>
}

export default function FreehandLessonCard({ lesson, onDelete }: FreehandLessonCardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date'
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
      await onDelete(lesson.session_id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error deleting lesson:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const videoCount = lesson.videos?.length || 0

  const handleStartLesson = () => {
    if (lesson.id) {
      router.push(`/freehand/practice/${lesson.id}`)
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete lesson"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {truncateDescription(lesson.description)}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              <span>{videoCount} {videoCount === 1 ? 'video' : 'videos'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>Created {formatDate(lesson.created_at)}</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleStartLesson}
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
        title="Delete Freehand Lesson"
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
