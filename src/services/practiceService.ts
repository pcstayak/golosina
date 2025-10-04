import { supabase } from '@/lib/supabase';
import type { AudioPiece } from '@/contexts/AppContext';

export interface PracticeRecording {
  name: string;
  url: string;
  duration: number;
  timestamp: string;
}

export interface PracticeRecordingSet {
  name: string;
  files: PracticeRecording[];
}

export interface Practice {
  id: string;
  practice_id: string;
  lesson_id: string;
  assignment_id?: string;
  created_by: string;
  recordings: Record<string, PracticeRecordingSet>;
  recording_count: number;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface PracticeComment {
  id: string;
  practice_id: string;
  recording_id: string;
  user_name: string;
  user_id?: string;
  comment_text: string;
  timestamp_seconds?: number;
  created_at: string;
}

export class PracticeService {
  private static readonly BUCKET_NAME = 'lesson-recordings';
  private static readonly OWNED_PRACTICES_KEY = 'golosina_owned_practices';

  static generatePracticeId(): string {
    return `practice_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  static async createPractice(
    lessonId: string,
    createdBy: string,
    assignmentId?: string
  ): Promise<{ success: boolean; practiceId?: string; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const practiceId = this.generatePracticeId();

      const { data: practiceData, error: practiceError } = await supabase
        .from('practices')
        .insert({
          practice_id: practiceId,
          lesson_id: lessonId,
          assignment_id: assignmentId,
          created_by: createdBy,
          recordings: {},
          recording_count: 0,
          is_shared: false,
        })
        .select()
        .single();

      if (practiceError || !practiceData) {
        console.error('Error creating practice:', practiceError);
        return { success: false, error: 'Failed to create practice' };
      }

      this.markPracticeAsOwned(practiceId);

      return { success: true, practiceId };
    } catch (error) {
      console.error('Error creating practice:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async getPractice(practiceId: string): Promise<Practice | null> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .eq('practice_id', practiceId)
        .single();

      if (error || !data) {
        console.error('Error fetching practice:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching practice:', error);
      return null;
    }
  }

  static async savePracticeRecordings(
    practiceId: string,
    recordings: Record<string, AudioPiece[]>,
    stepNames: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const uploadPromises: Promise<any>[] = [];
      const files: Record<string, PracticeRecordingSet> = {};
      let totalRecordings = 0;

      for (const [stepId, pieces] of Object.entries(recordings)) {
        if (pieces.length === 0) continue;

        for (let i = 0; i < pieces.length; i++) {
          const piece = pieces[i];
          const fileExtension = this.getFileExtensionFromMimeType(piece.blob.type);
          const fileName = `${practiceId}/${stepId}/${piece.id}.${fileExtension}`;

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
              return { fileName, piece, stepId, index: i };
            })
          );

          totalRecordings++;
        }
      }

      const uploadResults = await Promise.all(uploadPromises);

      for (const result of uploadResults) {
        const { fileName, piece, stepId, index } = result;

        if (!files[stepId]) {
          files[stepId] = {
            name: stepNames[stepId] || `Step ${stepId}`,
            files: [],
          };
        }

        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(fileName, 31536000);

        if (signedError || !signedUrlData?.signedUrl) {
          throw new Error(`Failed to create signed URL for ${fileName}`);
        }

        files[stepId].files.push({
          name: `Recording ${index + 1}`,
          url: signedUrlData.signedUrl,
          duration: piece.duration,
          timestamp: piece.timestamp,
        });
      }

      const { error: updateError } = await supabase
        .from('practices')
        .update({
          recordings: files,
          recording_count: totalRecordings,
          updated_at: new Date().toISOString(),
        })
        .eq('practice_id', practiceId);

      if (updateError) {
        console.error('Error updating practice with recordings:', updateError);
        return { success: false, error: 'Failed to save recordings' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving practice recordings:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async sharePractice(practiceId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    if (!this.isPracticeOwned(practiceId)) {
      return { success: false, error: 'You do not have permission to share this practice' };
    }

    try {
      const { error } = await supabase
        .from('practices')
        .update({ is_shared: true, updated_at: new Date().toISOString() })
        .eq('practice_id', practiceId);

      if (error) {
        console.error('Error sharing practice:', error);
        return { success: false, error: 'Failed to share practice' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sharing practice:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async deletePractice(practiceId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    if (!this.isPracticeOwned(practiceId)) {
      return { success: false, error: 'You do not have permission to delete this practice' };
    }

    try {
      const practice = await this.getPractice(practiceId);
      if (!practice) {
        return { success: false, error: 'Practice not found' };
      }

      if (practice.recordings) {
        const filesToDelete: string[] = [];
        Object.keys(practice.recordings).forEach((stepId) => {
          const recordingSet = practice.recordings[stepId];
          recordingSet.files.forEach((recording) => {
            if (recording.url) {
              const urlParts = recording.url.split('/');
              const filePath = urlParts
                .slice(urlParts.indexOf('lesson-recordings') + 1)
                .join('/')
                .split('?')[0];
              if (filePath) {
                filesToDelete.push(filePath);
              }
            }
          });
        });

        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from(this.BUCKET_NAME)
            .remove(filesToDelete);

          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
          }
        }
      }

      const { error: commentsError } = await supabase
        .from('practice_comments')
        .delete()
        .eq('practice_id', practiceId);

      if (commentsError) {
        console.error('Error deleting comments:', commentsError);
      }

      const { error: deleteError } = await supabase
        .from('practices')
        .delete()
        .eq('practice_id', practiceId);

      if (deleteError) {
        console.error('Error deleting practice:', deleteError);
        return { success: false, error: 'Failed to delete practice' };
      }

      this.removePracticeAsOwned(practiceId);

      return { success: true };
    } catch (error) {
      console.error('Error deleting practice:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async getMyPractices(userId: string): Promise<Practice[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching practices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching practices:', error);
      return [];
    }
  }

  static async getSharedPractices(): Promise<(Practice & { comment_count: number; title: string })[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const ownedPractices = this.getOwnedPractices();

      if (ownedPractices.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .eq('is_shared', true)
        .in('practice_id', ownedPractices)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared practices:', error);
        return [];
      }

      const practices = data || [];

      // Fetch comment counts and lesson titles for all practices
      const practicesWithCounts = await Promise.all(
        practices.map(async (practice) => {
          if (!supabase) {
            return {
              ...practice,
              comment_count: 0,
              title: 'Untitled Lesson'
            };
          }

          // Get comment count
          const { count } = await supabase
            .from('practice_comments')
            .select('*', { count: 'exact', head: true })
            .eq('practice_id', practice.practice_id);

          // Get lesson title
          const { data: lessonData } = await supabase
            .from('lessons')
            .select('title')
            .eq('id', practice.lesson_id)
            .single();

          return {
            ...practice,
            comment_count: count || 0,
            title: lessonData?.title || 'Untitled Lesson'
          };
        })
      );

      return practicesWithCounts;
    } catch (error) {
      console.error('Error fetching shared practices:', error);
      return [];
    }
  }

  static async getPracticesForLesson(lessonId: string): Promise<Practice[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('is_shared', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching practices for lesson:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching practices for lesson:', error);
      return [];
    }
  }

  static async addComment(
    practiceId: string,
    recordingId: string,
    userName: string,
    commentText: string,
    userId?: string,
    timestampSeconds?: number
  ): Promise<{ success: boolean; error?: string; commentId?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('practice_comments')
        .insert({
          practice_id: practiceId,
          recording_id: recordingId,
          user_name: userName.trim(),
          user_id: userId,
          comment_text: commentText.trim(),
          timestamp_seconds: timestampSeconds || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        return { success: false, error: 'Failed to add comment' };
      }

      return { success: true, commentId: data.id };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  static async getComments(
    practiceId: string,
    recordingId?: string
  ): Promise<PracticeComment[]> {
    if (!supabase) {
      console.error('Supabase is not configured');
      return [];
    }

    try {
      let query = supabase
        .from('practice_comments')
        .select('*')
        .eq('practice_id', practiceId)
        .order('timestamp_seconds', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (recordingId) {
        query = query.eq('recording_id', recordingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching comments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  static markPracticeAsOwned(practiceId: string): void {
    try {
      const ownedPractices = this.getOwnedPractices();
      if (!ownedPractices.includes(practiceId)) {
        ownedPractices.push(practiceId);
        localStorage.setItem(this.OWNED_PRACTICES_KEY, JSON.stringify(ownedPractices));
      }
    } catch (error) {
      console.error('Error marking practice as owned:', error);
    }
  }

  static removePracticeAsOwned(practiceId: string): void {
    try {
      const ownedPractices = this.getOwnedPractices();
      const filtered = ownedPractices.filter((id) => id !== practiceId);
      localStorage.setItem(this.OWNED_PRACTICES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing practice as owned:', error);
    }
  }

  static isPracticeOwned(practiceId: string): boolean {
    try {
      const ownedPractices = this.getOwnedPractices();
      return ownedPractices.includes(practiceId);
    } catch (error) {
      console.error('Error checking practice ownership:', error);
      return false;
    }
  }

  private static getOwnedPractices(): string[] {
    try {
      const stored = localStorage.getItem(this.OWNED_PRACTICES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting owned practices:', error);
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
}
