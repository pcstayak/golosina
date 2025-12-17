'use client'

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import AnnotationEditor from './AnnotationEditor';
import { AnnotationsService, type LyricsAnnotation, type AnnotationContext } from '@/services/annotationsService';
import { useNotification } from '@/hooks/useNotification';

interface LyricsWithAnnotationsProps {
  lyrics: string;
  mediaId: string;
  context: AnnotationContext;
}

interface TextSelection {
  text: string;
  startIndex: number;
  endIndex: number;
}

interface AnnotationPopover {
  annotation: LyricsAnnotation;
  position: { x: number; y: number };
}

const LyricsWithAnnotations: React.FC<LyricsWithAnnotationsProps> = ({
  lyrics,
  mediaId,
  context,
}) => {
  const { showSuccess, showError } = useNotification();
  const lyricsRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<LyricsAnnotation[]>([]);
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [showAddButton, setShowAddButton] = useState(false);
  const [addButtonPosition, setAddButtonPosition] = useState({ x: 0, y: 0 });
  const [showEditor, setShowEditor] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<LyricsAnnotation | null>(null);
  const [annotationPopover, setAnnotationPopover] = useState<AnnotationPopover | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load annotations on mount
  useEffect(() => {
    loadAnnotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaId, context.userId, context.assignmentId, context.studentId, context.mode]);

  const loadAnnotations = async () => {
    setIsLoading(true);
    const data = await AnnotationsService.getAnnotationsWithContext(mediaId, context);
    setAnnotations(data);
    setIsLoading(false);
  };

  // Handle text selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowAddButton(false);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setShowAddButton(false);
      return;
    }

    // Calculate selection indices relative to lyrics text
    const range = selection.getRangeAt(0);
    const lyricsContainer = lyricsRef.current;
    if (!lyricsContainer) return;

    // Get text content and find the selection position
    const textContent = lyricsContainer.textContent || '';
    const preRange = document.createRange();
    preRange.selectNodeContents(lyricsContainer);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startIndex = preRange.toString().length;
    const endIndex = startIndex + selectedText.length;

    setSelectedText({
      text: selectedText,
      startIndex,
      endIndex,
    });

    // Position the add button near the selection
    const rect = range.getBoundingClientRect();
    const containerRect = lyricsContainer.getBoundingClientRect();
    setAddButtonPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.bottom - containerRect.top + 5,
    });
    setShowAddButton(true);
  };

  const handleAddAnnotation = () => {
    setShowEditor(true);
    setShowAddButton(false);
  };

  const handleSaveAnnotation = async (
    annotationText: string,
    visibleToTeacher?: boolean
  ) => {
    if (!selectedText && !editingAnnotation) return;

    const annotationType = AnnotationsService.getAnnotationTypeFromContext(context);

    if (editingAnnotation) {
      // Update existing annotation
      const updated = await AnnotationsService.updateAnnotation(
        editingAnnotation.id,
        {
          annotation_text: annotationText,
          visible_to_teacher: visibleToTeacher,
        },
        context.userId
      );

      if (updated) {
        showSuccess('Annotation updated');
        await loadAnnotations();
      } else {
        showError('Failed to update annotation');
      }
    } else if (selectedText) {
      // Create new annotation
      const created = await AnnotationsService.createAnnotation({
        media_id: mediaId,
        start_index: selectedText.startIndex,
        end_index: selectedText.endIndex,
        highlighted_text: selectedText.text,
        annotation_text: annotationText,
        annotation_type: annotationType,
        student_id: context.studentId,
        assignment_id: context.assignmentId,
        created_by: context.userId,
        visible_to_teacher: visibleToTeacher ?? true,
      });

      if (created) {
        showSuccess('Annotation added');
        await loadAnnotations();
      } else {
        showError('Failed to add annotation');
      }
    }

    setShowEditor(false);
    setEditingAnnotation(null);
    setSelectedText(null);

    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  const handleDeleteAnnotation = async () => {
    if (!editingAnnotation) return;

    const success = await AnnotationsService.deleteAnnotation(editingAnnotation.id, context.userId);

    if (success) {
      showSuccess('Annotation deleted');
      await loadAnnotations();
    } else {
      showError('Failed to delete annotation');
    }

    setShowEditor(false);
    setEditingAnnotation(null);
    setAnnotationPopover(null);
  };

  const handleCancelEditor = () => {
    setShowEditor(false);
    setEditingAnnotation(null);
    setSelectedText(null);
    setShowAddButton(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleClickAnnotation = (annotation: LyricsAnnotation, event: React.MouseEvent) => {
    event.stopPropagation();

    // Check if annotation is editable based on context
    const isEditable = AnnotationsService.isAnnotationEditable(annotation, context);

    if (!isEditable) {
      // Show read-only popover
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const containerRect = lyricsRef.current?.getBoundingClientRect();
      if (containerRect) {
        setAnnotationPopover({
          annotation,
          position: {
            x: rect.left - containerRect.left,
            y: rect.bottom - containerRect.top + 5,
          },
        });
      }
      return;
    }

    setEditingAnnotation(annotation);
    setShowEditor(true);
    setAnnotationPopover(null);
  };

  // Render lyrics with highlights
  const renderLyricsWithHighlights = () => {
    if (isLoading) {
      return <p className="text-gray-500 text-sm">Loading annotations...</p>;
    }

    if (!lyrics) {
      return <p className="text-gray-500 text-sm">No lyrics available</p>;
    }

    // Sort annotations by start index
    const sortedAnnotations = [...annotations].sort((a, b) => a.start_index - b.start_index);

    // Build highlighted segments
    const segments: Array<{ text: string; annotation?: LyricsAnnotation }> = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation) => {
      // Add non-highlighted text before this annotation
      if (annotation.start_index > lastIndex) {
        segments.push({
          text: lyrics.slice(lastIndex, annotation.start_index),
        });
      }

      // Add highlighted text
      segments.push({
        text: lyrics.slice(annotation.start_index, annotation.end_index),
        annotation,
      });

      lastIndex = Math.max(lastIndex, annotation.end_index);
    });

    // Add remaining text
    if (lastIndex < lyrics.length) {
      segments.push({
        text: lyrics.slice(lastIndex),
      });
    }

    // Get highlight class based on annotation type and editability
    const getHighlightClass = (annotation: LyricsAnnotation) => {
      const isEditable = AnnotationsService.isAnnotationEditable(annotation, context);
      const baseOpacity = isEditable ? '' : 'opacity-60';

      switch (annotation.annotation_type) {
        case 'global':
          return `bg-yellow-100 border-b-2 border-yellow-400 cursor-pointer hover:bg-yellow-200 transition-colors ${baseOpacity}`;
        case 'student_specific':
          return `bg-blue-100 border-b-2 border-blue-400 cursor-pointer hover:bg-blue-200 transition-colors ${baseOpacity}`;
        case 'private':
          return `bg-gray-100 border-b-2 border-gray-400 cursor-pointer hover:bg-gray-200 transition-colors ${baseOpacity}`;
        default:
          return '';
      }
    };

    return (
      <div className="relative">
        {segments.map((segment, index) => {
          if (segment.annotation) {
            const isEditable = AnnotationsService.isAnnotationEditable(segment.annotation, context);
            return (
              <span
                key={index}
                className={getHighlightClass(segment.annotation)}
                onClick={(e) => handleClickAnnotation(segment.annotation!, e)}
                title={`${isEditable ? 'Click to edit: ' : ''}${segment.annotation.annotation_text.slice(0, 100)}`}
              >
                {segment.text}
              </span>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Lyrics Display */}
      <div
        ref={lyricsRef}
        className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed select-text"
        onMouseUp={handleMouseUp}
        onClick={() => setAnnotationPopover(null)}
      >
        {renderLyricsWithHighlights()}
      </div>

      {/* Add Annotation Button (appears on text selection) */}
      {showAddButton && (
        <button
          onClick={handleAddAnnotation}
          className="absolute bg-blue-600 text-white rounded-full p-1 shadow-lg hover:bg-blue-700 transition-all z-10"
          style={{
            left: `${addButtonPosition.x}px`,
            top: `${addButtonPosition.y}px`,
            transform: 'translateX(-50%)',
          }}
          title="Add annotation"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Read-only Annotation Popover */}
      {annotationPopover && (
        <div
          className="absolute bg-white border shadow-lg rounded-lg p-3 max-w-xs z-20"
          style={{
            left: `${annotationPopover.position.x}px`,
            top: `${annotationPopover.position.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">
                {annotationPopover.annotation.annotation_type === 'global' && 'All Students'}
                {annotationPopover.annotation.annotation_type === 'student_specific' && 'Student-specific'}
                {annotationPopover.annotation.annotation_type === 'private' && 'Private Note'}
              </p>
              <p className="text-sm text-gray-800">{annotationPopover.annotation.annotation_text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Editor Modal */}
      {showEditor && (
        <AnnotationEditor
          annotation={editingAnnotation || undefined}
          highlightedText={editingAnnotation?.highlighted_text || selectedText?.text || ''}
          onSave={handleSaveAnnotation}
          onCancel={handleCancelEditor}
          onDelete={editingAnnotation ? handleDeleteAnnotation : undefined}
          context={context}
        />
      )}

      {/* Legend */}
      {annotations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Annotation types:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            {annotations.some(a => a.annotation_type === 'global') && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-3 bg-yellow-100 border-b-2 border-yellow-400 rounded-sm"></div>
                <span className="text-gray-600">All Students</span>
              </div>
            )}
            {annotations.some(a => a.annotation_type === 'student_specific') && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-3 bg-blue-100 border-b-2 border-blue-400 rounded-sm"></div>
                <span className="text-gray-600">Student-specific</span>
              </div>
            )}
            {annotations.some(a => a.annotation_type === 'private') && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-3 bg-gray-100 border-b-2 border-gray-400 rounded-sm"></div>
                <span className="text-gray-600">Private</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricsWithAnnotations;
