'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { LessonService, type Lesson } from '@/services/lessonService'
import { Button } from '@/components/ui/Button'
import { Panel, PanelHeader, PanelContent } from '@/components/ui/Panel'
import { ArrowLeft, Plus, Book } from 'lucide-react'
import Link from 'next/link'
import LessonCard from '@/components/lessons/LessonCard'

export default function TeacherLessonsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.role !== 'teacher') {
      router.push('/')
      return
    }

    loadLessons()
  }, [profile?.role, router, user?.id])

  const loadLessons = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const lessonsData = await LessonService.getLessonsByCreator(user.id)
      setLessons(lessonsData)
    } catch (error) {
      console.error('Error loading lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLesson = async () => {
    loadLessons()
  }

  const handleCopyLesson = async () => {
    loadLessons()
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-custom mx-auto px-4 py-6">
        <Panel>
          <PanelHeader>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/teacher/dashboard">
                  <Button size="sm" variant="secondary">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <h1 className="text-lg font-extrabold text-text m-0">Lessons Management</h1>
              </div>
              <div className="text-[12.5px] text-muted mt-1">
                Manage all your created lessons
              </div>
            </div>
            <div className="flex gap-2.5">
              <Link href="/lessons/create">
                <Button size="sm" variant="primary">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create lesson
                </Button>
              </Link>
            </div>
          </PanelHeader>

          <PanelContent>
            <div className="flex items-center gap-2 mb-4">
              <Book className="w-5 h-5 text-muted" />
              <div className="text-sm font-bold text-text">
                Total lessons: {loading ? '...' : lessons.length}
              </div>
            </div>

            {loading ? (
              <div className="text-center text-muted py-8">Loading lessons...</div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-12">
                <Book className="w-16 h-16 text-muted mx-auto mb-4" />
                <p className="text-muted mb-4">No lessons created yet</p>
                <Link href="/lessons/create">
                  <Button variant="primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first lesson
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onDelete={handleDeleteLesson}
                    onCopy={handleCopyLesson}
                  />
                ))}
              </div>
            )}
          </PanelContent>
        </Panel>
      </div>
    </div>
  )
}
