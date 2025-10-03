'use client'

import { FreehandLesson } from '@/services/freehandLessonService'
import { Button } from '@/components/ui/Button'
import { Video, Calendar, Play, User, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AssignedLessonCardProps {
  lesson: FreehandLesson & { teacherName?: string; assignedAt: string; assignmentNotes?: string }
}

export default function AssignedLessonCard({ lesson }: AssignedLessonCardProps) {
  const router = useRouter()

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

  const videoCount = lesson.videos?.length || 0

  const handleStartLesson = () => {
    if (lesson.id) {
      router.push(`/freehand/practice/${lesson.id}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border-l-4 border-purple-500">
      <div className="p-4">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-600">
              From {lesson.teacherName || 'Teacher'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            {lesson.title}
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {truncateDescription(lesson.description)}
        </p>

        {lesson.assignmentNotes && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-800 mb-1">Teacher Notes</p>
                <p className="text-xs text-blue-700">{lesson.assignmentNotes}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Video className="w-4 h-4" />
            <span>{videoCount} {videoCount === 1 ? 'video' : 'videos'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>Assigned {formatDate(lesson.assignedAt)}</span>
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
  )
}
