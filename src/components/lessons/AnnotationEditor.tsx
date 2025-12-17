'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import type { LyricsAnnotation } from '@/services/annotationsService';

interface AnnotationEditorProps {
  annotation?: LyricsAnnotation;
  highlightedText: string;
  onSave: (annotationText: string, annotationType: 'global' | 'student_specific' | 'private', studentId?: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isTeacher: boolean;
  availableStudents?: Array<{ id: string; name: string }>;
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  annotation,
  highlightedText,
  onSave,
  onCancel,
  onDelete,
  isTeacher,
  availableStudents = [],
}) => {
  const [annotationText, setAnnotationText] = useState(annotation?.annotation_text || '');
  const [annotationType, setAnnotationType] = useState<'global' | 'student_specific' | 'private'>(
    annotation?.annotation_type || (isTeacher ? 'global' : 'private')
  );
  const [selectedStudentId, setSelectedStudentId] = useState(annotation?.student_id || '');
  const [charCount, setCharCount] = useState(0);

  const MAX_CHARS = 500;

  useEffect(() => {
    setCharCount(annotationText.length);
  }, [annotationText]);

  const handleSave = () => {
    if (!annotationText.trim()) return;

    const studentId = annotationType === 'student_specific' ? selectedStudentId : undefined;
    onSave(annotationText.trim(), annotationType, studentId);
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

          {/* Annotation Type (Teachers only) */}
          {isTeacher && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="global"
                    checked={annotationType === 'global'}
                    onChange={(e) => setAnnotationType(e.target.value as 'global')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <span className="font-medium">All Students</span>
                    <span className="text-gray-500"> - visible to everyone</span>
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    value="student_specific"
                    checked={annotationType === 'student_specific'}
                    onChange={(e) => setAnnotationType(e.target.value as 'student_specific')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Specific Student</span>
                    <span className="text-gray-500"> - visible to one student</span>
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    value="private"
                    checked={annotationType === 'private'}
                    onChange={(e) => setAnnotationType(e.target.value as 'private')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Private</span>
                    <span className="text-gray-500"> - only you can see this</span>
                  </span>
                </label>
              </div>

              {/* Student Selector (when student_specific is selected) */}
              {annotationType === 'student_specific' && (
                <div className="mt-3">
                  <label htmlFor="student-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Student
                  </label>
                  <select
                    id="student-select"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a student...</option>
                    {availableStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Students see simple note */}
          {!isTeacher && (
            <p className="text-xs text-gray-500 italic">
              Your notes are private to you and visible to your teacher
            </p>
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
              disabled={
                !annotationText.trim() ||
                (annotationType === 'student_specific' && !selectedStudentId)
              }
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
