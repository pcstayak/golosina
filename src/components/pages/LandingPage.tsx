'use client'

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Panel, PanelHeader, PanelContent } from '@/components/ui/Panel';
import { Settings, LogOut, Home, Mic, MessageSquare, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import SettingsModal from '@/components/modals/SettingsModal';
import Link from 'next/link';
import { PracticeService, Practice } from '@/services/practiceService';
import { useNotification } from '@/hooks/useNotification';
import { LessonService, type Lesson, type LessonAssignment } from '@/services/lessonService';

export default function LandingPage() {
  const { state, dispatch } = useApp();
  const { signOut, profile, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [showSettings, setShowSettings] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [myLessons, setMyLessons] = useState<Lesson[]>([]);
  const [assignedToMeLessons, setAssignedToMeLessons] = useState<LessonAssignment[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loadingMyLessons, setLoadingMyLessons] = useState(true);
  const [loadingAssignedToMe, setLoadingAssignedToMe] = useState(true);
  const [loadingPractices, setLoadingPractices] = useState(true);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await signOut();
      if (!result.success) {
        console.error('Logout failed:', result.error);
        // You could add toast notification here if available
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleReturnToDashboard = () => {
    if (profile?.role === 'admin') {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'admin-dashboard' });
    } else if (profile?.role === 'teacher') {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'teacher-dashboard' });
    }
  };

  // Load lessons and practices
  useEffect(() => {
    const loadMyLessons = async () => {
      if (!user?.id) {
        setLoadingMyLessons(false);
        return;
      }

      try {
        const lessons = await LessonService.getLessonsByCreator(user.id);
        setMyLessons(lessons);
      } catch (error) {
        console.error('Error loading my lessons:', error);
      } finally {
        setLoadingMyLessons(false);
      }
    };

    loadMyLessons();
  }, [user?.id]);

  useEffect(() => {
    const loadAssignedToMe = async () => {
      if (!user?.id) {
        setLoadingAssignedToMe(false);
        return;
      }

      try {
        const assignments = await LessonService.getLessonsAssignedToStudent(user.id);
        setAssignedToMeLessons(assignments);
      } catch (error) {
        console.error('Error loading assigned lessons:', error);
      } finally {
        setLoadingAssignedToMe(false);
      }
    };

    loadAssignedToMe();
  }, [user?.id]);

  useEffect(() => {
    const loadPractices = async () => {
      try {
        const practiceList = await PracticeService.getSharedPractices();
        setPractices(practiceList);
      } catch (error) {
        console.error('Error loading practices:', error);
      } finally {
        setLoadingPractices(false);
      }
    };

    loadPractices();
  }, []);

  const handleDeletePractice = async () => {
    try {
      const practiceList = await PracticeService.getSharedPractices();
      setPractices(practiceList);
    } catch (error) {
      console.error('Error refreshing practices:', error);
    }
  };

  const handleCopyPracticeLink = (practiceId: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/practices/${practiceId}`;

    navigator.clipboard.writeText(url);
    showSuccess('Link copied to clipboard');
  };


  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const groupedPractices = practices.reduce((acc, practice) => {
    const lessonId = practice.lesson_id || 'archived';
    if (!acc[lessonId]) {
      acc[lessonId] = {
        lessonId,
        lessonTitle: (practice as any).title || 'Untitled Lesson',
        practices: []
      };
    }
    acc[lessonId].practices.push(practice);
    return acc;
  }, {} as Record<string, { lessonId: string; lessonTitle: string; practices: Practice[] }>);

  const sortedGroupedPractices = Object.values(groupedPractices).sort((a, b) => {
    const aLatest = Math.max(...a.practices.map(p => new Date(p.created_at).getTime()));
    const bLatest = Math.max(...b.practices.map(p => new Date(p.created_at).getTime()));
    return bLatest - aLatest;
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-custom mx-auto px-4 py-6">
        <Panel>
          <PanelHeader>
            <div>
              <h1 className="text-lg font-extrabold text-text m-0">Student Dashboard</h1>
              <div className="text-[12.5px] text-muted mt-1">Practice, learn, improve</div>
            </div>
            <div className="flex gap-2.5">
              {(profile?.role === 'admin' || profile?.role === 'teacher') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReturnToDashboard}
                >
                  <Home className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Link href="/lessons/create">
                <Button variant="primary" size="sm">Create lesson</Button>
              </Link>
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
              <div className="p-3 border border-border rounded-[14px] bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)]">
                <div className="text-xs text-muted">LESSONS ASSIGNED</div>
                <div className="text-xl font-black mt-1.5">
                  {loadingAssignedToMe ? '...' : assignedToMeLessons.length}
                </div>
              </div>
              <div className="p-3 border border-border rounded-[14px] bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)]">
                <div className="text-xs text-muted">PENDING PRACTICES</div>
                <div className="text-xl font-black mt-1.5">
                  {loadingAssignedToMe ? '...' : assignedToMeLessons.filter(a => !practices.some(p => p.lesson_id === a.lesson_id)).length}
                </div>
              </div>
              <div className="p-3 border border-border rounded-[14px] bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)]">
                <div className="text-xs text-muted">COMPLETED PRACTICES</div>
                <div className="text-xl font-black mt-1.5">
                  {loadingPractices ? '...' : practices.length}
                </div>
              </div>
            </div>

            {/* Lessons Assigned to Me Section */}
            {assignedToMeLessons.length > 0 && (
              <>
                <div className="mt-3.5 flex items-center justify-between gap-2.5 mb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-text m-0">Lessons from Teachers</h2>
                    <div className="text-[12.5px] text-muted">Assigned lessons to practice</div>
                  </div>
                </div>

                <div className="border border-border rounded-[14px] overflow-hidden mb-4">
                  {loadingAssignedToMe ? (
                    <div className="px-3 py-8 text-center text-muted">Loading...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-0">
                      {assignedToMeLessons.map((assignment, index) => {
                        const hasPractice = practices.some(p => p.lesson_id === assignment.lesson_id);
                        const lesson = assignment.lesson;
                        return (
                          <div
                            key={assignment.id}
                            className={`p-3 ${
                              index % 2 === 0 ? 'border-r border-border' : ''
                            } ${
                              index < assignedToMeLessons.length - 2 ? 'border-b border-border' : ''
                            } bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)]`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-black text-sm truncate">{lesson?.title || 'Untitled Lesson'}</div>
                                <div className="text-xs text-muted mt-0.5">
                                  {assignment.teacher_name || 'Unknown Teacher'}
                                </div>
                              </div>
                              <Badge variant={hasPractice ? 'reviewed' : 'assigned'}>
                                {hasPractice ? 'Done' : 'Pending'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted mb-2">
                              <span>{lesson?.steps?.length || 0} steps</span>
                            </div>
                            <Link href={`/lessons/practice/${assignment.lesson_id}`}>
                              <Button size="sm" variant={hasPractice ? 'secondary' : 'primary'} className="w-full">
                                {hasPractice ? 'Practice again' : 'Start practice'}
                              </Button>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Lessons I Created Section */}
            {myLessons.length > 0 && (
              <>
                <div className="mt-3.5 flex items-center justify-between gap-2.5 mb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-text m-0">Lessons I Created</h2>
                    <div className="text-[12.5px] text-muted">My custom lessons</div>
                  </div>
                </div>

                <div className="border border-border rounded-[14px] overflow-hidden mb-4">
                  {loadingMyLessons ? (
                    <div className="px-3 py-8 text-center text-muted">Loading...</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-0">
                      {myLessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className={`p-3 ${
                            (index + 1) % 3 !== 0 ? 'border-r border-border' : ''
                          } ${
                            index < myLessons.length - 3 ? 'border-b border-border' : ''
                          } bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)]`}
                        >
                          <div className="mb-2">
                            <div className="font-black text-sm truncate">{lesson.title || 'Untitled Lesson'}</div>
                            <div className="text-xs text-muted mt-0.5 line-clamp-2">
                              {lesson.description || 'No description'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted mb-2">
                            <span>{lesson.steps?.length || 0} steps</span>
                          </div>
                          <div className="flex gap-1">
                            <Link href={`/lessons/edit/${lesson.id}`} className="flex-1">
                              <Button size="sm" variant="secondary" className="w-full">
                                Edit
                              </Button>
                            </Link>
                            <Link href={`/lessons/practice/${lesson.id}`} className="flex-1">
                              <Button size="sm" variant="primary" className="w-full">
                                Practice
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* My Shared Practices Section */}
            {practices.length > 0 && (
              <>
                <div className="mt-3.5 flex items-center justify-between gap-2.5 mb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-text m-0">My Shared Practices</h2>
                    <div className="text-[12.5px] text-muted">Submitted practice sessions</div>
                  </div>
                </div>

                <div className="border border-border rounded-[14px] overflow-hidden mb-4">
                  {/* Table Header */}
                  <div className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_auto] gap-2.5 px-3 py-3 items-center bg-panel-2 text-xs text-muted font-extrabold">
                    <div>LESSON</div>
                    <div>DATE</div>
                    <div>RECORDINGS</div>
                    <div>COMMENTS</div>
                    <div></div>
                  </div>

                  {/* Table Rows */}
                  {loadingPractices ? (
                    <div className="px-3 py-8 text-center text-muted">Loading...</div>
                  ) : (
                    sortedGroupedPractices.map((group) => (
                      <div key={group.lessonId}>
                        {group.practices.map((practice, idx) => {
                          const commentCount = (practice as any).comment_count || 0;
                          return (
                            <div
                              key={practice.practice_id}
                              className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_auto] gap-2.5 px-3 py-3 items-center border-t border-border bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)]"
                            >
                              <div>
                                <div className="font-black text-sm">{group.lessonTitle}</div>
                                <div className="text-xs text-muted mt-0.5">{formatDate(practice.created_at)}</div>
                              </div>
                              <div className="text-xs text-muted">{formatDate(practice.created_at)}</div>
                              <div className="text-xs text-muted flex items-center gap-1">
                                <Mic className="w-3.5 h-3.5" />
                                {practice.recording_count}
                              </div>
                              <div className="text-xs text-muted flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {commentCount}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleCopyPracticeLink(practice.practice_id)}
                                  className="p-1.5 text-muted hover:text-text hover:bg-[rgba(255,255,255,0.1)] [html[data-theme='mist']_&]:hover:bg-[rgba(17,24,39,0.1)] rounded transition-colors"
                                  title="Copy Link"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <Link href={`/practices/${practice.practice_id}`}>
                                  <button
                                    className="p-1.5 text-muted hover:text-text hover:bg-[rgba(255,255,255,0.1)] [html[data-theme='mist']_&]:hover:bg-[rgba(17,24,39,0.1)] rounded transition-colors"
                                    title="View Practice"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </Link>
                                <button
                                  onClick={async () => {
                                    const result = await PracticeService.deletePractice(practice.practice_id);
                                    if (result.success) {
                                      showSuccess('Practice deleted successfully');
                                      handleDeletePractice();
                                    } else {
                                      showError(result.error || 'Failed to delete practice');
                                    }
                                  }}
                                  className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                  title="Delete Practice"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </PanelContent>
        </Panel>

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  );
}