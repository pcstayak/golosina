'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { FreehandLessonService } from '@/services/freehandLessonService'
import { useNotification } from '@/hooks/useNotification'

interface AssignLessonModalProps {
  lessonId: string
  lessonTitle: string
  assignedBy: string
  onClose: () => void
  onAssignmentComplete?: () => void
}

export default function AssignLessonModal({
  lessonId,
  lessonTitle,
  assignedBy,
  onClose,
  onAssignmentComplete,
}: AssignLessonModalProps) {
  const { showSuccess, showError } = useNotification()
  const [studentId, setStudentId] = useState('')
  const [notes, setNotes] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleAssign = async () => {
    if (!studentId.trim()) {
      showError('Please enter a student user ID')
      return
    }

    setIsAssigning(true)
    try {
      const result = await FreehandLessonService.assignLessonToStudent(
        lessonId,
        assignedBy,
        studentId.trim(),
        notes.trim() || undefined
      )

      if (result.success) {
        showSuccess('Lesson assigned successfully')
        onAssignmentComplete?.()
        onClose()
      } else {
        showError(result.error || 'Failed to assign lesson')
      }
    } catch (error) {
      console.error('Error assigning lesson:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assign Lesson</h2>
              <p className="text-sm text-gray-500">{lessonTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
              Student User ID <span className="text-red-500">*</span>
            </label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter student's user ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isAssigning}
            />
            <p className="mt-1 text-xs text-gray-500">
              Ask the student for their user ID from their profile settings
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any instructions or notes for the student..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isAssigning}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            className="flex-1 flex items-center justify-center gap-2"
            disabled={isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Assign Lesson
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
