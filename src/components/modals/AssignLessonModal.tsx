'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { LessonService } from '@/services/lessonService'
import { TeacherStudentService, StudentInfo } from '@/services/teacherStudentService'
import { useNotification } from '@/hooks/useNotification'

interface AssignLessonModalProps {
  lessonId: string
  lessonTitle: string
  assignedBy: string
  onClose: () => void
  onAssignmentComplete?: () => void
  isOpen?: boolean
}

export default function AssignLessonModal({
  lessonId,
  lessonTitle,
  assignedBy,
  onClose,
  onAssignmentComplete,
  isOpen = true,
}: AssignLessonModalProps) {
  const { showSuccess, showError } = useNotification()
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const fetchStudents = async () => {
      setIsLoadingStudents(true)
      try {
        const teacherStudents = await TeacherStudentService.getTeacherStudents(assignedBy)
        setStudents(teacherStudents)
      } catch (error) {
        console.error('Error fetching students:', error)
        showError('Failed to load students')
      } finally {
        setIsLoadingStudents(false)
      }
    }

    fetchStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedBy, isOpen])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleAssign = async () => {
    if (selectedStudents.length === 0) {
      showError('Please select at least one student')
      return
    }

    setIsAssigning(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const studentId of selectedStudents) {
        const result = await LessonService.assignLesson({
          lesson_id: lessonId,
          assigned_to: studentId,
          assigned_by: assignedBy,
          assignment_type: 'teacher_assigned',
          notes: notes.trim() || undefined
        })

        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      }

      if (successCount > 0) {
        showSuccess(
          selectedStudents.length === 1
            ? 'Lesson assigned successfully'
            : `Lesson assigned to ${successCount} student${successCount !== 1 ? 's' : ''}`
        )
        onAssignmentComplete?.()
        onClose()
      } else {
        showError('Failed to assign lesson')
      }
    } catch (error) {
      console.error('Error assigning lesson:', error)
      showError('An unexpected error occurred')
    } finally {
      setIsAssigning(false)
    }
  }

  const getStudentDisplayName = (student: StudentInfo) => {
    if (student.display_name) return student.display_name
    if (student.first_name && student.last_name) {
      return `${student.first_name} ${student.last_name}`
    }
    if (student.first_name) return student.first_name
    return student.email
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.80)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full max-w-md sm:max-w-lg md:max-w-xl border rounded-[14px]"
        style={{
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(11, 18, 32, 0.95)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div
          className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b"
          style={{
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(47, 183, 160, 0.1)',
              }}
            >
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold text-text">Assign Lesson</h2>
              <p className="text-xs text-muted truncate">{lessonTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors p-1 flex-shrink-0"
            style={{
              transition: 'color 0.2s',
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-6"
          style={{
            minHeight: 0,
          }}
        >
          {/* Students List */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wide text-muted mb-3">
              Select Students {selectedStudents.length > 0 && `(${selectedStudents.length} selected)`}
            </label>

            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <div
                className="text-center py-8 rounded-lg border"
                style={{
                  background: 'rgba(255, 191, 0, 0.08)',
                  borderColor: 'var(--warning)',
                }}
              >
                <p className="text-sm font-extrabold text-text mb-1">No students found</p>
                <p className="text-xs text-muted">Add students to your class before assigning lessons</p>
              </div>
            ) : (
              <div
                className="overflow-y-auto space-y-2 pr-1"
                style={{
                  maxHeight: '30vh',
                }}
              >
                {students.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                    style={{
                      borderColor: selectedStudents.includes(student.id)
                        ? 'var(--primary)'
                        : 'var(--border)',
                      background: selectedStudents.includes(student.id)
                        ? 'rgba(47, 183, 160, 0.08)'
                        : 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-4 h-4 rounded cursor-pointer"
                      style={{
                        accentColor: 'var(--primary)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-extrabold text-text truncate">
                        {getStudentDisplayName(student)}
                      </div>
                      <div className="text-xs text-muted truncate">{student.email}</div>
                      {student.experience_level && (
                        <div className="text-xs text-primary mt-0.5">
                          {student.experience_level}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wide text-muted mb-2">
              Notes for Student (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific instructions or context for this assignment..."
              className="w-full px-3 py-2 rounded-lg border text-sm resize-vertical"
              style={{
                background: 'var(--panel)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
                minHeight: '60px',
                maxHeight: '120px',
              }}
              rows={3}
              disabled={isAssigning}
            />
          </div>
        </div>

        {/* Footer - Fixed */}
        <div
          className="flex-shrink-0 border-t px-6 py-4 flex gap-3"
          style={{
            borderColor: 'var(--border)',
          }}
        >
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
            disabled={isAssigning || selectedStudents.length === 0}
          >
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Assign to {selectedStudents.length > 0 ? selectedStudents.length : ''} Student{selectedStudents.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
