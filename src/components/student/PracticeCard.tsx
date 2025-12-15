'use client'

import { Practice, PracticeService } from '@/services/practiceService'
import { Button } from '@/components/ui/Button'
import { Mic, MessageSquare, Calendar, ExternalLink, Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useNotification } from '@/hooks/useNotification'

interface PracticeCardProps {
  practice: Practice
  onCopyLink: (practiceId: string) => void
  onViewPractice: (practiceId: string) => void
  onDelete?: () => void
}

export default function PracticeCard({ practice, onCopyLink, onViewPractice, onDelete }: PracticeCardProps) {
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
    onCopyLink(practice.practice_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await PracticeService.deletePractice(practice.practice_id)

      if (result.success) {
        showSuccess('Practice deleted successfully')
        setShowDeleteDialog(false)
        if (onDelete) onDelete()
      } else {
        showError(result.error || 'Failed to delete practice')
      }
    } catch (error) {
      console.error('Error deleting practice:', error)
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
              <h3 className="text-lg font-semibold text-gray-800">
                {practice.title}
              </h3>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete practice"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Mic className="w-4 h-4" />
            <span>{practice.recording_count} {practice.recording_count === 1 ? 'recording' : 'recordings'}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            <span>{practice.comment_count} {practice.comment_count === 1 ? 'comment' : 'comments'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>Shared {formatDate(practice.created_at)}</span>
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
            onClick={() => onViewPractice(practice.practice_id)}
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
      title="Delete Practice"
      message={`Are you sure you want to delete "${practice.title}"? This will delete all recordings and comments. This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      confirmButtonVariant="danger"
      isLoading={isDeleting}
    />
  </>
  )
}
