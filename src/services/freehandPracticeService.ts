import { supabase } from '@/lib/supabase';
import type { AudioPiece } from '@/contexts/AppContext';

export interface FreehandPracticeSession {
  id?: string;
  session_id: string;
  freehand_lesson_id: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  recordings?: {
    [key: string]: {
      name: string;
      files: Array<{
        name: string;
        url: string;
        duration: number;
        timestamp: string;
      }>;
    };
  };
  recording_count?: number;
}

export class FreehandPracticeService {
  private static readonly BUCKET_NAME = 'lesson-recordings';
  private static readonly OWNED_PRACTICE_SESSIONS_KEY = 'golosina_owned_practice_sessions';

  static generateSessionId(): string {
    return `practice_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  static async createPracticeSession(
    lessonId: string,
    createdBy: string
  ): Promise<{
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
      const { data: lessonData, error: lessonError } = await supabase
        .from('freehand_lessons')
        .select('id')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lessonData) {
        return {
          success: false,
          error: 'Lesson not found',
        };
      }

      const sessionId = this.generateSessionId();

      const { error: insertError } = await supabase
        .from('freehand_practice_sessions')
        .insert({
          session_id: sessionId,
          freehand_lesson_id: lessonId,
          created_by: createdBy,
        });

      if (insertError) {
        console.error('Error creating practice session:', insertError);
        return {
          success: false,
          error: 'Failed to create practice session',
        };
      }

      this.markSessionAsOwned(sessionId);

      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      console.error('Error creating practice session:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  static async savePracticeRecordings(
    sessionId: string,
    recordings: Record<string, AudioPiece[]>
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured',
      };
    }

    try {
      const { data: sessionData, error: fetchError } = await supabase
        .from('freehand_practice_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      if (fetchError || !sessionData) {
        return {
          success: false,
          error: 'Practice session not found',
        };
      }

      const uploadPromises: Promise<any>[] = [];
      const files: any = {};
      let totalRecordings = 0;

      for (const [key, pieces] of Object.entries(recordings)) {
        if (pieces.length === 0) continue;

        const exerciseId = key;

        for (let i = 0; i < pieces.length; i++) {
          const piece = pieces[i];
          const fileExtension = this.getFileExtensionFromMimeType(piece.blob.type);
          const fileName = `${sessionId}/${exerciseId}/${piece.id}.${fileExtension}`;

          const uploadPromise = supabase.storage
            .from(this.BUCKET_NAME)
            .upload(fileName, piece.blob, {
              contentType: piece.blob.type || 'audio/webm',
              upsert: false,
            });

          uploadPromises.push(
            uploadPromise.then((result) => {
              if (result.error) {
                console.error('Upload failed for', fileName, ':', result.error);
                throw result.error;
              }
              return { fileName, piece, exerciseId, index: i };
            })
          );

          totalRecordings++;
        }
      }

      const uploadResults = await Promise.all(uploadPromises);

      for (const result of uploadResults) {
        const { fileName, piece, exerciseId, index } = result;

        if (!files[exerciseId]) {
          files[exerciseId] = {
            name: piece.exerciseName,
            files: [],
          };
        }

        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(fileName, 31536000);

        if (signedError || !signedUrlData?.signedUrl) {
          throw new Error(`Failed to create signed URL for ${fileName}`);
        }

        files[exerciseId].files.push({
          name: `Recording ${index + 1}`,
          url: signedUrlData.signedUrl,
          duration: piece.duration,
          timestamp: piece.timestamp,
        });
      }

      const { error: updateError } = await supabase
        .from('freehand_practice_sessions')
        .update({
          recordings: files,
          recording_count: totalRecordings,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Error updating practice session with recordings:', updateError);
        return {
          success: false,
          error: 'Failed to save recordings metadata',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error uploading practice recordings:', error);
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  }

  static async getPracticeSession(sessionId: string): Promise<FreehandPracticeSession | null> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return null;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('freehand_practice_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('Error fetching practice session:', sessionError);
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Error fetching practice session:', error);
      return null;
    }
  }

  static async getPracticeSessionsByUser(userId: string): Promise<FreehandPracticeSession[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('freehand_practice_sessions')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching practice sessions:', sessionsError);
        return [];
      }

      return sessionsData || [];
    } catch (error) {
      console.error('Error fetching practice sessions by user:', error);
      return [];
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
        localStorage.setItem(this.OWNED_PRACTICE_SESSIONS_KEY, JSON.stringify(ownedSessions));
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
      const stored = localStorage.getItem(this.OWNED_PRACTICE_SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting owned sessions:', error);
      return [];
    }
  }
}
