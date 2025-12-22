'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { TeacherStudentService, type TeacherInfo } from '@/services/teacherStudentService'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Mail, Check, X } from 'lucide-react'
import Link from 'next/link'
import { useNotification } from '@/hooks/useNotification'

export default function InvitationsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { showSuccess, showError } = useNotification()

  const [invitations, setInvitations] = useState<TeacherInfo[]>([])
  const [pendingRequests, setPendingRequests] = useState<TeacherInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'invitations' | 'requests'>('invitations')

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
      const [invites, requests] = await Promise.all([
        TeacherStudentService.getStudentPendingInvites(user.id),
        TeacherStudentService.getStudentPendingRequests(user.id)
      ])

      setInvitations(invites)
      setPendingRequests(requests)
    } catch (error) {
      console.error('Error loading invitations:', error)
      showError('Failed to load invitations')
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

  const handleAcceptInvite = async (relationshipId: string) => {
    if (!user?.id) return

    const result = await TeacherStudentService.acceptTeacherInvite(relationshipId, user.id)
    if (result.success) {
      showSuccess('Invitation accepted')
      loadData()
    } else {
      showError(result.error || 'Failed to accept invitation')
    }
  }

  const handleDeclineInvite = async (relationshipId: string) => {
    if (!user?.id) return

    const confirmed = confirm('Are you sure you want to decline this invitation?')
    if (!confirmed) return

    const result = await TeacherStudentService.rejectJoinRequest(relationshipId, user.id)
    if (result.success) {
      showSuccess('Invitation declined')
      loadData()
    } else {
      showError(result.error || 'Failed to decline invitation')
    }
  }

  const handleCancelRequest = async (relationshipId: string) => {
    if (!user?.id) return

    const confirmed = confirm('Cancel your join request to this teacher?')
    if (!confirmed) return

    const result = await TeacherStudentService.cancelJoinRequest(relationshipId, user.id)
    if (result.success) {
      showSuccess('Request cancelled')
      loadData()
    } else {
      showError(result.error || 'Failed to cancel request')
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
      <div className="max-w-4xl mx-auto px-4 py-8">
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
              Find Teachers
            </Button>
          </Link>
        </div>

        {/* Title */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invitations & Requests</h1>
          <p className="text-gray-600">
            Manage teacher invitations and track your join requests
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('invitations')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'invitations'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  Teacher Invitations ({invitations.length})
                  {invitations.length > 0 && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'requests'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  My Requests ({pendingRequests.length})
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'invitations' ? (
              invitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Invitations</h3>
                  <p className="text-gray-600">
                    You'll see teacher invitations here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-gray-900 mb-1">
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

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {teacher.years_experience && (
                              <span>Experience: {teacher.years_experience} years</span>
                            )}
                            <span className="text-xs text-gray-500">
                              Invited: {new Date(teacher.relationship!.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {teacher.bio && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{teacher.bio}</p>
                        </div>
                      )}

                      {teacher.relationship?.teacher_notes && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm font-medium text-blue-900 mb-1">Message from teacher:</p>
                          <p className="text-sm text-blue-800">{teacher.relationship.teacher_notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptInvite(teacher.relationship!.id)}
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Accept Invitation
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeclineInvite(teacher.relationship!.id)}
                          className="flex-1 flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Check className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pending Requests</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't sent any join requests
                  </p>
                  <Link href="/student/find-teacher">
                    <Button variant="primary">
                      Browse Teachers
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-gray-900 mb-1">
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

                          <p className="text-xs text-gray-500">
                            Requested: {new Date(teacher.relationship!.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded">
                          Pending
                        </div>
                      </div>

                      {teacher.relationship?.student_message && (
                        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
                          <p className="text-sm font-medium text-gray-700 mb-1">Your message:</p>
                          <p className="text-sm text-gray-600">{teacher.relationship.student_message}</p>
                        </div>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCancelRequest(teacher.relationship!.id)}
                        className="w-full"
                      >
                        Cancel Request
                      </Button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
