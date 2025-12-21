'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { TeacherStudentService, type TeacherInfo } from '@/services/teacherStudentService'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Search, Send, Check, Clock } from 'lucide-react'
import Link from 'next/link'
import { useNotification } from '@/hooks/useNotification'

export default function FindTeacherPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { showSuccess, showError } = useNotification()

  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all')
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile?.role !== 'student') {
      router.push('/')
      return
    }

    loadTeachers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, router])

  useEffect(() => {
    filterTeachers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedSpecialization, teachers])

  const loadTeachers = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const teacherList = await TeacherStudentService.getBrowsableTeachers(user.id)
      setTeachers(teacherList)
      setFilteredTeachers(teacherList)
    } catch (error) {
      console.error('Error loading teachers:', error)
      showError('Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }

  const filterTeachers = () => {
    let filtered = teachers

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(teacher => {
        const displayName = getTeacherDisplayName(teacher).toLowerCase()
        const email = teacher.email.toLowerCase()
        const bio = teacher.bio?.toLowerCase() || ''
        return displayName.includes(query) || email.includes(query) || bio.includes(query)
      })
    }

    // Filter by specialization
    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(teacher =>
        teacher.specializations?.includes(selectedSpecialization)
      )
    }

    setFilteredTeachers(filtered)
  }

  const getTeacherDisplayName = (teacher: TeacherInfo) => {
    if (teacher.display_name) return teacher.display_name
    if (teacher.first_name || teacher.last_name) {
      return `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()
    }
    return teacher.email
  }

  const getRelationshipStatus = (teacher: TeacherInfo) => {
    if (!teacher.relationship) return null
    return teacher.relationship.status
  }

  const handleSendRequest = async (teacherId: string) => {
    if (!user?.id) return

    setSelectedTeacherId(teacherId)
    setShowMessageModal(true)
  }

  const handleSubmitRequest = async () => {
    if (!user?.id || !selectedTeacherId) return

    const result = await TeacherStudentService.sendJoinRequest(
      selectedTeacherId,
      user.id,
      message.trim() || undefined
    )

    if (result.success) {
      showSuccess('Join request sent to teacher')
      setShowMessageModal(false)
      setMessage('')
      setSelectedTeacherId(null)
      loadTeachers()
    } else {
      showError(result.error || 'Failed to send request')
    }
  }

  const handleCancelRequest = async (relationshipId: string) => {
    if (!user?.id) return

    const confirmed = confirm('Cancel your join request to this teacher?')
    if (!confirmed) return

    const result = await TeacherStudentService.cancelJoinRequest(relationshipId, user.id)
    if (result.success) {
      showSuccess('Request cancelled')
      loadTeachers()
    } else {
      showError(result.error || 'Failed to cancel request')
    }
  }

  const specializations = [
    'all',
    'classical',
    'opera',
    'pop_rock',
    'musical_theatre',
    'jazz',
    'country',
    'r_and_b',
    'gospel',
    'folk',
    'speech_therapy',
    'accent_reduction',
    'voice_over',
    'choral',
    'other'
  ]

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
        <div className="mb-6">
          <Link href="/">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>

        {/* Title */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Find a Teacher</h1>
          <p className="text-gray-600">
            Browse available voice teachers and send join requests
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or bio..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Specialization Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {specializations.map(spec => (
                  <option key={spec} value={spec}>
                    {spec === 'all' ? 'All Specializations' : formatSpecialization(spec)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {filteredTeachers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <p className="text-gray-600">
                {searchQuery || selectedSpecialization !== 'all'
                  ? 'No teachers found matching your criteria'
                  : 'No teachers available at this time'}
              </p>
            </div>
          ) : (
            filteredTeachers.map((teacher) => {
              const status = getRelationshipStatus(teacher)
              return (
                <div
                  key={teacher.id}
                  className="bg-white rounded-lg shadow-sm border p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">
                        {getTeacherDisplayName(teacher)}
                      </h2>
                      <p className="text-sm text-gray-600 mb-2">{teacher.email}</p>

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

                      {teacher.years_experience && (
                        <p className="text-sm text-gray-600 mb-1">
                          Experience: {teacher.years_experience} years
                        </p>
                      )}

                      {(teacher.hourly_rate_min || teacher.hourly_rate_max) && (
                        <p className="text-sm text-gray-600">
                          Rate: ${teacher.hourly_rate_min}
                          {teacher.hourly_rate_max !== teacher.hourly_rate_min && ` - $${teacher.hourly_rate_max}`}
                          /hour
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      {status === 'active' ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                          <Check className="w-4 h-4" />
                          <span className="text-sm font-medium">Your Teacher</span>
                        </div>
                      ) : status === 'pending_student_request' ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">Request Pending</span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCancelRequest(teacher.relationship!.id)}
                          >
                            Cancel Request
                          </Button>
                        </div>
                      ) : status === 'pending_teacher_invite' ? (
                        <Link href="/student/invitations">
                          <Button variant="primary" size="sm">
                            View Invitation
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSendRequest(teacher.id)}
                          className="flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Request to Join
                        </Button>
                      )}
                    </div>
                  </div>

                  {teacher.bio && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{teacher.bio}</p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Send Join Request</h2>
              <p className="text-sm text-gray-600 mt-1">
                Add an optional message to introduce yourself
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the teacher about yourself and your goals..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowMessageModal(false)
                  setMessage('')
                  setSelectedTeacherId(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitRequest}
                className="flex-1"
              >
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
