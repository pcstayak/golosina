'use client'

import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Settings, LogOut, Home, Video, ChevronDown, ChevronUp, GraduationCap, Mic, MessageSquare, Calendar, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import SettingsModal from '@/components/modals/SettingsModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PracticeCard from '@/components/student/PracticeCard';
import { PracticeService, Practice } from '@/services/practiceService';
import { useNotification } from '@/hooks/useNotification';
import { LessonService, type Lesson, type LessonAssignment } from '@/services/lessonService';
import LessonCard from '@/components/lessons/LessonCard';
import AssignedLessonCardNew from '@/components/lessons/AssignedLessonCard';
import NotificationList from '@/components/student/NotificationList';

export default function LandingPage() {
  const { state, dispatch } = useApp();
  const { signOut, profile, user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useNotification();
  const [showSettings, setShowSettings] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [myLessons, setMyLessons] = useState<Lesson[]>([]);
  const [assignedToMeLessons, setAssignedToMeLessons] = useState<LessonAssignment[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loadingMyLessons, setLoadingMyLessons] = useState(true);
  const [loadingAssignedToMe, setLoadingAssignedToMe] = useState(true);
  const [loadingPractices, setLoadingPractices] = useState(true);
  const [showMyLessonsSection, setShowMyLessonsSection] = useState(true);
  const [showAssignedToMeSection, setShowAssignedToMeSection] = useState(true);
  const [showPracticesSection, setShowPracticesSection] = useState(true);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

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

  const handleViewPractice = (practiceId: string) => {
    router.push(`/practices/${practiceId}`);
  };

  const toggleLessonExpanded = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-between mb-8">
          <div></div>
          <h1 className="text-5xl font-bold text-white">
            🎵 Golosina
          </h1>
          <div className="flex items-center gap-2">
            {(profile?.role === 'admin' || profile?.role === 'teacher') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReturnToDashboard}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>
        <p className="text-xl text-white/80 mb-8">
          Your AI-powered voice training companion
        </p>
      </div>

      {/* Notifications Section - Only show for students (non-admin, non-teacher) */}
      {user?.id && profile?.role !== 'admin' && profile?.role !== 'teacher' && (
        <div className="mb-6">
          <NotificationList maxItems={5} />
        </div>
      )}

      {/* Create Lesson Card */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Create Lesson</h2>
                  <p className="text-white/80 text-sm">Build custom step-by-step lessons</p>
                </div>
              </div>
            </div>
            <p className="text-white/90 mb-4">
              Create structured lessons with videos, images, tips, and practice recordings. Share with your teacher or use for personal practice.
            </p>
            <Link href="/lessons/create">
              <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                <Video className="w-4 h-4" />
                Create New Lesson
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Lessons I Created Section */}
      {loadingMyLessons ? (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Lessons I Created</h2>
          <div className="text-center text-white/60 py-8">
            Loading your lessons...
          </div>
        </div>
      ) : myLessons.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Lessons I Created ({myLessons.length})</h2>
            <button
              onClick={() => setShowMyLessonsSection(!showMyLessonsSection)}
              className="text-white/80 hover:text-white transition-colors"
            >
              {showMyLessonsSection ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
          {showMyLessonsSection && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  onDelete={async () => {
                    // Refresh the list after delete
                    if (user?.id) {
                      const lessons = await LessonService.getLessonsByCreator(user.id)
                      setMyLessons(lessons)
                    }
                  }}
                  onCopy={async () => {
                    // Refresh the list after copy
                    if (user?.id) {
                      const lessons = await LessonService.getLessonsByCreator(user.id)
                      setMyLessons(lessons)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Lessons Assigned to Me Section (Students) */}
      {loadingAssignedToMe ? (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Lessons from Teachers</h2>
          <div className="text-center text-white/60 py-8">
            Loading assigned lessons...
          </div>
        </div>
      ) : assignedToMeLessons.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-white">
                Lessons from Teachers ({assignedToMeLessons.length})
              </h2>
            </div>
            <button
              onClick={() => setShowAssignedToMeSection(!showAssignedToMeSection)}
              className="text-white/80 hover:text-white transition-colors"
            >
              {showAssignedToMeSection ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
          {showAssignedToMeSection && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedToMeLessons.map((assignment) => (
                <AssignedLessonCardNew key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* My Shared Practices Section */}
      {loadingPractices ? (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">My Shared Practices</h2>
          <div className="text-center text-white/60 py-8">
            Loading your shared practices...
          </div>
        </div>
      ) : practices.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">My Shared Practices ({practices.length})</h2>
            <button
              onClick={() => setShowPracticesSection(!showPracticesSection)}
              className="text-white/80 hover:text-white transition-colors"
            >
              {showPracticesSection ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
          {showPracticesSection && (
            <div className="space-y-4">
              {sortedGroupedPractices.map((group) => {
                const isExpanded = expandedLessons.has(group.lessonId);
                return (
                  <div key={group.lessonId} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button
                      onClick={() => toggleLessonExpanded(group.lessonId)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`w-5 h-5 text-gray-600 transition-transform ${
                            isExpanded ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                        <h3 className="text-lg font-semibold text-gray-900">{group.lessonTitle}</h3>
                        <span className="text-sm text-gray-500">
                          ({group.practices.length} {group.practices.length === 1 ? 'practice' : 'practices'})
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200">
                        {group.practices.map((practice) => {
                          const commentCount = (practice as any).comment_count || 0;
                          return (
                            <div
                              key={practice.practice_id}
                              className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-1 text-sm text-gray-500 min-w-[80px]">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatDate(practice.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Mic className="w-4 h-4 text-purple-600" />
                                    <span>{practice.recording_count}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <MessageSquare className="w-4 h-4 text-blue-600" />
                                    <span>{commentCount}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopyPracticeLink(practice.practice_id)}
                                  className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                  title="Copy Link"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleViewPractice(practice.practice_id)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="View Practice"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
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
                                  className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                                  title="Delete Practice"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}