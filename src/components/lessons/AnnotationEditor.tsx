'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import type { LyricsAnnotation, AnnotationContext } from '@/services/annotationsService';
import { AnnotationsService } from '@/services/annotationsService';

interface AnnotationEditorProps {
  annotation?: LyricsAnnotation;
  highlightedText: string;
  onSave: (annotationText: string, visibleToTeacher?: boolean) => void;
  onCancel: () => void;
  onDelete?: () => void;
  context: AnnotationContext;
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  annotation,
  highlightedText,
  onSave,
  onCancel,
  onDelete,
  context,
}) => {
  const [annotationText, setAnnotationText] = useState(annotation?.annotation_text || '');
  const [visibleToTeacher, setVisibleToTeacher] = useState(
    annotation?.visible_to_teacher ?? true
  );
  const [charCount, setCharCount] = useState(0);

  const MAX_CHARS = 500;

  useEffect(() => {
    setCharCount(annotationText.length);
  }, [annotationText]);

  const handleSave = () => {
    if (!annotationText.trim()) return;

    // For practice mode, pass visibleToTeacher flag
    if (context.mode === 'practice') {
      onSave(annotationText.trim(), visibleToTeacher);
    } else {
      onSave(annotationText.trim());
    }
  };

  // Get UI labels based on context
  const getContextLabel = () => {
    switch (context.mode) {
      case 'lesson_creation':
        return 'All Students';
      case 'assignment':
        return 'This Student';
      case 'practice':
        return 'Private Note';
    }
  };

  const getContextDescription = () => {
    switch (context.mode) {
      case 'lesson_creation':
        return 'This annotation will be visible to all students learning this lesson';
      case 'assignment':
        return 'This annotation is specific to this student assignment';
      case 'practice':
        return 'This is your private note. You can optionally share it with your teacher';
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= MAX_CHARS) {
      setAnnotationText(newText);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.80)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'rgba(11, 18, 32, 0.95)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h3
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            {annotation ? 'Edit Annotation' : 'Add Annotation'}
          </h3>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Highlighted Text Display */}
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                color: 'var(--faint)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 500,
              }}
            >
              Selected text:
            </p>
            <p style={{ fontSize: '13.5px', color: 'var(--text)', fontWeight: 500 }}>
              {highlightedText}
            </p>
          </div>

          {/* Annotation Text */}
          <div>
            <label
              htmlFor="annotation-text"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text)',
                marginBottom: '6px',
              }}
            >
              Annotation
            </label>
            <textarea
              id="annotation-text"
              value={annotationText}
              onChange={handleTextChange}
              placeholder="Enter your annotation..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13.5px',
                color: 'var(--text)',
                fontFamily: 'var(--font)',
                resize: 'vertical',
                minHeight: '100px',
              }}
              rows={4}
              autoFocus
            />
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--faint)' }}>
                {charCount}/{MAX_CHARS} characters
              </p>
            </div>
          </div>

          {/* Context-based visibility info */}
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text)',
                marginBottom: '4px',
              }}
            >
              Annotation Type: {getContextLabel()}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5' }}>
              {getContextDescription()}
            </p>
          </div>

          {/* Share with teacher checkbox (practice mode only) */}
          {context.mode === 'practice' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={visibleToTeacher}
                onChange={(e) => setVisibleToTeacher(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                Share with teacher
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--panel)',
          }}
        >
          <div>
            {annotation && onDelete && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onDelete}
                style={{ color: 'var(--danger)' }}
              >
                Delete
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={!annotationText.trim()}
            >
              {annotation ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationEditor;
