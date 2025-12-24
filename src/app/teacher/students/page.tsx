'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { TeacherStudentService, type StudentInfo } from '@/services/teacherStudentService'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, UserPlus, Users, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { useNotification } from '@/hooks/useNotification'

export default function TeacherStudentsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { showSuccess, showError } = useNotification()

  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active')
  const [activeStudents, setActiveStudents] = useState<StudentInfo[]>([])
  const [pendingRequests, setPendingRequests] = useState<StudentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [allStudents, setAllStudents] = useState<StudentInfo[]>([])

  useEffect(() => {
    if (profile?.role !== 'teacher') {
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
      const [active, pending] = await Promise.all([
        TeacherStudentService.getTeacherStudents(user.id),
        TeacherStudentService.getTeacherPendingRequests(user.id)
      ])

      setActiveStudents(active)
      setPendingRequests(pending)
    } catch (error) {
      console.error('Error loading students:', error)
      showError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const loadAllStudents = async () => {
    if (!user?.id) return

    try {
      const { supabase } = await import('@/lib/supabase')
      if (!supabase) return

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, display_name')
        .eq('role', 'student')
        .order('display_name')

      if (!error && data) {
        // Filter out students already in active relationships or pending
        const existingIds = new Set([
          ...activeStudents.map(s => s.id),
          ...pendingRequests.map(s => s.id)
        ])
        setAllStudents(data.filter(s => !existingIds.has(s.id)))
      }
    } catch (error) {
      console.error('Error loading all students:', error)
    }
  }

  const handleAcceptRequest = async (relationshipId: string) => {
    if (!user?.id) return

    const result = await TeacherStudentService.acceptJoinRequest(relationshipId, user.id)
    if (result.success) {
      showSuccess('Student added to your class')
      loadData()
    } else {
      showError(result.error || 'Failed to accept request')
    }
  }

  const handleRejectRequest = async (relationshipId: string) => {
    if (!user?.id) return

    const confirmed = confirm('Are you sure you want to reject this request?')
    if (!confirmed) return

    const result = await TeacherStudentService.rejectJoinRequest(relationshipId, user.id)
    if (result.success) {
      showSuccess('Request rejected')
      loadData()
    } else {
      showError(result.error || 'Failed to reject request')
    }
  }

  const handleRemoveStudent = async (relationshipId: string, studentName: string) => {
    if (!user?.id) return

    const confirmed = confirm(
      `Remove ${studentName} from your class? Their assignments will be archived but can be restored if they rejoin.`
    )
    if (!confirmed) return

    const result = await TeacherStudentService.removeStudent(relationshipId, user.id, 'Teacher removed student')
    if (result.success) {
      showSuccess('Student removed from class')
      loadData()
    } else {
      showError(result.error || 'Failed to remove student')
    }
  }

  const handleAddStudent = async (studentId: string) => {
    if (!user?.id) return

    const result = await TeacherStudentService.addStudent(user.id, studentId)
    if (result.success) {
      showSuccess('Student added to your class')
      setShowAddModal(false)
      loadData()
    } else {
      showError(result.error || 'Failed to add student')
    }
  }

  const getStudentDisplayName = (student: StudentInfo) => {
    if (student.display_name) return student.display_name
    if (student.first_name || student.last_name) {
      return `${student.first_name || ''} ${student.last_name || ''}`.trim()
    }
    return student.email
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-custom mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/teacher/dashboard">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              loadAllStudents()
              setShowAddModal(true)
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </Button>
        </div>

        {/* Title */}
        <div className="bg-[var(--panel)] rounded-[14px] border border-[var(--border)] p-6 mb-6">
          <h1 className="text-2xl font-extrabold text-[var(--text)] mb-2">My Students</h1>
          <p className="text-[var(--muted)]">
            Manage your student roster and handle join requests
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-[var(--panel)] rounded-[14px] border border-[var(--border)] mb-6">
          <div className="border-b border-[var(--border)]">
            <div className="flex">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 px-6 py-3 text-sm font-extrabold transition-colors ${
                  activeTab === 'active'
                    ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Active Students ({activeStudents.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 px-6 py-3 text-sm font-extrabold transition-colors relative ${
                  activeTab === 'pending'
                    ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Pending Requests ({pendingRequests.length})
                  {pendingRequests.length > 0 && (
                    <span className="absolute top-2 right-6 w-2 h-2 bg-[var(--danger)] rounded-full"></span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'active' ? (
              activeStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
                  <h3 className="text-lg font-extrabold text-[var(--text)] mb-2">No Active Students</h3>
                  <p className="text-[var(--muted)] mb-4">
                    Start building your class by adding students
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      loadAllStudents()
                      setShowAddModal(true)
                    }}
                  >
                    Add Your First Student
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border border-[var(--border)] rounded-[10px] bg-[var(--bg)] hover:bg-[var(--panel-2)] transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-extrabold text-[var(--text)]">
                          {getStudentDisplayName(student)}
                        </h3>
                        <p className="text-sm text-[var(--muted)]">{student.email}</p>
                        {student.experience_level && (
                          <p className="text-xs text-[var(--muted)] mt-1">
                            Level: {student.experience_level}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveStudent(student.relationship!.id, getStudentDisplayName(student))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
                  <h3 className="text-lg font-extrabold text-[var(--text)] mb-2">No Pending Requests</h3>
                  <p className="text-[var(--muted)]">
                    You'll see join requests from students here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 border border-[var(--border)] rounded-[10px] bg-[var(--bg)]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-extrabold text-[var(--text)]">
                            {getStudentDisplayName(student)}
                          </h3>
                          <p className="text-sm text-[var(--muted)]">{student.email}</p>
                          <p className="text-xs text-[var(--muted)] mt-1">
                            Requested: {new Date(student.relationship!.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {student.relationship?.student_message && (
                        <div className="mb-3 p-3 bg-[rgba(var(--primary-rgb),0.1)] border border-[var(--primary)] rounded-[10px]">
                          <p className="text-sm text-[var(--text)]">{student.relationship.student_message}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAcceptRequest(student.relationship!.id)}
                          className="flex-1"
                        >
                          Accept
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRejectRequest(student.relationship!.id)}
                          className="flex-1"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.80)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-[14px] shadow-[var(--shadow)] max-w-2xl w-full max-h-[80vh] overflow-hidden border border-[var(--border)]" style={{ background: 'rgba(11, 18, 32, 0.95)', backdropFilter: 'blur(20px)' }}>
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-xl font-extrabold text-[var(--text)]">Add Student to Your Class</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                Select a student to add directly to your class
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {allStudents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--muted)]">No available students to add</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border border-[var(--border)] rounded-[10px] bg-[var(--panel)] hover:bg-[var(--panel-2)] transition-colors"
                    >
                      <div>
                        <p className="font-extrabold text-[var(--text)]">
                          {getStudentDisplayName(student)}
                        </p>
                        <p className="text-sm text-[var(--muted)]">{student.email}</p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddStudent(student.id)}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--border)]">
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
