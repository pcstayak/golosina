'use client'

import { LessonAssignment } from '@/services/lessonService'
import { Button } from '@/components/ui/Button'
import { Play, Calendar, Layers, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AssignedLessonCardProps {
  assignment: LessonAssignment
}

export default function AssignedLessonCard({ assignment }: AssignedLessonCardProps) {
  const router = useRouter()

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

  const lesson = assignment.lesson

  if (!lesson) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border-l-4 border-blue-500">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex-1 mr-2">
            {lesson.title}
          </h3>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            Assigned
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {truncateDescription(lesson.description)}
        </p>

        {assignment.notes && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-1">Teacher's Note:</p>
            <p className="text-sm text-blue-800">{assignment.notes}</p>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          {assignment.teacher_name && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{assignment.teacher_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            <span>{lesson.steps.length} {lesson.steps.length === 1 ? 'step' : 'steps'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>Assigned {formatDate(assignment.assigned_at)}</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push(`/lessons/practice/${lesson.id}?assignmentId=${assignment.id}`)}
          className="w-full flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          Start Practice
        </Button>
      </div>
    </div>
  )
}
