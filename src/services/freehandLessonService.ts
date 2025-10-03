import { supabase } from '@/lib/supabase';
import type { AudioPiece } from '@/contexts/AppContext';
import { VideoPlatform } from './videoEmbedService';

export interface FreehandLessonVideo {
  id?: string;
  freehand_lesson_id?: string;
  video_url: string;
  video_platform: VideoPlatform;
  embed_id: string;
  description?: string;
  display_order: number;
  created_at?: string;
}

export interface FreehandLesson {
  id?: string;
  session_id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  videos?: FreehandLessonVideo[];
}

export interface CreateFreehandLessonParams {
  title: string;
  description?: string;
  createdBy: string;
  videos: Array<{
    video_url: string;
    video_platform: VideoPlatform;
    embed_id: string;
    description?: string;
  }>;
}

export class FreehandLessonService {
  private static readonly BUCKET_NAME = 'lesson-recordings';
  private static readonly OWNED_FREEHAND_SESSIONS_KEY = 'golosina_owned_freehand_sessions';

  static generateSessionId(): string {
    return `freehand_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  static async createFreehandLesson(params: CreateFreehandLessonParams): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured',
      };
    }

    try {
      const sessionId = this.generateSessionId();

      const { data: lessonData, error: lessonError } = await supabase
        .from('freehand_lessons')
        .insert({
          session_id: sessionId,
          title: params.title,
          description: params.description,
          created_by: params.createdBy,
        })
        .select()
        .single();

      if (lessonError) {
        console.error('Error creating freehand lesson:', lessonError);
        return {
          success: false,
          error: 'Failed to create lesson',
        };
      }

      if (params.videos.length > 0) {
        const videosToInsert = params.videos.map((video, index) => ({
          freehand_lesson_id: lessonData.id,
          video_url: video.video_url,
          video_platform: video.video_platform,
          embed_id: video.embed_id,
          description: video.description,
          display_order: index,
        }));

        const { error: videosError } = await supabase
          .from('freehand_lesson_videos')
          .insert(videosToInsert);

        if (videosError) {
          console.error('Error adding videos:', videosError);
          await supabase
            .from('freehand_lessons')
            .delete()
            .eq('id', lessonData.id);

          return {
            success: false,
            error: 'Failed to add videos',
          };
        }
      }

      this.markSessionAsOwned(sessionId);

      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      console.error('Error creating freehand lesson:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  static async getFreehandLesson(lessonId: string): Promise<FreehandLesson | null> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return null;
    }

    try {
      const { data: lessonData, error: lessonError } = await supabase
        .from('freehand_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lessonData) {
        console.error('Error fetching freehand lesson:', lessonError);
        return null;
      }

      const { data: videosData, error: videosError } = await supabase
        .from('freehand_lesson_videos')
        .select('*')
        .eq('freehand_lesson_id', lessonData.id)
        .order('display_order', { ascending: true });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
      }

      return {
        ...lessonData,
        videos: videosData || [],
      };
    } catch (error) {
      console.error('Error fetching freehand lesson:', error);
      return null;
    }
  }

  static async updateFreehandLesson(
    lessonId: string,
    updates: {
      title?: string;
      description?: string;
      videos?: Array<{
        video_url: string;
        video_platform: VideoPlatform;
        embed_id: string;
        description?: string;
      }>;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured',
      };
    }

    try {
      const { data: lessonData, error: fetchError } = await supabase
        .from('freehand_lessons')
        .select('id, session_id')
        .eq('id', lessonId)
        .single();

      if (fetchError || !lessonData) {
        return {
          success: false,
          error: 'Lesson not found',
        };
      }

      if (!this.isSessionOwned(lessonData.session_id)) {
        return {
          success: false,
          error: 'You do not have permission to edit this lesson',
        };
      }

      if (updates.title !== undefined || updates.description !== undefined) {
        const updateData: any = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;

        const { error: updateError } = await supabase
          .from('freehand_lessons')
          .update(updateData)
          .eq('id', lessonData.id);

        if (updateError) {
          console.error('Error updating lesson:', updateError);
          return {
            success: false,
            error: 'Failed to update lesson',
          };
        }
      }

      if (updates.videos !== undefined) {
        const { error: deleteError } = await supabase
          .from('freehand_lesson_videos')
          .delete()
          .eq('freehand_lesson_id', lessonData.id);

        if (deleteError) {
          console.error('Error deleting old videos:', deleteError);
          return {
            success: false,
            error: 'Failed to update videos',
          };
        }

        if (updates.videos.length > 0) {
          const videosToInsert = updates.videos.map((video, index) => ({
            freehand_lesson_id: lessonData.id,
            video_url: video.video_url,
            video_platform: video.video_platform,
            embed_id: video.embed_id,
            description: video.description,
            display_order: index,
          }));

          const { error: insertError } = await supabase
            .from('freehand_lesson_videos')
            .insert(videosToInsert);

          if (insertError) {
            console.error('Error inserting new videos:', insertError);
            return {
              success: false,
              error: 'Failed to update videos',
            };
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating freehand lesson:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  static async deleteFreehandLesson(sessionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured',
      };
    }

    if (!this.isSessionOwned(sessionId)) {
      return {
        success: false,
        error: 'You do not have permission to delete this lesson',
      };
    }

    try {
      const { error } = await supabase
        .from('freehand_lessons')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error deleting lesson:', error);
        return {
          success: false,
          error: 'Failed to delete lesson',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting lesson:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  private static getFileExtensionFromMimeType(mimeType: string): string {
    const mimeToExtension: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'mp4',
      'audio/mp4;codecs=mp4a.40.2': 'mp4',
      'audio/webm': 'webm',
      'audio/webm;codecs=opus': 'webm',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
    };

    return mimeToExtension[mimeType] || 'webm';
  }

  static markSessionAsOwned(sessionId: string): void {
    try {
      const ownedSessions = this.getOwnedSessions();
      if (!ownedSessions.includes(sessionId)) {
        ownedSessions.push(sessionId);
        localStorage.setItem(this.OWNED_FREEHAND_SESSIONS_KEY, JSON.stringify(ownedSessions));
      }
    } catch (error) {
      console.error('Error marking session as owned:', error);
    }
  }

  static isSessionOwned(sessionId: string): boolean {
    try {
      const ownedSessions = this.getOwnedSessions();
      return ownedSessions.includes(sessionId);
    } catch (error) {
      console.error('Error checking session ownership:', error);
      return false;
    }
  }

  private static getOwnedSessions(): string[] {
    try {
      const stored = localStorage.getItem(this.OWNED_FREEHAND_SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting owned sessions:', error);
      return [];
    }
  }

  static async getFreehandLessonsByCreator(createdBy: string): Promise<FreehandLesson[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('freehand_lessons')
        .select('*')
        .eq('created_by', createdBy)
        .order('created_at', { ascending: false });

      if (lessonsError) {
        console.error('Error fetching freehand lessons:', lessonsError);
        return [];
      }

      if (!lessonsData || lessonsData.length === 0) {
        return [];
      }

      const lessonIds = lessonsData.map((lesson) => lesson.id);

      const { data: videosData, error: videosError } = await supabase
        .from('freehand_lesson_videos')
        .select('*')
        .in('freehand_lesson_id', lessonIds)
        .order('display_order', { ascending: true });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
      }

      const lessonsWithVideos = lessonsData.map((lesson) => ({
        ...lesson,
        videos: videosData?.filter((video) => video.freehand_lesson_id === lesson.id) || [],
      }));

      return lessonsWithVideos;
    } catch (error) {
      console.error('Error fetching freehand lessons by creator:', error);
      return [];
    }
  }

  static async assignLessonToStudent(
    lessonId: string,
    assignedBy: string,
    assignedTo: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured',
      };
    }

    try {
      const { error } = await supabase
        .from('freehand_lesson_assignments')
        .insert({
          freehand_lesson_id: lessonId,
          assigned_by: assignedBy,
          assigned_to: assignedTo,
          notes: notes,
        });

      if (error) {
        console.error('Error assigning lesson:', error);
        if (error.code === '23505') {
          return {
            success: false,
            error: 'Lesson already assigned to this student',
          };
        }
        return {
          success: false,
          error: 'Failed to assign lesson',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning lesson:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  static async unassignLesson(
    lessonId: string,
    studentId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured',
      };
    }

    try {
      const { error } = await supabase
        .from('freehand_lesson_assignments')
        .delete()
        .eq('freehand_lesson_id', lessonId)
        .eq('assigned_to', studentId);

      if (error) {
        console.error('Error unassigning lesson:', error);
        return {
          success: false,
          error: 'Failed to unassign lesson',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error unassigning lesson:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  static async getAssignedStudents(
    lessonId: string
  ): Promise<Array<{ id: string; assigned_to: string; assigned_at: string; notes?: string }>> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('freehand_lesson_assignments')
        .select('id, assigned_to, assigned_at, notes')
        .eq('freehand_lesson_id', lessonId)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching assigned students:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching assigned students:', error);
      return [];
    }
  }

  static async getLessonsAssignedToStudent(
    studentId: string
  ): Promise<Array<FreehandLesson & { teacherName?: string; assignedAt: string; assignmentNotes?: string }>> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('freehand_lesson_assignments')
        .select('freehand_lesson_id, assigned_by, assigned_at, notes')
        .eq('assigned_to', studentId)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return [];
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        return [];
      }

      const lessonIds = assignmentsData.map((assignment) => assignment.freehand_lesson_id);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('freehand_lessons')
        .select('*')
        .in('id', lessonIds);

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return [];
      }

      if (!lessonsData || lessonsData.length === 0) {
        return [];
      }

      const { data: videosData, error: videosError } = await supabase
        .from('freehand_lesson_videos')
        .select('*')
        .in('freehand_lesson_id', lessonIds)
        .order('display_order', { ascending: true });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
      }

      const teacherIds = Array.from(new Set(assignmentsData.map((a) => a.assigned_by)));
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, display_name')
        .in('id', teacherIds);

      if (profilesError) {
        console.error('Error fetching teacher profiles:', profilesError);
      }

      const profilesMap = new Map(
        profilesData?.map((profile) => [
          profile.id,
          profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Teacher',
        ]) || []
      );

      const assignmentsMap = new Map(
        assignmentsData.map((assignment) => [
          assignment.freehand_lesson_id,
          {
            teacherId: assignment.assigned_by,
            assignedAt: assignment.assigned_at,
            notes: assignment.notes,
          },
        ])
      );

      const lessonsWithDetails = lessonsData.map((lesson) => {
        const assignment = assignmentsMap.get(lesson.id);
        return {
          ...lesson,
          videos: videosData?.filter((video) => video.freehand_lesson_id === lesson.id) || [],
          teacherName: assignment ? profilesMap.get(assignment.teacherId) : 'Teacher',
          assignedAt: assignment?.assignedAt || '',
          assignmentNotes: assignment?.notes,
        };
      });

      return lessonsWithDetails;
    } catch (error) {
      console.error('Error fetching lessons assigned to student:', error);
      return [];
    }
  }

  static async deleteFreehandPracticeSession(sessionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured',
      };
    }

    if (!this.isSessionOwned(sessionId)) {
      return {
        success: false,
        error: 'You do not have permission to delete this session',
      };
    }

    try {
      // Get the practice session to find all recordings
      const { data: sessionData, error: fetchError } = await supabase
        .from('freehand_practice_sessions')
        .select('recordings')
        .eq('session_id', sessionId)
        .single();

      if (fetchError) {
        console.error('Error fetching practice session:', fetchError);
      }

      // Delete all recording files from storage
      if (sessionData?.recordings) {
        const filesToDelete: string[] = [];
        const recordings = sessionData.recordings as any;

        Object.keys(recordings).forEach((key) => {
          if (Array.isArray(recordings[key])) {
            recordings[key].forEach((recording: any) => {
              if (recording.url) {
                // Extract file path from URL or construct it
                const urlParts = recording.url.split('/');
                const filePath = urlParts.slice(urlParts.indexOf('lesson-recordings') + 1).join('/').split('?')[0];
                if (filePath) {
                  filesToDelete.push(filePath);
                }
              }
            });
          }
        });

        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('lesson-recordings')
            .remove(filesToDelete);

          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
            // Continue anyway
          }
        }
      }

      // Delete all comments for this session
      const { error: commentsError } = await supabase
        .from('recording_comments')
        .delete()
        .eq('session_id', sessionId);

      if (commentsError) {
        console.error('Error deleting comments:', commentsError);
        // Continue anyway
      }

      // Delete the practice session record
      const { error: deleteError } = await supabase
        .from('freehand_practice_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (deleteError) {
        console.error('Error deleting practice session:', deleteError);
        return {
          success: false,
          error: 'Failed to delete practice session',
        };
      }

      // Remove from owned sessions
      this.removeOwnedSession(sessionId);

      return { success: true };
    } catch (error) {
      console.error('Error deleting freehand practice session:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  static removeOwnedSession(sessionId: string): void {
    try {
      const ownedSessions = this.getOwnedSessions();
      const filtered = ownedSessions.filter(id => id !== sessionId);
      localStorage.setItem(this.OWNED_FREEHAND_SESSIONS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing owned session:', error);
    }
  }
}
