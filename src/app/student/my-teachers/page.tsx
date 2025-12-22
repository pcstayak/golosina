'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { TeacherStudentService, type TeacherInfo } from '@/services/teacherStudentService'
import { LessonService, type LessonAssignment } from '@/services/lessonService'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, UserMinus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useNotification } from '@/hooks/useNotification'

export default function MyTeachersPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { showSuccess, showError } = useNotification()

  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [assignments, setAssignments] = useState<LessonAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.role !== 'student') {
      router.push('/')
      return
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, router])

  const loadData = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const [teacherList, assignmentList] = await Promise.all([
        TeacherStudentService.getStudentTeachers(user.id),
        LessonService.getLessonsAssignedToStudent(user.id)
      ])

      setTeachers(teacherList)
      setAssignments(assignmentList)
    } catch (error) {
      console.error('Error loading data:', error)
      showError('Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }

  const getTeacherDisplayName = (teacher: TeacherInfo) => {
    if (teacher.display_name) return teacher.display_name
    if (teacher.first_name || teacher.last_name) {
      return `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()
    }
    return teacher.email
  }

  const getAssignmentsForTeacher = (teacherId: string) => {
    return assignments.filter(a => a.assigned_by === teacherId)
  }

  const handleLeaveTeacher = async (relationshipId: string, teacherName: string) => {
    if (!user?.id) return

    const confirmed = confirm(
      `Leave ${teacherName}'s class? Your assignments will be archived but can be restored if you rejoin.`
    )
    if (!confirmed) return

    const result = await TeacherStudentService.leaveTeacher(
      relationshipId,
      user.id,
      'Student left class'
    )

    if (result.success) {
      showSuccess('Left teacher\'s class')
      loadData()
    } else {
      showError(result.error || 'Failed to leave class')
    }
  }

  const formatSpecialization = (spec: string) => {
    return spec.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>

          <Link href="/student/find-teacher">
            <Button variant="primary" size="sm">
              Find More Teachers
            </Button>
          </Link>
        </div>

        {/* Title */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Teachers</h1>
          <p className="text-gray-600">
            Manage your relationships with teachers and view assigned lessons
          </p>
        </div>

        {/* Teachers List */}
        <div className="space-y-4">
          {teachers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Teachers Yet</h3>
              <p className="text-gray-600 mb-4">
                Start learning by finding a teacher
              </p>
              <Link href="/student/find-teacher">
                <Button variant="primary">
                  Browse Teachers
                </Button>
              </Link>
            </div>
          ) : (
            teachers.map((teacher) => {
              const teacherAssignments = getAssignmentsForTeacher(teacher.id)
              return (
                <div
                  key={teacher.id}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden"
                >
                  {/* Teacher Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                          {getTeacherDisplayName(teacher)}
                        </h2>
                        <p className="text-sm text-gray-600 mb-3">{teacher.email}</p>

                        {teacher.specializations && teacher.specializations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {teacher.specializations.map(spec => (
                              <span
                                key={spec}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                              >
                                {formatSpecialization(spec)}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {teacher.years_experience && (
                            <span>Experience: {teacher.years_experience} years</span>
                          )}
                          {teacherAssignments.length > 0 && (
                            <span className="font-medium text-blue-600">
                              {teacherAssignments.length} {teacherAssignments.length === 1 ? 'lesson' : 'lessons'} assigned
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleLeaveTeacher(
                          teacher.relationship!.id,
                          getTeacherDisplayName(teacher)
                        )}
                        className="flex items-center gap-2"
                      >
                        <UserMinus className="w-4 h-4" />
                        Leave Class
                      </Button>
                    </div>

                    {teacher.bio && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{teacher.bio}</p>
                      </div>
                    )}
                  </div>

                  {/* Assigned Lessons */}
                  {teacherAssignments.length > 0 && (
                    <div className="p-6">
                      <h3 className="font-semibold text-gray-800 mb-3">Assigned Lessons</h3>
                      <div className="space-y-2">
                        {teacherAssignments.map((assignment) => (
                          <Link
                            key={assignment.id}
                            href={`/lessons/practice/${assignment.lesson_id}`}
                          >
                            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">
                                    {assignment.lesson?.title || 'Untitled Lesson'}
                                  </h4>
                                  {assignment.lesson?.description && (
                                    <p className="text-sm text-gray-600 mb-2">
                                      {assignment.lesson.description}
                                    </p>
                                  )}
                                  {assignment.notes && (
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                      <p className="text-sm text-blue-900">
                                        <span className="font-medium">Teacher notes:</span> {assignment.notes}
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500 mt-2">
                                    Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Button variant="primary" size="sm">
                                  Practice
                                </Button>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
