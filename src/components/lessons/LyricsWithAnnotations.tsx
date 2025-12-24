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
    console.log('[LyricsWithAnnotations] Loading annotations for mediaId:', mediaId, 'Context mode:', context.mode);
    setIsLoading(true);
    const data = await AnnotationsService.getAnnotationsWithContext(mediaId, context);
    console.log('[LyricsWithAnnotations] Loaded annotations:', data.length, 'annotations');
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
      console.log('[LyricsWithAnnotations] Creating annotation:', {
        mediaId,
        annotationType,
        context_mode: context.mode,
        userId: context.userId
      });

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
        console.log('[LyricsWithAnnotations] ✅ Annotation created successfully, reloading');
        showSuccess('Annotation added');
        await loadAnnotations();
      } else {
        console.error('[LyricsWithAnnotations] ❌ createAnnotation returned null!');
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
      return <p style={{ color: 'var(--muted)', fontSize: '13.5px' }}>Loading annotations...</p>;
    }

    if (!lyrics) {
      return <p style={{ color: 'var(--muted)', fontSize: '13.5px' }}>No lyrics available</p>;
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

    // Get highlight style based on annotation type and editability
    const getHighlightStyle = (annotation: LyricsAnnotation): React.CSSProperties => {
      const isEditable = AnnotationsService.isAnnotationEditable(annotation, context);

      const baseStyle: React.CSSProperties = {
        padding: '0 3px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      };

      // Use distinct highlights with better contrast between types
      switch (annotation.annotation_type) {
        case 'global':
          // Teacher feedback for all students - use bright teal
          return {
            ...baseStyle,
            background: isEditable ? 'rgba(47, 183, 160, 0.28)' : 'rgba(47, 183, 160, 0.15)',
            color: 'inherit',
          };
        case 'student_specific':
          // Teacher feedback for specific student - use warm yellow/gold
          return {
            ...baseStyle,
            background: isEditable ? 'rgba(245, 199, 72, 0.25)' : 'rgba(245, 199, 72, 0.15)',
            color: 'inherit',
          };
        case 'private':
          // Private student note - use subtle panel
          return {
            ...baseStyle,
            background: isEditable ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
            color: 'inherit',
          };
        default:
          return baseStyle;
      }
    };

    return (
      <div className="relative">
        {segments.map((segment, index) => {
          if (segment.annotation) {
            return (
              <mark
                key={index}
                style={getHighlightStyle(segment.annotation)}
                onClick={(e) => handleClickAnnotation(segment.annotation!, e)}
                title={`${segment.annotation.annotation_text.slice(0, 100)}`}
                onMouseEnter={(e) => {
                  const mark = e.currentTarget as HTMLElement;
                  const style = getHighlightStyle(segment.annotation!);
                  mark.style.background = segment.annotation!.annotation_type === 'global'
                    ? 'rgba(47, 183, 160, 0.38)'
                    : segment.annotation!.annotation_type === 'student_specific'
                    ? 'rgba(245, 199, 72, 0.35)'
                    : 'rgba(255, 255, 255, 0.18)';
                }}
                onMouseLeave={(e) => {
                  const mark = e.currentTarget as HTMLElement;
                  const style = getHighlightStyle(segment.annotation!);
                  mark.style.background = style.background as string;
                }}
              >
                {segment.text}
              </mark>
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
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: '13.5px',
          color: 'var(--muted)',
          lineHeight: '1.6',
          userSelect: 'text',
          fontWeight: 'normal',
        }}
        onMouseUp={handleMouseUp}
        onClick={() => setAnnotationPopover(null)}
      >
        {renderLyricsWithHighlights()}
      </div>

      {/* Add Annotation Button (appears on text selection) */}
      {showAddButton && (
        <button
          onClick={handleAddAnnotation}
          style={{
            position: 'absolute',
            left: `${addButtonPosition.x}px`,
            top: `${addButtonPosition.y}px`,
            transform: 'translateX(-50%)',
            background: 'var(--primary)',
            color: 'white',
            borderRadius: '50%',
            padding: '6px',
            boxShadow: 'var(--shadow-soft)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--primary-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--primary)';
          }}
          title="Add annotation"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Read-only Annotation Popover */}
      {annotationPopover && (
        <div
          style={{
            position: 'absolute',
            left: `${annotationPopover.position.x}px`,
            top: `${annotationPopover.position.y}px`,
            background: 'rgba(11, 18, 32, 0.92)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-soft)',
            backdropFilter: 'blur(12px)',
            padding: '12px',
            maxWidth: '300px',
            zIndex: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <MessageSquare
              className="w-4 h-4 flex-shrink-0"
              style={{ color: 'var(--muted)', marginTop: '2px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '11px',
                color: 'var(--faint)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 500,
              }}>
                {annotationPopover.annotation.annotation_type === 'global' && 'All Students'}
                {annotationPopover.annotation.annotation_type === 'student_specific' && 'Student-specific'}
                {annotationPopover.annotation.annotation_type === 'private' && 'Private Note'}
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: '1.5' }}>
                {annotationPopover.annotation.annotation_text}
              </p>
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
        <div style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
        }}>
          <p style={{
            fontSize: '11px',
            color: 'var(--faint)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 500,
          }}>
            Annotation types:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
            {annotations.some(a => a.annotation_type === 'global') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '16px',
                  height: '12px',
                  background: 'rgba(47, 183, 160, 0.28)',
                  borderRadius: 'var(--radius-sm)',
                }}></div>
                <span style={{ color: 'var(--muted)' }}>All Students</span>
              </div>
            )}
            {annotations.some(a => a.annotation_type === 'student_specific') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '16px',
                  height: '12px',
                  background: 'rgba(245, 199, 72, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                }}></div>
                <span style={{ color: 'var(--muted)' }}>Student-specific</span>
              </div>
            )}
            {annotations.some(a => a.annotation_type === 'private') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '16px',
                  height: '12px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--radius-sm)',
                }}></div>
                <span style={{ color: 'var(--muted)' }}>Private</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricsWithAnnotations;
