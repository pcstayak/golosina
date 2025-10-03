'use client'

import { SharedLessonListItem, SharedLessonService } from '@/services/sharedLessonService'
import { FreehandLessonService } from '@/services/freehandLessonService'
import { LessonService } from '@/services/lessonService'
import { Button } from '@/components/ui/Button'
import { Mic, MessageSquare, Calendar, ExternalLink, Copy, Share, Video, Trash2 } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useNotification } from '@/hooks/useNotification'

interface SharedLessonCardProps {
  lesson: SharedLessonListItem
  onCopyLink: (sessionId: string, type: 'regular' | 'freehand') => void
  onViewLesson: (sessionId: string, type: 'regular' | 'freehand') => void
  onDelete?: () => void
}

export default function SharedLessonCard({ lesson, onCopyLink, onViewLesson, onDelete }: SharedLessonCardProps) {
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { showSuccess, showError } = useNotification()

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

  const handleCopyLink = () => {
    onCopyLink(lesson.session_id, lesson.type)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getLessonTypeLabel = () => {
    return lesson.type === 'freehand' ? 'Freehand Lesson' : 'Regular Lesson'
  }

  const getLessonTypeIcon = () => {
    return lesson.type === 'freehand' ? (
      <Video className="w-3 h-3" />
    ) : (
      <Share className="w-3 h-3" />
    )
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      let result

      // Determine which type of session this is and call the appropriate delete method
      if (lesson.session_id.startsWith('freehand_')) {
        result = await FreehandLessonService.deleteFreehandPracticeSession(lesson.session_id)
      } else if (lesson.session_id.startsWith('lesson_')) {
        result = await LessonService.deleteLessonPracticeSession(lesson.session_id)
      } else {
        result = await SharedLessonService.deleteSharedLesson(lesson.session_id)
      }

      if (result.success) {
        showSuccess('Shared lesson deleted successfully')
        setShowDeleteDialog(false)
        if (onDelete) onDelete()
      } else {
        showError(result.error || 'Failed to delete shared lesson')
      }
    } catch (error) {
      console.error('Error deleting shared lesson:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  lesson.type === 'freehand'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {getLessonTypeIcon()}
                  {getLessonTypeLabel()}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                {lesson.title}
              </h3>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete shared lesson"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Mic className="w-4 h-4" />
            <span>{lesson.recording_count} {lesson.recording_count === 1 ? 'recording' : 'recordings'}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            <span>{lesson.comment_count} {lesson.comment_count === 1 ? 'comment' : 'comments'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>Shared {formatDate(lesson.created_at)}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onViewLesson(lesson.session_id, lesson.type)}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View
          </Button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      isOpen={showDeleteDialog}
      onClose={() => setShowDeleteDialog(false)}
      onConfirm={handleDelete}
      title="Delete Shared Lesson"
      message={`Are you sure you want to delete "${lesson.title}"? This will delete all recordings and comments. This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      confirmButtonVariant="danger"
      isLoading={isDeleting}
    />
  </>
  )
}
