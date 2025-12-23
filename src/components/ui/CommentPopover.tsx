'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PracticeComment } from '@/services/practiceService';
import { formatTime } from '@/utils/audioAnalysis';

interface CommentPopoverProps {
  comments: PracticeComment[];
  isVisible: boolean;
  targetElement: HTMLElement | null;
  onClose: () => void;
  containerRef?: React.RefObject<HTMLElement>;
  isSticky?: boolean;
  recordingDuration?: number;
}

const CommentPopover: React.FC<CommentPopoverProps> = ({
  comments,
  isVisible,
  targetElement,
  onClose,
  containerRef,
  isSticky = false,
  recordingDuration = 0
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, height: 0 });

  // Calculate exact height needed for all comments
  const calculateRequiredHeight = useCallback(() => {
    const MAX_DISPLAYED_COMMENTS = 5;
    const displayedComments = comments.slice(0, MAX_DISPLAYED_COMMENTS);

    // Header: 28px (padding + border)
    const headerHeight = 28;

    // Each comment: 48px (name line + comment text + padding)
    const commentHeight = 48;
    const commentsHeight = displayedComments.length * commentHeight;

    // "and X more" text if needed: 24px
    const moreTextHeight = comments.length > MAX_DISPLAYED_COMMENTS ? 24 : 0;

    return headerHeight + commentsHeight + moreTextHeight;
  }, [comments]);

  // Calculate popover position
  useEffect(() => {
    if (!isVisible || !targetElement || !popoverRef.current || !containerRef?.current) return;

    const popover = popoverRef.current;
    const target = targetElement;
    const container = containerRef.current;

    const targetRect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const requiredHeight = calculateRequiredHeight();

    // Calculate position relative to container
    const targetRelativeToContainer = {
      top: targetRect.top - containerRect.top,
      left: targetRect.left - containerRect.left,
      width: targetRect.width,
      bottom: targetRect.bottom - containerRect.top
    };

    // Calculate initial position above the target (relative to container)
    let top = targetRelativeToContainer.top - requiredHeight - 8;
    let left = targetRelativeToContainer.left + (targetRelativeToContainer.width / 2) - 120; // 240px width / 2

    // Adjust horizontal position if going off container bounds
    const containerWidth = containerRect.width;
    if (left < 10) {
      left = 10;
    } else if (left + 240 > containerWidth - 10) {
      left = containerWidth - 250; // 240px width + 10px margin
    }

    // Adjust vertical position if going off container bounds
    if (top < 10) {
      // Position below target if no space above
      top = targetRelativeToContainer.bottom + 8;
    }

    // Ensure we don't go below container bounds
    const containerHeight = containerRect.height;
    if (top + requiredHeight > containerHeight - 10) {
      top = Math.max(10, containerHeight - requiredHeight - 10);
    }

    setPosition({ top, left, height: requiredHeight });
  }, [isVisible, targetElement, containerRef, comments.length, calculateRequiredHeight]);

  // Handle click outside to close (only for sticky popovers)
  useEffect(() => {
    if (!isVisible || !isSticky) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !targetElement?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, isSticky, targetElement, onClose]);

  // Format date for display
  const formatCommentDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isVisible || comments.length === 0) {
    return null;
  }

  const MAX_DISPLAYED_COMMENTS = 5;
  const sortedComments = comments.sort((a, b) => (a.timestamp_seconds || 0) - (b.timestamp_seconds || 0));
  const displayedComments = sortedComments.slice(0, MAX_DISPLAYED_COMMENTS);
  const hiddenCount = comments.length - MAX_DISPLAYED_COMMENTS;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '240px',
        height: `${position.height}px`,
        background: 'rgba(11, 18, 32, 0.92)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-soft)',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
      }}
    >
      {/* Arrow pointing to the target */}
      <div
        style={{
          position: 'absolute',
          bottom: '-4px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderLeft: 'none',
            transform: 'rotate(45deg)',
          }}
        ></div>
      </div>

      {/* Header */}
      <div
        style={{
          padding: '6px 8px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Comments {comments.length > 1 && `(${comments.length})`}
        </h3>
        {isSticky && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '16px',
              cursor: 'pointer',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Close comments"
          >
            ×
          </button>
        )}
      </div>

      {/* Comments list - no scrollbar, exact height */}
      <div style={{ overflow: 'hidden' }}>
        {displayedComments.map((comment, index) => {
          // Check if this is an end-of-recording comment
          const isEndComment = comment.timestamp_seconds != null &&
            recordingDuration > 0 &&
            Math.abs(comment.timestamp_seconds - recordingDuration) < 0.5;

          const avatarBg = isEndComment ? 'rgba(52, 211, 153, 0.15)' : 'rgba(47, 183, 160, 0.15)';
          const avatarColor = isEndComment ? 'var(--success)' : 'var(--primary-2)';

          return (
            <div
              key={comment.id}
              style={{
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                height: '48px',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  background: avatarBg,
                  color: avatarColor,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 500,
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {comment.user_name.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header line */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    lineHeight: 1.2,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 500,
                      color: 'var(--text)',
                      flex: 1,
                      marginRight: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {comment.user_name}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    {comment.timestamp_seconds != null && (
                      <span style={{ color: isEndComment ? 'var(--success)' : 'var(--muted)' }}>
                        {isEndComment ? 'Full' : formatTime(comment.timestamp_seconds)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment text */}
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  {comment.comment_text}
                </div>
              </div>
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <div
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              color: 'var(--faint)',
              fontStyle: 'italic',
              height: '24px',
            }}
          >
            and {hiddenCount} more...
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentPopover;