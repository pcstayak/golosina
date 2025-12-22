'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, Search, User } from 'lucide-react'
import Link from 'next/link'
import { LessonService, type Lesson } from '@/services/lessonService'
import { useNotification } from '@/hooks/useNotification'
import { supabase } from '@/lib/supabase'

interface Student {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
}

export default function SelectStudentPage() {
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const { user, profile } = useAuth()
  const { showError } = useNotification()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    if (profile?.role !== 'teacher') {
      router.push('/')
      return
    }

    const loadData = async () => {
      if (!params?.lessonId) {
        setLoading(false)
        return
      }

      try {
        const [fetchedLesson, studentsResult] = await Promise.all([
          LessonService.getLesson(params.lessonId),
          fetchStudents()
        ])

        if (fetchedLesson) {
          setLesson(fetchedLesson)
        }

        if (studentsResult) {
          setStudents(studentsResult)
          setFilteredStudents(studentsResult)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        showError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.lessonId, profile?.role, router])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = students.filter(student => {
      const displayName = student.display_name?.toLowerCase() || ''
      const firstName = student.first_name?.toLowerCase() || ''
      const lastName = student.last_name?.toLowerCase() || ''
      const email = student.email?.toLowerCase() || ''

      return displayName.includes(query) ||
             firstName.includes(query) ||
             lastName.includes(query) ||
             email.includes(query)
    })

    setFilteredStudents(filtered)
  }, [searchQuery, students])

  const fetchStudents = async () => {
    if (!user?.id) {
      return []
    }

    try {
      const students = await LessonService.getAssignableStudents(user.id)
      return students
    } catch (error) {
      console.error('Error fetching students:', error)
      return []
    }
  }

  const handleNext = () => {
    if (!selectedStudent || !lesson) return
    router.push(`/teacher/assign-lesson/${lesson.id}/annotate?studentId=${selectedStudent.id}`)
  }

  const getStudentDisplayName = (student: Student) => {
    if (student.display_name) return student.display_name
    if (student.first_name || student.last_name) {
      return `${student.first_name || ''} ${student.last_name || ''}`.trim()
    }
    return student.email
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Lesson Not Found</h1>
          <p className="text-gray-600 mb-6">
            The lesson you are trying to assign could not be found.
          </p>
          <Link href="/teacher/lesson-plans">
            <Button variant="primary" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Lesson Plans
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/teacher/lesson-plans">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Lesson Plans
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            disabled={!selectedStudent}
            className="flex items-center gap-2"
          >
            Next: Add Annotations
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Lesson Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Assign Lesson to Student</h1>
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Lesson: {lesson.title}</p>
            {lesson.description && (
              <p className="text-sm text-blue-700 mt-1">{lesson.description}</p>
            )}
            <p className="text-xs text-blue-600 mt-2">
              {lesson.steps.length} {lesson.steps.length === 1 ? 'step' : 'steps'}
            </p>
          </div>
        </div>

        {/* Student Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Select Student</h2>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'No students found matching your search' : 'No students in your class yet'}
              </p>
              {!searchQuery && (
                <Link href="/teacher/students">
                  <Button variant="primary" size="sm">
                    Add Students to Your Class
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full p-4 border rounded-lg text-left transition-all ${
                    selectedStudent?.id === student.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getStudentDisplayName(student)}
                      </p>
                      <p className="text-sm text-gray-600">{student.email}</p>
                    </div>
                    {selectedStudent?.id === student.id && (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Student Summary */}
        {selectedStudent && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-900">
              Selected: {getStudentDisplayName(selectedStudent)}
            </p>
            <p className="text-xs text-green-700 mt-1">
              Click "Next" to add student-specific annotations for this lesson
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
