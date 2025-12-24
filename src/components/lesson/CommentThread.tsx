'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Send, MessageCircle } from 'lucide-react';
import { PracticeComment } from '@/services/practiceService';
import { formatTime } from '@/utils/audioAnalysis';

interface CommentThreadProps {
  comments: PracticeComment[];
  onReply: (parentCommentId: string, commentText: string) => Promise<void>;
  currentUserName?: string;
  selectedCommentId?: string | string[] | null;
  onClose?: () => void;
  // Comment form props
  recordingId: string;
  recordingDuration: number;
  commentFormState?: {
    text: string;
    timestampSeconds?: number;
    includeTimestamp: boolean;
  };
  onUpdateForm?: (field: string, value: any) => void;
  onSubmitComment?: () => Promise<void>;
  showForm?: boolean;
}

interface CommentWithReplies extends PracticeComment {
  replies: CommentWithReplies[];
  depth: number;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  onReply,
  currentUserName = '',
  selectedCommentId = null,
  onClose,
  recordingId,
  recordingDuration,
  commentFormState,
  onUpdateForm,
  onSubmitComment,
  showForm = true
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyForms, setReplyForms] = useState<Record<string, { text: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submittingMainComment, setSubmittingMainComment] = useState(false);

  const organizeComments = (): CommentWithReplies[] => {
    // Create a map of all comments by ID for easy lookup
    const commentMap = new Map<string, CommentWithReplies>();

    // Initialize all comments with empty replies array and depth 0
    comments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment,
        replies: [],
        depth: 0
      });
    });

    // Build the tree structure recursively
    const buildTree = (commentId: string, currentDepth: number): CommentWithReplies | null => {
      const comment = commentMap.get(commentId);
      if (!comment) return null;

      comment.depth = currentDepth;

      // Find all direct children of this comment
      const children = comments
        .filter(c => c.parent_comment_id === commentId)
        .map(c => buildTree(c.id, currentDepth + 1))
        .filter((c): c is CommentWithReplies => c !== null);

      // Sort children by creation time (oldest first for natural conversation flow)
      children.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      comment.replies = children;
      return comment;
    };

    // Find all top-level comments (no parent)
    const topLevelComments = comments
      .filter(c => !c.parent_comment_id)
      .map(c => buildTree(c.id, 0))
      .filter((c): c is CommentWithReplies => c !== null);

    // Sort top-level comments by creation date (newest first)
    topLevelComments.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Filter by selected comment(s) if provided
    if (selectedCommentId !== undefined && selectedCommentId !== null) {
      const selectedIds = Array.isArray(selectedCommentId) ? selectedCommentId : [selectedCommentId];

      // If empty array, return no comments (user clicked empty spot on waveform)
      if (selectedIds.length === 0) {
        return [];
      }

      // Need to find the top-level parent for each selected comment
      const findTopLevelParent = (commentId: string): string => {
        const comment = commentMap.get(commentId);
        if (!comment || !comment.parent_comment_id) return commentId;
        return findTopLevelParent(comment.parent_comment_id);
      };

      const topLevelParentIds = selectedIds.map(findTopLevelParent);
      return topLevelComments.filter(comment => topLevelParentIds.includes(comment.id));
    }

    // If selectedCommentId is null (clicked empty spot), return no comments
    if (selectedCommentId === null) {
      return [];
    }

    return topLevelComments;
  };

  const handleReplyClick = (commentId: string) => {
    setReplyingTo(commentId);
    if (!replyForms[commentId]) {
      setReplyForms(prev => ({
        ...prev,
        [commentId]: {
          text: ''
        }
      }));
    }
  };

  const handleCancelReply = (commentId: string) => {
    setReplyingTo(null);
    setReplyForms(prev => {
      const updated = { ...prev };
      delete updated[commentId];
      return updated;
    });
  };

  const handleUpdateReplyForm = (commentId: string, value: string) => {
    setReplyForms(prev => ({
      ...prev,
      [commentId]: {
        text: value
      }
    }));
  };

  const handleSubmitReply = async (commentId: string) => {
    const form = replyForms[commentId];
    if (!form || !form.text.trim()) return;

    setSubmitting(commentId);
    try {
      await onReply(commentId, form.text);
      handleCancelReply(commentId);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmitting(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const MAX_DEPTH = 5;

  const renderComment = (comment: CommentWithReplies): React.ReactNode => {
    const showReplyForm = replyingTo === comment.id;
    const replyForm = replyForms[comment.id];
    const isReply = comment.depth > 0;
    const canReply = comment.depth < MAX_DEPTH;

    // Calculate indentation - cap visual indent at 3 levels for mobile-friendliness
    // Each level gets 1.5rem (24px) indent for more compact nesting
    const visualDepth = Math.min(comment.depth, 3);
    const indentStyle = { marginLeft: visualDepth > 0 ? `${visualDepth * 1.5}rem` : '0' };

    return (
      <div key={comment.id} className="mt-1.5">
        <div style={indentStyle}>
          <div className={`rounded p-2 ${isReply ? 'border-l-2' : 'border'}`} style={{
            background: 'var(--panel)',
            backdropFilter: 'blur(12px)',
            border: isReply ? '2px solid var(--border)' : '1px solid var(--border)',
            borderLeft: isReply ? '2px solid var(--border)' : undefined
          }}>
            {/* Single line layout: [timestamp] [date] [username] [message] [reply] */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Timestamp badge - only for top-level comments with timestamp */}
              {comment.timestamp_seconds !== undefined && !isReply && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: 'var(--primary)',
                  background: 'rgba(47, 183, 160, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)'
                }} className="shrink-0">
                  {formatTime(comment.timestamp_seconds)}
                </span>
              )}

              {/* Date - subtle */}
              <span style={{ fontSize: '11px', color: 'var(--faint)' }} className="shrink-0">
                {formatDate(comment.created_at)}
              </span>

              {/* Username - bold and prominent */}
              <span style={{ fontWeight: 900, color: 'var(--text)', fontSize: '13.5px' }} className="shrink-0">
                {comment.user_name}:
              </span>

              {/* Message - takes remaining space, allows wrapping */}
              <span style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6' }} className="break-words min-w-0">
                {comment.comment_text}
              </span>

              {/* Reply button - compact, inline */}
              {canReply && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleReplyClick(comment.id)}
                  className="text-xs px-2 py-0.5 h-auto shrink-0 ml-auto"
                  title="Reply to this comment"
                >
                  <MessageCircle className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {showReplyForm && (
            <div className="mt-2 rounded-lg p-3" style={{
              background: 'var(--panel)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border)',
              marginLeft: '1.5rem'
            }}>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Write your reply..."
                  value={replyForm?.text || ''}
                  onChange={(e) => handleUpdateReplyForm(comment.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && replyForm?.text?.trim()) {
                      e.preventDefault();
                      handleSubmitReply(comment.id);
                    }
                  }}
                  className="flex-1 min-w-[200px] px-3 py-1.5 rounded"
                  style={{
                    border: '1px solid var(--border)',
                    background: 'rgba(11, 18, 32, 0.92)',
                    color: 'var(--text)',
                    fontSize: '13.5px'
                  }}
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyForm?.text?.trim() || submitting === comment.id}
                  className="text-xs px-3 py-1 h-auto shrink-0"
                >
                  <Send className="w-3 h-3 mr-1" />
                  {submitting === comment.id ? 'Posting...' : 'Post'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCancelReply(comment.id)}
                  className="text-xs px-3 py-1 h-auto shrink-0"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Recursively render nested replies */}
        {comment.replies.length > 0 && (
          <div className="space-y-0">
            {comment.replies.map(reply => renderComment(reply))}
          </div>
        )}
      </div>
    );
  };

  const organizedComments = organizeComments();

  // Handle main comment submission
  const handleMainCommentSubmit = async () => {
    if (!onSubmitComment || !commentFormState?.text.trim()) return;

    setSubmittingMainComment(true);
    try {
      await onSubmitComment();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingMainComment(false);
    }
  };

  // Don't render anything if neither comments nor form should be shown
  if (!selectedCommentId && !showForm) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Existing comments thread */}
      {organizedComments.length > 0 && (
        <div className="space-y-3">
          {organizedComments.map(comment => renderComment(comment))}
        </div>
      )}

      {/* Main comment form - chat style, no header */}
      {showForm && onUpdateForm && onSubmitComment && commentFormState && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            data-recording={recordingId}
            placeholder="Add a comment..."
            value={commentFormState.text}
            onChange={(e) => onUpdateForm('text', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && commentFormState.text.trim()) {
                e.preventDefault();
                handleMainCommentSubmit();
              }
            }}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg"
            style={{
              border: '1px solid var(--border)',
              background: 'rgba(11, 18, 32, 0.92)',
              color: 'var(--text)',
              fontSize: '13.5px'
            }}
            disabled={submittingMainComment}
          />
          <Button
            size="sm"
            variant="primary"
            onClick={handleMainCommentSubmit}
            disabled={!commentFormState.text.trim() || submittingMainComment}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommentThread;
