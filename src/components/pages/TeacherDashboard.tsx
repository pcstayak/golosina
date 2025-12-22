'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { TeacherStudentService } from '@/services/teacherStudentService'
import HomeworkReview from '@/components/teacher/HomeworkReview'

export default function TeacherDashboard() {
  const { profile, user, signOut } = useAuth()
  const router = useRouter()

  const [activeStudentsCount, setActiveStudentsCount] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCounts = async () => {
      if (!user?.id) return

      try {
        const [students, requests] = await Promise.all([
          TeacherStudentService.getTeacherStudents(user.id),
          TeacherStudentService.getTeacherPendingRequests(user.id)
        ])

        setActiveStudentsCount(students.length)
        setPendingRequestsCount(requests.length)
      } catch (error) {
        console.error('Error loading student counts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCounts()
  }, [user?.id])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleLaunchVoiceTrainer = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {profile?.display_name || profile?.first_name || user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-purple-800">My Students</h3>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded-full">
                    {pendingRequestsCount}
                  </span>
                )}
              </div>
              <p className="text-purple-600 mb-1">Manage your student roster and track progress</p>
              {!loading && (
                <p className="text-sm text-purple-700 mb-3">
                  {activeStudentsCount} active {activeStudentsCount === 1 ? 'student' : 'students'}
                  {pendingRequestsCount > 0 && `, ${pendingRequestsCount} pending`}
                </p>
              )}
              <button
                onClick={() => router.push('/teacher/students')}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                View Students
              </button>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Lesson Plans</h3>
              <p className="text-blue-600">Create and manage voice training lesson plans</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => router.push('/teacher/lesson-plans')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  View Lessons
                </button>
                <button
                  onClick={() => router.push('/lessons/create')}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Create New
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {loading ? '...' : activeStudentsCount}
                </div>
                <div className="text-sm text-gray-600">Active Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Lesson Plans</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {loading ? '...' : pendingRequestsCount}
                </div>
                <div className="text-sm text-gray-600">Pending Requests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">0</div>
                <div className="text-sm text-gray-600">Shared Sessions</div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Student Homework</h2>
            <HomeworkReview />
          </div>
        </div>
      </div>
    </div>
  )
}