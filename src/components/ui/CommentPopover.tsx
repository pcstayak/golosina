'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RecordingComment } from '@/services/sharedLessonService';
import { formatTime } from '@/utils/audioAnalysis';

interface CommentPopoverProps {
  comments: RecordingComment[];
  isVisible: boolean;
  targetElement: HTMLElement | null;
  onClose: () => void;
  containerRef?: React.RefObject<HTMLElement>;
  isSticky?: boolean;
}

const CommentPopover: React.FC<CommentPopoverProps> = ({
  comments,
  isVisible,
  targetElement,
  onClose,
  containerRef,
  isSticky = false
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, height: 0 });

  // Calculate exact height needed for all comments
  const calculateRequiredHeight = useCallback(() => {
    const MAX_DISPLAYED_COMMENTS = 5;
    const displayedComments = comments.slice(0, MAX_DISPLAYED_COMMENTS);

    // Header: 20px (reduced padding)
    const headerHeight = 20;

    // Each comment: 28px (compact spacing)
    const commentHeight = 28;
    const commentsHeight = displayedComments.length * commentHeight;

    // "and X more" text if needed: 16px
    const moreTextHeight = comments.length > MAX_DISPLAYED_COMMENTS ? 16 : 0;

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
      className="absolute bg-white rounded shadow-lg border border-gray-200 z-50"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '240px',
        height: `${position.height}px`
      }}
    >
      {/* Arrow pointing to the target */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="w-2 h-2 bg-white border-b border-r border-gray-200 transform rotate-45"></div>
      </div>

      {/* Header */}
      <div className="px-2 py-1 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-medium text-gray-900">
          Comments {comments.length > 1 && `(${comments.length})`}
        </h3>
        {isSticky && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm leading-none w-3 h-3 flex items-center justify-center"
            aria-label="Close comments"
          >
            ×
          </button>
        )}
      </div>

      {/* Comments list - no scrollbar, exact height */}
      <div className="overflow-hidden">
        {displayedComments.map((comment, index) => (
          <div
            key={comment.id}
            className="px-2 py-1 flex items-start gap-1"
            style={{ height: '28px' }}
          >
            {/* Avatar */}
            <div className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
              {comment.user_name.charAt(0).toUpperCase()}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header line */}
              <div className="flex items-center justify-between text-xs leading-tight">
                <span className="font-medium text-gray-900 truncate flex-1 mr-1">
                  {comment.user_name}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                  {comment.timestamp_seconds != null && (
                    <span>{formatTime(comment.timestamp_seconds)}</span>
                  )}
                </div>
              </div>

              {/* Comment text */}
              <div className="text-xs text-gray-700 leading-tight truncate">
                {comment.comment_text}
              </div>
            </div>
          </div>
        ))}

        {hiddenCount > 0 && (
          <div className="px-2 py-1 text-xs text-gray-500 italic" style={{ height: '16px' }}>
            and {hiddenCount} more...
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentPopover;