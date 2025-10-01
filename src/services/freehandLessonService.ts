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
}
