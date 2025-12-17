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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {annotation ? 'Edit Annotation' : 'Add Annotation'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Highlighted Text Display */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-xs text-gray-600 mb-1">Selected text:</p>
            <p className="text-sm text-gray-900 font-medium">{highlightedText}</p>
          </div>

          {/* Annotation Text */}
          <div>
            <label htmlFor="annotation-text" className="block text-sm font-medium text-gray-700 mb-1">
              Annotation
            </label>
            <textarea
              id="annotation-text"
              value={annotationText}
              onChange={handleTextChange}
              placeholder="Enter your annotation..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              autoFocus
            />
            <div className="mt-1 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {charCount}/{MAX_CHARS} characters
              </p>
            </div>
          </div>

          {/* Context-based visibility info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 mb-1">
              Annotation Type: {getContextLabel()}
            </p>
            <p className="text-xs text-blue-700">
              {getContextDescription()}
            </p>
          </div>

          {/* Share with teacher checkbox (practice mode only) */}
          {context.mode === 'practice' && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visibleToTeacher}
                onChange={(e) => setVisibleToTeacher(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Share with teacher
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div>
            {annotation && onDelete && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
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
