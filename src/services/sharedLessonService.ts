import { supabase } from '@/lib/supabase'
import type { AudioPiece, Exercise } from '@/contexts/AppContext'

// Helper function to get file extension from mime type
const getFileExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExtension: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'mp4',
    'audio/mp4;codecs=mp4a.40.2': 'mp4',
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg'
  };

  return mimeToExtension[mimeType] || 'webm'; // Default fallback
};

export interface SharedLessonData {
  session_id: string
  set_name: string
  set_description?: string
  recording_count: number
  created_at: string
  files: {
    [exerciseId: string]: {
      name: string
      files: Array<{
        name: string
        url: string
        duration: number
        timestamp: string
      }>
    }
  }
}

export interface UploadResult {
  success: boolean
  sessionId?: string
  shareUrl?: string
  error?: string
}

export class SharedLessonService {
  private static readonly BUCKET_NAME = 'lesson-recordings'
  private static readonly OWNED_SESSIONS_KEY = 'golosina_owned_sessions'

  private static async ensureBucketExists(): Promise<boolean> {
    if (!supabase) return false

    try {
      // Try to get bucket info first
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()
      
      if (listError) {
        console.error('Error listing buckets:', listError)
        return false
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME)
      
      if (!bucketExists) {
        console.log('Creating lesson-recordings bucket...')
        
        // Create the bucket with public access
        const { error: createError } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          allowedMimeTypes: ['audio/webm', 'audio/mp3', 'audio/wav']
        })
        
        if (createError) {
          console.error('Error creating bucket:', createError)
          return false
        }
        
        console.log('Bucket created successfully')
      }
      
