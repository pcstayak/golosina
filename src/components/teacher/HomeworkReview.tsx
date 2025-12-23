'use client'

import React, { useState, useEffect } from 'react';
import { PracticeService, type PracticeWithDetails } from '@/services/practiceService';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MessageSquare, Mic, FileAudio, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface PracticeWithActivity extends PracticeWithDetails {
  has_new_activity?: boolean;
  new_comment_count?: number;
}

export default function HomeworkReview() {
  const { user } = useAuth();
  const [practices, setPractices] = useState<PracticeWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsReviewed, setMarkingAsReviewed] = useState<string | null>(null);

  useEffect(() => {
    loadPractices();
  }, [user?.id]);

  const loadPractices = async () => {
    if (!user?.id || !supabase) return;

    try {
      setLoading(true);
      const data = await PracticeService.getTeacherStudentPractices(user.id);

      // Check for new activity on each practice
      const practicesWithActivity = await Promise.all(
        data.map(async (practice) => {
          // Determine the last time this teacher viewed the practice
          // Use last_viewed_at if the teacher was the last viewer, otherwise fall back to reviewed_at
          let lastCheckTimestamp: string | undefined;

          if (practice.last_viewed_by === user.id && practice.last_viewed_at) {
            // Teacher was the last to view this practice
            lastCheckTimestamp = practice.last_viewed_at;
          } else if (practice.reviewed_at) {
            // Fall back to when it was marked as reviewed
            lastCheckTimestamp = practice.reviewed_at;
          }

          if (lastCheckTimestamp && supabase) {
            const { data: newComments } = await supabase
              .from('practice_comments')
              .select('id')
              .eq('practice_id', practice.practice_id)
              .gt('created_at', lastCheckTimestamp);

            const newCommentCount = newComments?.length || 0;

            return {
              ...practice,
              has_new_activity: newCommentCount > 0,
              new_comment_count: newCommentCount,
            };
          }

          return {
            ...practice,
            has_new_activity: false,
            new_comment_count: 0,
          };
        })
      );

      setPractices(practicesWithActivity);
    } catch (error) {
      console.error('Error loading practices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReviewed = async (practiceId: string) => {
    if (!user?.id) return;

    try {
      setMarkingAsReviewed(practiceId);
      const result = await PracticeService.markPracticeAsReviewed(practiceId, user.id);

      if (result.success) {
        setPractices(prev =>
          prev.map(p =>
            p.practice_id === practiceId
              ? { ...p, reviewed_at: new Date().toISOString(), reviewed_by: user.id }
              : p
          )
        );
      } else {
        alert('Failed to mark as reviewed: ' + result.error);
      }
    } catch (error) {
      console.error('Error marking as reviewed:', error);
      alert('Failed to mark as reviewed');
    } finally {
      setMarkingAsReviewed(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const getStudentName = (practice: PracticeWithDetails): string => {
    const profile = practice.student_profile;
    if (!profile) return 'Unknown Student';

    if (profile.display_name) return profile.display_name;
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile.first_name) return profile.first_name;
    return profile.email || 'Unknown Student';
  };

  // Separate practices into categories
  const unreviewedPractices = practices.filter((p) => !p.reviewed_at);
  const practicesWithNewActivity = practices.filter((p) => p.reviewed_at && p.has_new_activity);
  const reviewedPractices = practices.filter((p) => p.reviewed_at && !p.has_new_activity);

  if (loading) {
    return (
      <div className="bg-[var(--panel)] rounded-lg border border-[var(--border)] p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto"></div>
        <p className="text-center text-[var(--muted)] mt-4">Loading homework submissions...</p>
      </div>
    );
  }

  if (practices.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <FileAudio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Homework Submissions</h3>
        <p className="text-gray-600">
          Student practice submissions will appear here when they share their work with you.
        </p>
      </div>
    );
  }

  const renderPracticeCard = (practice: PracticeWithActivity, isNew: boolean = true) => (
    <div key={practice.practice_id} className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isNew && (
              <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded">
                NEW
              </span>
            )}
            {practice.has_new_activity && (
              <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                NEW ACTIVITY
              </span>
            )}
            <h3 className="font-semibold text-gray-900">{practice.title}</h3>
          </div>

          <p className="text-sm text-gray-600 mb-3">Student: {getStudentName(practice)}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Mic className="w-4 h-4" />
              <span>
                {practice.recording_count} recording{practice.recording_count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <FileAudio className="w-4 h-4" />
              <span>
                {PracticeService.getStepCount(practice)} step
                {PracticeService.getStepCount(practice) !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>
                {practice.comment_count || 0} comment{practice.comment_count !== 1 ? 's' : ''}
                {practice.new_comment_count! > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                    +{practice.new_comment_count}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(practice.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`/practices/${practice.practice_id}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium text-center whitespace-nowrap"
          >
            {practice.has_new_activity ? 'View Updates' : isNew ? 'Review Practice' : 'View Practice'}
          </Link>
          {isNew && (
            <button
              onClick={() => handleMarkAsReviewed(practice.practice_id)}
              disabled={markingAsReviewed === practice.practice_id}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {markingAsReviewed === practice.practice_id ? 'Marking...' : 'Mark as Reviewed'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {unreviewedPractices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5" />
              New Submissions ({unreviewedPractices.length})
            </h2>
          </div>

          <div className="divide-y">{unreviewedPractices.map((practice) => renderPracticeCard(practice, true))}</div>
        </div>
      )}

      {practicesWithNewActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              New Activity on Reviewed Practices ({practicesWithNewActivity.length})
            </h2>
          </div>

          <div className="divide-y">{practicesWithNewActivity.map((practice) => renderPracticeCard(practice, false))}</div>
        </div>
      )}

      {reviewedPractices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Reviewed ({reviewedPractices.length})
            </h2>
          </div>

          <div className="divide-y">{reviewedPractices.map((practice) => renderPracticeCard(practice, false))}</div>
        </div>
      )}
    </div>
  );
}
