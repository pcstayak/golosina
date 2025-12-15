import { supabase } from '@/lib/supabase';

export interface LessonStepMedia {
  id?: string;
  media_type: 'video' | 'image' | 'gif';
  media_url: string;
  media_platform?: string;
  embed_id?: string;
  display_order: number;
  caption?: string;
}

export interface LessonStepComment {
  id?: string;
  comment: string;
  created_by: string;
  created_at: string;
}

export interface LessonStep {
  id?: string;
  step_order: number;
  title: string;
  description?: string;
  tips?: string;
  media: LessonStepMedia[];
  comments?: LessonStepComment[];
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  steps: LessonStep[];
}

export interface LessonAssignment {
  id: string;
  lesson_id: string;
  assigned_to: string;
  assigned_by?: string;
  assignment_type: 'teacher_assigned' | 'self_assigned';
  assigned_at: string;
  notes?: string;
  lesson?: Lesson;
  teacher_name?: string;
}

export class LessonService {
  static async createLesson(data: {
    title: string;
    description?: string;
    created_by: string;
    is_template: boolean;
    steps: Array<{
      title: string;
      description?: string;
      tips?: string;
      media: Array<Omit<LessonStepMedia, 'id'>>;
    }>;
  }): Promise<{ success: boolean; lessonId?: string; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      // Create lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          title: data.title,
          description: data.description,
          created_by: data.created_by,
          is_template: data.is_template,
        })
        .select()
        .single();

      if (lessonError || !lessonData) {
        console.error('Error creating lesson:', lessonError);
        return { success: false, error: 'Failed to create lesson' };
      }

      // Create steps
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];

        const { data: stepData, error: stepError } = await supabase
          .from('lesson_steps')
          .insert({
            lesson_id: lessonData.id,
            step_order: i,
            title: step.title,
            description: step.description,
            tips: step.tips,
          })
          .select()
          .single();

        if (stepError || !stepData) {
          console.error('Error creating step:', stepError);
          continue;
        }

        // Create media for this step
        if (step.media && step.media.length > 0) {
          const mediaInserts = step.media.map((media) => ({
            lesson_step_id: stepData.id,
            media_type: media.media_type,
            media_url: media.media_url,
            media_platform: media.media_platform,
            embed_id: media.embed_id,
            display_order: media.display_order,
            caption: media.caption,
          }));

          const { error: mediaError } = await supabase
            .from('lesson_step_media')
            .insert(mediaInserts);

          if (mediaError) {
            console.error('Error inserting media:', mediaError);
          }
        }
      }

      return { success: true, lessonId: lessonData.id };
    } catch (error) {
      console.error('Error creating lesson:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async updateLesson(
    lessonId: string,
    data: {
      title?: string;
      description?: string;
      steps?: LessonStep[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      // Update lesson metadata
      if (data.title !== undefined || data.description !== undefined) {
        const updateData: any = { updated_at: new Date().toISOString() };
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;

        const { error: lessonError } = await supabase
          .from('lessons')
          .update(updateData)
          .eq('id', lessonId);

        if (lessonError) {
          console.error('Error updating lesson:', lessonError);
          return { success: false, error: 'Failed to update lesson' };
        }
      }

      // Update steps if provided
      if (data.steps) {
        // Delete existing steps (cascade will delete media)
        await supabase.from('lesson_steps').delete().eq('lesson_id', lessonId);

        // Create new steps
        for (let i = 0; i < data.steps.length; i++) {
          const step = data.steps[i];

          const { data: stepData, error: stepError } = await supabase
            .from('lesson_steps')
            .insert({
              lesson_id: lessonId,
              step_order: i,
              title: step.title,
              description: step.description,
              tips: step.tips,
            })
            .select()
            .single();

          if (stepError || !stepData) {
            console.error('Error creating step:', stepError);
            continue;
          }

          // Create media for this step
          if (step.media && step.media.length > 0) {
            const mediaInserts = step.media.map((media) => ({
              lesson_step_id: stepData.id,
              media_type: media.media_type,
              media_url: media.media_url,
              media_platform: media.media_platform,
              embed_id: media.embed_id,
              display_order: media.display_order,
              caption: media.caption,
            }));

            const { error: mediaError } = await supabase
              .from('lesson_step_media')
              .insert(mediaInserts);

            if (mediaError) {
              console.error('Error creating media:', mediaError);
            }
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating lesson:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async deleteLesson(lessonId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);

      if (error) {
        console.error('Error deleting lesson:', error);
        return { success: false, error: 'Failed to delete lesson' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting lesson:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async getLesson(lessonId: string): Promise<Lesson | null> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return null;
    }

    try {
      // Fetch lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lessonData) {
        console.error('Error fetching lesson:', lessonError);
        return null;
      }

      // Fetch steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('lesson_steps')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('step_order', { ascending: true });

      if (stepsError) {
        console.error('Error fetching steps:', stepsError);
        return null;
      }

      // Fetch media for all steps
      const stepIds = stepsData?.map((s) => s.id) || [];
      let mediaData: any[] = [];

      if (stepIds.length > 0) {
        const { data: fetchedMedia, error: mediaError } = await supabase
          .from('lesson_step_media')
          .select('*')
          .in('lesson_step_id', stepIds)
          .order('display_order', { ascending: true });

        if (mediaError) {
          console.error('Error fetching media:', mediaError);
        } else {
          mediaData = fetchedMedia || [];
        }
      }

      // Combine steps with media
      const steps: LessonStep[] = (stepsData || []).map((step) => ({
        id: step.id,
        step_order: step.step_order,
        title: step.title,
        description: step.description,
        tips: step.tips,
        media: mediaData.filter((m) => m.lesson_step_id === step.id),
      }));

      return {
        ...lessonData,
        steps,
      };
    } catch (error) {
      console.error('Error fetching lesson:', error);
      return null;
    }
  }

  static async getLessonsByCreator(userId: string): Promise<Lesson[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return [];
      }

      if (!lessonsData || lessonsData.length === 0) {
        return [];
      }

      // Fetch all steps for these lessons
      const lessonIds = lessonsData.map((l) => l.id);
      const { data: stepsData, error: stepsError } = await supabase
        .from('lesson_steps')
        .select('*')
        .in('lesson_id', lessonIds)
        .order('step_order', { ascending: true });

      if (stepsError) {
        console.error('Error fetching steps:', stepsError);
      }

      // Fetch all media
      const stepIds = stepsData?.map((s) => s.id) || [];
      let mediaData: any[] = [];

      if (stepIds.length > 0) {
        const { data: fetchedMedia, error: mediaError } = await supabase
          .from('lesson_step_media')
          .select('*')
          .in('lesson_step_id', stepIds)
          .order('display_order', { ascending: true });

        if (mediaError) {
          console.error('Error fetching media:', mediaError);
        } else {
          mediaData = fetchedMedia || [];
        }
      }

      // Combine data
      return lessonsData.map((lesson) => {
        const lessonSteps = (stepsData || []).filter((s) => s.lesson_id === lesson.id);
        const steps: LessonStep[] = lessonSteps.map((step) => ({
          id: step.id,
          step_order: step.step_order,
          title: step.title,
          description: step.description,
          tips: step.tips,
          media: mediaData.filter((m) => m.lesson_step_id === step.id),
        }));

        return {
          ...lesson,
          steps,
        };
      });
    } catch (error) {
      console.error('Error fetching lessons by creator:', error);
      return [];
    }
  }

  static async assignLesson(data: {
    lesson_id: string;
    assigned_to: string;
    assigned_by?: string;
    assignment_type: 'teacher_assigned' | 'self_assigned';
    notes?: string;
    step_comments?: Array<{ step_id: string; comment: string; created_by: string }>;
  }): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      // Create assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('lesson_assignments')
        .insert({
          lesson_id: data.lesson_id,
          assigned_to: data.assigned_to,
          assigned_by: data.assigned_by,
          assignment_type: data.assignment_type,
          notes: data.notes,
        })
        .select()
        .single();

      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
        if (assignmentError.code === '23505') {
          return { success: false, error: 'Lesson already assigned to this student' };
        }
        return { success: false, error: 'Failed to create assignment' };
      }

      // Create step comments if provided
      if (data.step_comments && data.step_comments.length > 0) {
        const commentInserts = data.step_comments.map((comment) => ({
          lesson_step_id: comment.step_id,
          assignment_id: assignmentData.id,
          comment: comment.comment,
          created_by: comment.created_by,
        }));

        const { error: commentsError } = await supabase
          .from('lesson_step_comments')
          .insert(commentInserts);

        if (commentsError) {
          console.error('Error creating step comments:', commentsError);
        }
      }

      return { success: true, assignmentId: assignmentData.id };
    } catch (error) {
      console.error('Error assigning lesson:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async unassignLesson(assignmentId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase
        .from('lesson_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error unassigning lesson:', error);
        return { success: false, error: 'Failed to unassign lesson' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error unassigning lesson:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async getLessonsAssignedToStudent(studentId: string): Promise<LessonAssignment[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('lesson_assignments')
        .select('*')
        .eq('assigned_to', studentId)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return [];
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        return [];
      }

      // Fetch lessons
      const lessonIds = assignmentsData.map((a) => a.lesson_id);
      const lessons = await Promise.all(lessonIds.map((id) => this.getLesson(id)));

      // Fetch teacher names
      const teacherIds = Array.from(new Set(assignmentsData.map((a) => a.assigned_by).filter(Boolean)));
      let teacherNames: Record<string, string> = {};

      if (teacherIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, display_name')
          .in('id', teacherIds);

        if (!profilesError && profilesData) {
          teacherNames = profilesData.reduce((acc: any, profile: any) => {
            acc[profile.id] = profile.display_name ||
              `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
              'Teacher';
            return acc;
          }, {});
        }
      }

      // Combine assignments with lessons
      return assignmentsData.map((assignment, index) => ({
        ...assignment,
        lesson: lessons[index] || undefined,
        teacher_name: assignment.assigned_by ? teacherNames[assignment.assigned_by] : undefined,
      }));
    } catch (error) {
      console.error('Error fetching assigned lessons:', error);
      return [];
    }
  }

  static async getLessonsAssignedByTeacher(teacherId: string): Promise<LessonAssignment[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('lesson_assignments')
        .select('*')
        .eq('assigned_by', teacherId)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return [];
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        return [];
      }

      // Fetch lessons
      const lessonIds = Array.from(new Set(assignmentsData.map((a) => a.lesson_id)));
      const lessonsMap = new Map<string, Lesson>();

      await Promise.all(
        lessonIds.map(async (id) => {
          const lesson = await this.getLesson(id);
          if (lesson) {
            lessonsMap.set(id, lesson);
          }
        })
      );

      return assignmentsData.map((assignment) => ({
        ...assignment,
        lesson: lessonsMap.get(assignment.lesson_id),
      }));
    } catch (error) {
      console.error('Error fetching assigned lessons:', error);
      return [];
    }
  }


  static async getStepComments(stepId: string, assignmentId: string): Promise<LessonStepComment[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('lesson_step_comments')
        .select('*')
        .eq('lesson_step_id', stepId)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching step comments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching step comments:', error);
      return [];
    }
  }

}