      return true
    } catch (error) {
      console.error('Error ensuring bucket exists:', error)
      return false
    }
  }

  static async uploadLessonRecap(
    sessionId: string,
    setName: string,
    setDescription: string,
    currentSessionPieces: Record<string, AudioPiece[]>,
    getCurrentExercises: () => Exercise[],
    isUpdate: boolean = false
  ): Promise<UploadResult> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured. Please set up your environment variables.'
      }
    }


    try {
      const exercises = getCurrentExercises()
      const uploadPromises: Promise<any>[] = []
      const files: SharedLessonData['files'] = {}

      let totalRecordings = 0

      for (const [exerciseKey, pieces] of Object.entries(currentSessionPieces)) {
        if (pieces.length === 0) continue

        const exerciseId = exerciseKey.split('_')[1]
        const exercise = exercises.find(ex => ex.id.toString() === exerciseId)
        
        if (!exercise) continue

        // Upload each recording for this exercise
        for (let i = 0; i < pieces.length; i++) {
          const piece = pieces[i]
          const fileExtension = getFileExtensionFromMimeType(piece.blob.type)
          const fileName = `${sessionId}/${exerciseId}/${piece.id}.${fileExtension}`
          
          console.log('Uploading file:', fileName, 'size:', piece.blob.size)
          
          const uploadPromise = supabase.storage
            .from(this.BUCKET_NAME)
            .upload(fileName, piece.blob, {
              contentType: piece.blob.type || 'audio/webm',
              upsert: isUpdate // Allow overwriting existing files when updating
            })

          uploadPromises.push(uploadPromise.then((result) => {
            if (result.error) {
              console.error('Upload failed for', fileName, ':', result.error)
              throw result.error
            }
            console.log('Upload successful for', fileName, ':', result.data?.path)
            console.log('Full upload result:', result.data)
            return { fileName, piece, exercise, exerciseId, index: i }
          }))

          totalRecordings++
        }
      }

      // Process files after all uploads complete
      const uploadResults = await Promise.all(uploadPromises)
      
      // Check if any uploads failed
      const failedUploads = uploadResults.filter(result => !result.fileName)
      if (failedUploads.length > 0) {
        console.error('Some uploads failed:', failedUploads)
        return {
          success: false,
          error: `Failed to upload ${failedUploads.length} recordings`
        }
      }

      // Group results by exercise and generate public URLs
      for (const result of uploadResults) {
        const { fileName, piece, exercise, exerciseId, index } = result
        
        if (!files[exerciseId]) {
          files[exerciseId] = {
            name: exercise.name,
            files: []
          }
        }
        
        // Generate signed URL (required for RLS-protected buckets)
        const { data: signedUrlData, error: signedError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(fileName, 31536000) // 1 year expiry
        
        console.log('Generated signed URL for', fileName, ':', signedUrlData?.signedUrl || 'Failed')
        
        if (signedError) {
          console.error('Signed URL error for', fileName, ':', signedError)
          throw new Error(`Failed to create signed URL: ${signedError.message}`)
        }
        
        if (!signedUrlData?.signedUrl) {
          throw new Error(`No signed URL generated for ${fileName}`)
        }
        
        // Test the signed URL
        try {
          const testResponse = await fetch(signedUrlData.signedUrl, { method: 'HEAD' })
          console.log('File accessibility test for', fileName, '- Status:', testResponse.status)
        } catch (testError) {
          console.log('File accessibility test failed for', fileName, ':', testError)
        }

        const finalUrl = signedUrlData.signedUrl
        
        files[exerciseId].files.push({
          name: `${exercise.name} - Recording ${index + 1}`,
          url: finalUrl,
          duration: piece.duration,
          timestamp: piece.timestamp
        })
      }

      // Save or update lesson metadata in database
      let dbError = null;
      if (isUpdate) {
        const { error } = await supabase
          .from('shared_lessons')
          .update({
            set_name: setName,
            set_description: setDescription,
            recording_count: totalRecordings,
            files: files,
            updated_at: new Date().toISOString()
          })
          .eq('session_id', sessionId);
        dbError = error;
      } else {
        const { error } = await supabase
          .from('shared_lessons')
          .insert({
            session_id: sessionId,
            set_name: setName,
            set_description: setDescription,
            recording_count: totalRecordings,
            files: files
          });
        dbError = error;
      }

      if (dbError) {
        console.error('Database error:', dbError)
        return {
          success: false,
          error: `Failed to ${isUpdate ? 'update' : 'save'} lesson metadata`
        }
      }

      // Mark this session as owned by the current browser
      this.markSessionAsOwned(sessionId)

      return {
        success: true,
        sessionId // Return sessionId instead, let client generate URL
      }

    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during upload'
      }
    }
  }

  static async getSharedLesson(sessionId: string): Promise<SharedLessonData | null> {
    if (!supabase) {
      console.error('Supabase is not configured')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('shared_lessons')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error) {
        console.error('Error fetching shared lesson:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching shared lesson:', error)
      return null
    }
  }

  static async checkIfSessionExists(sessionId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { data, error } = await supabase
        .from('shared_lessons')
        .select('session_id')
        .eq('session_id', sessionId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking session existence:', error);
      return false;
    }
  }

  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  // Owner tracking utilities
  static markSessionAsOwned(sessionId: string): void {
    try {
      const ownedSessions = this.getOwnedSessions()
      if (!ownedSessions.includes(sessionId)) {
        ownedSessions.push(sessionId)
        localStorage.setItem(this.OWNED_SESSIONS_KEY, JSON.stringify(ownedSessions))
      }
    } catch (error) {
      console.error('Error marking session as owned:', error)
    }
  }

  static isSessionOwned(sessionId: string): boolean {
    try {
      const ownedSessions = this.getOwnedSessions()
      return ownedSessions.includes(sessionId)
    } catch (error) {
      console.error('Error checking session ownership:', error)
      return false
    }
  }

  private static getOwnedSessions(): string[] {
    try {
      const stored = localStorage.getItem(this.OWNED_SESSIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error getting owned sessions:', error)
      return []
    }
  }

  // Comment-related methods
  static async addComment(
    sessionId: string,
    recordingId: string,
    userName: string,
    commentText: string,
    userEmail?: string,
    timestampSeconds?: number
  ): Promise<{ success: boolean; error?: string; commentId?: string }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured'
      }
    }

    try {
      const { data, error } = await supabase
        .from('recording_comments')
        .insert({
          session_id: sessionId,
          recording_id: recordingId,
          user_name: userName.trim(),
          user_email: userEmail?.trim() || null,
          comment_text: commentText.trim(),
          timestamp_seconds: timestampSeconds || null
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error adding comment:', error)
        return {
          success: false,
          error: 'Failed to add comment'
        }
      }

      return {
        success: true,
        commentId: data.id
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  static async getComments(
    sessionId: string,
    recordingId?: string
  ): Promise<RecordingComment[]> {
    if (!supabase) {
      console.error('Supabase is not configured')
      return []
    }

    try {
      let query = supabase
        .from('recording_comments')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp_seconds', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      if (recordingId) {
        query = query.eq('recording_id', recordingId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching comments:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching comments:', error)
      return []
    }
  }

  static async getCommentsForTimestamp(
    sessionId: string,
    recordingId: string,
    timestampSeconds: number,
    tolerance: number = 1.0
  ): Promise<RecordingComment[]> {
    if (!supabase) {
      console.error('Supabase is not configured')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('recording_comments')
        .select('*')
        .eq('session_id', sessionId)
        .eq('recording_id', recordingId)
        .gte('timestamp_seconds', timestampSeconds - tolerance)
        .lte('timestamp_seconds', timestampSeconds + tolerance)
        .order('timestamp_seconds', { ascending: true })

      if (error) {
        console.error('Error fetching comments for timestamp:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching comments for timestamp:', error)
      return []
    }
  }

  static async deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured'
      }
    }

    try {
      const { error } = await supabase
        .from('recording_comments')
        .delete()
        .eq('id', commentId)

      if (error) {
        console.error('Error deleting comment:', error)
        return {
          success: false,
          error: 'Failed to delete comment'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting comment:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  // Delete recording functionality
  static async deleteRecording(
    sessionId: string,
    exerciseId: string,
    recordingId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase is not configured'
      }
    }

    // Check if user owns this session
    if (!this.isSessionOwned(sessionId)) {
      return {
        success: false,
        error: 'You do not have permission to delete recordings from this session'
      }
    }

    try {
      // First, get the current lesson data to update the files object
      const lessonData = await this.getSharedLesson(sessionId)
      if (!lessonData) {
        return {
          success: false,
          error: 'Session not found'
        }
      }

      const updatedFiles = { ...lessonData.files }

      // Find and remove the recording from the files object
      if (updatedFiles[exerciseId]) {
        const recordingIndex = updatedFiles[exerciseId].files.findIndex((file, index) =>
          `${exerciseId}-${index}` === recordingId
        )

        if (recordingIndex === -1) {
          return {
            success: false,
            error: 'Recording not found'
          }
        }

        const recording = updatedFiles[exerciseId].files[recordingIndex]

        // Delete the file from storage
        // Extract the file path from the signed URL or construct it
        const fileName = `${sessionId}/${exerciseId}/${recordingId.split('-').pop()}.webm`

        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([fileName])

        if (deleteError) {
          console.error('Error deleting file from storage:', deleteError)
          // Continue anyway - we'll still remove from database
        }

        // Remove the recording from the files array
        updatedFiles[exerciseId].files.splice(recordingIndex, 1)

        // If no recordings left in this exercise, remove the exercise
        if (updatedFiles[exerciseId].files.length === 0) {
          delete updatedFiles[exerciseId]
        }

        // Calculate new recording count
        const newRecordingCount = Object.values(updatedFiles).reduce((total, exercise) => {
          return total + exercise.files.length
        }, 0)

        // Update the database
        const { error: updateError } = await supabase
          .from('shared_lessons')
          .update({
            files: updatedFiles,
            recording_count: newRecordingCount,
            updated_at: new Date().toISOString()
          })
          .eq('session_id', sessionId)

        if (updateError) {
          console.error('Error updating lesson data:', updateError)
          return {
            success: false,
            error: 'Failed to update lesson data'
          }
        }

        // Delete associated comments
        const { error: commentsError } = await supabase
          .from('recording_comments')
          .delete()
          .eq('session_id', sessionId)
          .eq('recording_id', recordingId)

        if (commentsError) {
          console.error('Error deleting comments:', commentsError)
          // Don't fail the whole operation for this
        }

        return { success: true }
      } else {
        return {
          success: false,
          error: 'Exercise not found'
        }
      }
    } catch (error) {
      console.error('Error deleting recording:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }
}

export interface RecordingComment {
  id: string
  session_id: string
  recording_id: string
  user_name: string
  user_email?: string
  comment_text: string
  timestamp_seconds?: number
  created_at: string
  updated_at: string
}