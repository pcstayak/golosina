// Stub file for backward compatibility with RecapPage
// This service was deprecated in favor of practiceService
// TODO: Refactor RecapPage to use practiceService

export class SharedLessonService {
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  static isSessionOwned(sessionId: string): boolean {
    return false;
  }

  static async checkIfSessionExists(sessionId: string): Promise<boolean> {
    return false;
  }

  static async uploadLessonRecap(
    sessionId: string,
    title: string,
    description: string,
    audioPieces: any,
    getCurrentExercises: any,
    isUpdate: boolean
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    return { success: false, error: 'This feature is deprecated' };
  }

  static async deleteRecording(
    sessionId: string,
    exerciseId: string,
    pieceId: string
  ): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'This feature is deprecated' };
  }
}
