import type { AudioPiece } from '@/contexts/AppContext';

export interface ShareData {
  title: string;
  text: string;
  files?: File[];
  url?: string;
}

export interface LessonSummary {
  sessionDate: string;
  totalRecordings: number;
  totalDuration: number;
  exercises: Array<{
    name: string;
    recordings: number;
    duration: number;
  }>;
}

export const createLessonSummary = (currentSessionPieces: Record<string, AudioPiece[]>, getCurrentExercises: () => any[]): LessonSummary => {
  const exercises = getCurrentExercises();
  const sessionDate = new Date().toLocaleDateString();
  
  let totalRecordings = 0;
  let totalDuration = 0;
  
  const exerciseStats = Object.entries(currentSessionPieces).map(([exerciseKey, pieces]) => {
    const exerciseId = exerciseKey.split('_')[1];
    const exercise = exercises.find(ex => ex.id.toString() === exerciseId);
    
    if (!exercise || pieces.length === 0) return null;
    
    const exerciseDuration = pieces.reduce((sum, piece) => sum + piece.duration, 0);
    totalRecordings += pieces.length;
    totalDuration += exerciseDuration;
    
    return {
      name: exercise.name,
      recordings: pieces.length,
      duration: exerciseDuration
    };
  }).filter(Boolean) as Array<{
    name: string;
    recordings: number;
    duration: number;
  }>;
  
  return {
    sessionDate,
    totalRecordings,
    totalDuration,
    exercises: exerciseStats
  };
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
};

export const generateShareText = (summary: LessonSummary): string => {
  const { sessionDate, totalRecordings, totalDuration, exercises } = summary;
  
  let text = `🎤 Vocal Training Session - ${sessionDate}\n\n`;
  text += `📊 Session Summary:\n`;
  text += `• Total recordings: ${totalRecordings}\n`;
  text += `• Total duration: ${formatDuration(totalDuration)}\n\n`;
  
  if (exercises.length > 0) {
    text += `📋 Exercises completed:\n`;
    exercises.forEach(exercise => {
      text += `• ${exercise.name}: ${exercise.recordings} recording${exercise.recordings !== 1 ? 's' : ''} (${formatDuration(exercise.duration)})\n`;
    });
  }
  
  text += `\n🎵 Keep up the great vocal training progress!`;
  
  return text;
};

export const canUseWebShare = (): boolean => {
  return 'share' in navigator && navigator.canShare !== undefined;
};

export const canShareFiles = (files?: File[]): boolean => {
  if (!canUseWebShare() || !files || files.length === 0) return false;
  return navigator.canShare({ files });
};

export const shareViaWebAPI = async (shareData: ShareData): Promise<boolean> => {
  try {
    if (!canUseWebShare()) {
      throw new Error('Web Share API not supported');
    }
    
    const data: any = {
      title: shareData.title,
      text: shareData.text
    };
    
    if (shareData.url) {
      data.url = shareData.url;
    }
    
    if (shareData.files && shareData.files.length > 0 && canShareFiles(shareData.files)) {
      data.files = shareData.files;
    }
    
    await navigator.share(data);
    return true;
  } catch (error) {
    console.error('Web Share failed:', error);
    return false;
  }
};

export const shareViaEmail = (shareData: ShareData): void => {
  const subject = encodeURIComponent(shareData.title);
  const body = encodeURIComponent(shareData.text);
  const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
  window.open(mailtoUrl);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if ('clipboard' in navigator && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
};

export const createAudioFiles = async (currentSessionPieces: Record<string, AudioPiece[]>, getCurrentExercises: () => any[]): Promise<File[]> => {
  const exercises = getCurrentExercises();
  const files: File[] = [];
  
  for (const [exerciseKey, pieces] of Object.entries(currentSessionPieces)) {
    if (pieces.length === 0) continue;
    
    const exerciseId = exerciseKey.split('_')[1];
    const exercise = exercises.find(ex => ex.id.toString() === exerciseId);
    
    if (!exercise) continue;
    
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const fileName = `${exercise.name.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.webm`;
      const file = new File([piece.blob], fileName, { type: piece.blob.type });
      files.push(file);
    }
  }
  
  return files;
};