'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Plus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { LessonService, type Lesson } from '@/services/lessonService'
import TeacherLessonCard from '@/components/lessons/TeacherLessonCard'

export default function TeacherLessonPlansPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.role !== 'teacher') {
      router.push('/')
      return
    }

    const loadLessons = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const fetchedLessons = await LessonService.getLessonsByCreator(user.id)
        setLessons(fetchedLessons)
      } catch (error) {
        console.error('Error loading lessons:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLessons()
  }, [user?.id, profile?.role, router])

  const handleRefreshLessons = async () => {
    if (!user?.id) return

    try {
      const fetchedLessons = await LessonService.getLessonsByCreator(user.id)
      setLessons(fetchedLessons)
    } catch (error) {
      console.error('Error refreshing lessons:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading your lesson plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/teacher/dashboard">
              <Button variant="secondary" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/lessons/create">
              <Button variant="primary" size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Lesson
              </Button>
            </Link>
          </div>

          {/* Page Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">My Lesson Plans</h1>
            <p className="text-white/80 text-lg">
              Manage and assign your voice training lessons
            </p>
          </div>

          {/* Lessons Grid */}
          {lessons.length === 0 ? (
            <div className="bg-white rounded-lg shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No Lesson Plans Yet</h2>
              <p className="text-gray-600 mb-6">
                Create your first lesson plan to get started with teaching
              </p>
              <Link href="/lessons/create">
                <Button variant="primary" className="flex items-center gap-2 mx-auto">
                  <Plus className="w-4 h-4" />
                  Create Your First Lesson
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              <div className="text-white/90 mb-4 text-sm">
                {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} found
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons.map((lesson) => (
                  <TeacherLessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onDelete={handleRefreshLessons}
                    onCopy={handleRefreshLessons}
                    onAssign={handleRefreshLessons}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
