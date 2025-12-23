'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { TeacherStudentService } from '@/services/teacherStudentService'
import { PracticeService, type PracticeWithDetails } from '@/services/practiceService'
import { LessonService } from '@/services/lessonService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Panel, PanelHeader, PanelContent } from '@/components/ui/Panel'
import { LogOut } from 'lucide-react'
import Link from 'next/link'

export default function TeacherDashboard() {
  const { profile, user, signOut } = useAuth()
  const router = useRouter()

  const [activeStudentsCount, setActiveStudentsCount] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [practices, setPractices] = useState<PracticeWithDetails[]>([])
  const [lessonsCreatedCount, setLessonsCreatedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        const [students, requests, practiceData, lessons] = await Promise.all([
          TeacherStudentService.getTeacherStudents(user.id),
          TeacherStudentService.getTeacherPendingRequests(user.id),
          PracticeService.getTeacherStudentPractices(user.id),
          LessonService.getLessonsByCreator(user.id)
        ])

        setActiveStudentsCount(students.length)
        setPendingRequestsCount(requests.length)
        setPractices(practiceData)
        setLessonsCreatedCount(lessons.length)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const result = await signOut()
      if (!result.success) {
        console.error('Logout failed:', result.error)
      }
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleNavigateToStudents = () => {
    router.push('/teacher/students')
  }

  const handleNavigateToLessons = () => {
    router.push('/teacher/lessons')
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStudentName = (practice: PracticeWithDetails): string => {
    const profile = practice.student_profile
    if (!profile) return 'Unknown Student'
    if (profile.display_name) return profile.display_name
    if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`
    if (profile.first_name) return profile.first_name
    return profile.email || 'Unknown Student'
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-custom mx-auto px-4 py-6">
        <Panel>
          <PanelHeader>
            <div>
              <h1 className="text-lg font-extrabold text-text m-0">Teacher Dashboard</h1>
              <div className="text-[12.5px] text-muted mt-1">Scan, review, respond</div>
            </div>
            <div className="flex gap-2.5">
              <Button size="sm" variant="secondary">Settings</Button>
              <Button size="sm" variant="primary">Create lesson</Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </PanelHeader>

          <PanelContent>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div
                onClick={handleNavigateToStudents}
                className="p-3 border border-border rounded-[14px] bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)] cursor-pointer hover:bg-[rgba(255,255,255,0.08)] [html[data-theme='mist']_&]:hover:bg-[rgba(17,24,39,0.06)] transition-colors"
              >
                <div className="text-xs text-muted">Active students</div>
                <div className="text-xl font-black mt-1.5">{loading ? '...' : activeStudentsCount}</div>
              </div>
              <div className="p-3 border border-border rounded-[14px] bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)]">
                <div className="text-xs text-muted">Pending reviews</div>
                <div className="text-xl font-black mt-1.5">
                  {loading ? '...' : practices.filter(p => !p.reviewed_at).length}
                </div>
              </div>
              <div
                onClick={handleNavigateToLessons}
                className="p-3 border border-border rounded-[14px] bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)] cursor-pointer hover:bg-[rgba(255,255,255,0.08)] [html[data-theme='mist']_&]:hover:bg-[rgba(17,24,39,0.06)] transition-colors"
              >
                <div className="text-xs text-muted">Lessons created</div>
                <div className="text-xl font-black mt-1.5">{loading ? '...' : lessonsCreatedCount}</div>
              </div>
            </div>

            {/* Student Homework Section */}
            <div className="mt-3.5 flex items-center justify-between gap-2.5 mb-3">
              <div>
                <h2 className="text-base font-extrabold text-text m-0">Student homework</h2>
                <div className="text-[12.5px] text-muted">Compact list optimized for scanning</div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant="assigned">Assigned</Badge>
                <Badge variant="reviewed">Reviewed</Badge>
              </div>
            </div>

            {/* Homework Table */}
            <div className="border border-border rounded-[14px] overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2.5 px-3 py-3 items-center bg-panel-2 text-xs text-muted font-extrabold">
                <div>Title</div>
                <div>Student</div>
                <div>Steps</div>
                <div>Recordings</div>
                <div></div>
              </div>

              {/* Table Rows */}
              {loading ? (
                <div className="px-3 py-8 text-center text-muted">Loading...</div>
              ) : practices.length === 0 ? (
                <div className="px-3 py-8 text-center text-muted">No homework submissions yet</div>
              ) : (
                practices.map((practice) => (
                  <div
                    key={practice.practice_id}
                    className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2.5 px-3 py-3 items-center border-t border-border bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)]"
                  >
                    <div>
                      <div className="font-black">{practice.title}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {practice.reviewed_at ? 'Reviewed' : 'Assigned'} · {formatDate(practice.created_at)}
                      </div>
                    </div>
                    <div className="text-xs text-muted">{getStudentName(practice)}</div>
                    <div className="text-xs text-muted">{PracticeService.getStepCount(practice)}</div>
                    <div className="text-xs text-muted">{practice.recording_count}</div>
                    <div>
                      <Link href={`/practices/${practice.practice_id}`}>
                        <Button size="sm" variant={practice.reviewed_at ? 'secondary' : 'primary'}>
                          {practice.reviewed_at ? 'Open' : 'View practice'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PanelContent>
        </Panel>
      </div>
    </div>
  )
}