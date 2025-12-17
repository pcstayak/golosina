import { supabase } from '@/lib/supabase';

export interface LyricsAnnotation {
  id: string;
  media_id: string;
  start_index: number;
  end_index: number;
  highlighted_text: string;
  annotation_text: string;
  annotation_type: 'global' | 'student_specific' | 'private';
  student_id?: string;
  assignment_id?: string;
  created_by: string;
  visible_to_teacher: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnotationContext {
  mode: 'lesson_creation' | 'assignment' | 'practice';
  userId: string;
  isTeacher: boolean;
  studentId?: string;
  assignmentId?: string;
}

export interface CreateAnnotationParams {
  media_id: string;
  start_index: number;
  end_index: number;
  highlighted_text: string;
  annotation_text: string;
  annotation_type: 'global' | 'student_specific' | 'private';
  student_id?: string;
  assignment_id?: string;
  created_by: string;
  visible_to_teacher?: boolean;
}

export interface UpdateAnnotationParams {
  annotation_text?: string;
  annotation_type?: 'global' | 'student_specific' | 'private';
  student_id?: string;
  visible_to_teacher?: boolean;
}

export class AnnotationsService {
  /**
   * Determine annotation type based on context
   */
  static getAnnotationTypeFromContext(context: AnnotationContext): 'global' | 'student_specific' | 'private' {
    if (context.mode === 'lesson_creation') {
      return 'global';
    } else if (context.mode === 'assignment') {
      return 'student_specific';
    } else {
      return 'private';
    }
  }

  /**
   * Get annotations for media with context awareness
   */
  static async getAnnotationsWithContext(
    mediaId: string,
    context: AnnotationContext
  ): Promise<LyricsAnnotation[]> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return [];
    }

    try {
      let query = supabase
        .from('lesson_media_lyrics_annotations')
        .select('*')
        .eq('media_id', mediaId);

      if (context.mode === 'lesson_creation') {
        // Lesson creation: Show only global annotations
        const { data, error } = await query.eq('annotation_type', 'global');
        if (error) {
          console.error('Error fetching annotations:', error);
          return [];
        }
        return data || [];
      } else if (context.mode === 'assignment') {
        // Assignment: Show global (read-only) + student-specific for this student/assignment
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching annotations:', error);
          return [];
        }
        return (data || []).filter(annotation => {
          if (annotation.annotation_type === 'global') {
            return true;
          }
          if (annotation.annotation_type === 'student_specific') {
            return (
              (context.studentId && annotation.student_id === context.studentId) ||
              (context.assignmentId && annotation.assignment_id === context.assignmentId)
            );
          }
          return false;
        });
      } else {
        // Practice: Show global + student-specific (for this student/assignment) + own private
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching annotations:', error);
          return [];
        }
        return (data || []).filter(annotation => {
          if (annotation.annotation_type === 'global') {
            return true;
          }
          if (annotation.annotation_type === 'student_specific') {
            return (
              (context.studentId && annotation.student_id === context.studentId) ||
              (context.assignmentId && annotation.assignment_id === context.assignmentId)
            );
          }
          if (annotation.annotation_type === 'private') {
            return annotation.created_by === context.userId;
          }
          return false;
        });
      }
    } catch (error) {
      console.error('Error fetching annotations:', error);
      return [];
    }
  }

  /**
   * Check if annotation is editable based on context
   */
  static isAnnotationEditable(annotation: LyricsAnnotation, context: AnnotationContext): boolean {
    // Only creator can edit their own annotations
    if (annotation.created_by !== context.userId) {
      return false;
    }

    // In lesson creation mode, can only edit global annotations
    if (context.mode === 'lesson_creation') {
      return annotation.annotation_type === 'global';
    }

    // In assignment mode, can only edit student-specific annotations
    if (context.mode === 'assignment') {
      return annotation.annotation_type === 'student_specific';
    }

    // In practice mode, can only edit private annotations
    if (context.mode === 'practice') {
      return annotation.annotation_type === 'private';
    }

    return false;
  }

  /**
   * Get all annotations for a media item, filtered by user context
   * Teachers see: global + student-specific (for their assignments) + private (if visible_to_teacher)
   * Students see: global + their own annotations
   */
  static async getAnnotationsForMedia(
    mediaId: string,
    userId: string,
    isTeacher: boolean,
    assignmentId?: string
  ): Promise<LyricsAnnotation[]> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return [];
    }

    try {
      let query = supabase
        .from('lesson_media_lyrics_annotations')
        .select('*')
        .eq('media_id', mediaId);

      if (isTeacher) {
        // Teachers see all global annotations, student-specific for their assignments, and private if visible
        // Build a complex OR query:
        // 1. annotation_type = 'global'
        // 2. (annotation_type = 'student_specific' AND assignment_id matches if provided)
        // 3. (annotation_type = 'private' AND visible_to_teacher = true)

        // For simplicity, fetch all and filter in memory
        const { data, error } = await query;

        if (error) {
          console.error('Error fetching annotations:', error);
          return [];
        }

        // Filter annotations based on teacher visibility rules
        return (data || []).filter(annotation => {
          if (annotation.annotation_type === 'global') {
            return true;
          }
          if (annotation.annotation_type === 'student_specific') {
            // Show if assignment_id matches (if provided) or if teacher created it
            if (assignmentId && annotation.assignment_id === assignmentId) {
              return true;
            }
            if (annotation.created_by === userId) {
              return true;
            }
            return false;
          }
          if (annotation.annotation_type === 'private') {
            // Show if visible_to_teacher or if teacher created it
            return annotation.visible_to_teacher || annotation.created_by === userId;
          }
          return false;
        });
      } else {
        // Students see global annotations and their own annotations
        const { data, error } = await query.or(
          `annotation_type.eq.global,and(created_by.eq.${userId})`
        );

        if (error) {
          console.error('Error fetching annotations:', error);
          return [];
        }

        return data || [];
      }
    } catch (error) {
      console.error('Error fetching annotations:', error);
      return [];
    }
  }

  /**
   * Create a new annotation
   */
  static async createAnnotation(params: CreateAnnotationParams): Promise<LyricsAnnotation | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('lesson_media_lyrics_annotations')
        .insert({
          media_id: params.media_id,
          start_index: params.start_index,
          end_index: params.end_index,
          highlighted_text: params.highlighted_text,
          annotation_text: params.annotation_text,
          annotation_type: params.annotation_type,
          student_id: params.student_id || null,
          assignment_id: params.assignment_id || null,
          created_by: params.created_by,
          visible_to_teacher: params.visible_to_teacher ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating annotation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating annotation:', error);
      return null;
    }
  }

  /**
   * Update an existing annotation
   */
  static async updateAnnotation(
    id: string,
    updates: UpdateAnnotationParams,
    userId: string
  ): Promise<LyricsAnnotation | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('lesson_media_lyrics_annotations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('created_by', userId) // Ensure user can only update their own annotations
        .select()
        .single();

      if (error) {
        console.error('Error updating annotation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error updating annotation:', error);
      return null;
    }
  }

  /**
   * Delete an annotation
   */
  static async deleteAnnotation(id: string, userId: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return false;
    }

    try {
      const { error } = await supabase
        .from('lesson_media_lyrics_annotations')
        .delete()
        .eq('id', id)
        .eq('created_by', userId); // Ensure user can only delete their own annotations

      if (error) {
        console.error('Error deleting annotation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting annotation:', error);
      return false;
    }
  }
}
