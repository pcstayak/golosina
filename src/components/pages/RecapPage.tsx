'use client'

import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Download, Share2, Copy, Check, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import AlertDialog from '@/components/ui/AlertDialog';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import AudioPlayer from '@/components/lesson/AudioPlayer';
import { SharedLessonService } from '@/services/sharedLessonService';

export default function RecapPage() {
  const { state, dispatch, getCurrentExercises, getCurrentSet } = useApp();
  const { getFileExtensionFromMimeType } = useAudioRecording();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({ show: false, title: '', message: '', variant: 'info' });

  const backToLesson = () => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'lesson' });
  };

  const hasRecordings = Object.values(state.currentSessionPieces)
    .some(pieces => pieces.length > 0);

  const totalPieces = Object.values(state.currentSessionPieces)
    .reduce((total, pieces) => total + pieces.length, 0);

  const handleDownloadAll = async () => {
    if (!hasRecordings) {
      setAlertDialog({
        show: true,
        title: 'No Recordings',
        message: 'There are no recordings to download. Start recording to create audio files.',
        variant: 'info'
      });
      return;
    }

    try {
      // Create a zip file with all recordings
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Get current timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Add all recordings to zip
      let fileCount = 0;
      for (const [exerciseKey, pieces] of Object.entries(state.currentSessionPieces)) {
        if (pieces.length === 0) continue;
        
        const exerciseId = exerciseKey.split('_')[1];
        const exercise = getCurrentExercises().find(ex => 
          ex.id.toString() === exerciseId
        );
        
        if (!exercise) continue;
        
        // Create folder for this exercise with better file name sanitization
        const exerciseFolder = zip.folder(exercise.name.replace(/[/\\?%*:|"<>]/g, '-'));
        
        for (let i = 0; i < pieces.length; i++) {
          const piece = pieces[i];
          const fileExtension = getFileExtensionFromMimeType(piece.blob.type);
          const fileName = `recording_${i + 1}_${piece.id}.${fileExtension}`;

          // Add blob directly to zip folder
          exerciseFolder?.file(fileName, piece.blob);
          fileCount++;
        }
      }
      
      if (fileCount === 0) {
        setAlertDialog({
          show: true,
          title: 'No Audio Files',
          message: 'No valid audio files found to download.',
          variant: 'error'
        });
        return;
      }
      
      // Generate and download zip with compression
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice_lesson_recordings_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setAlertDialog({
        show: true,
        title: 'Download Started',
        message: `Successfully created download file with ${fileCount} recording${fileCount !== 1 ? 's' : ''}.`,
        variant: 'success'
      });
      
    } catch (error) {
      console.error('Error creating zip file:', error);
      setAlertDialog({
        show: true,
        title: 'Download Failed',
        message: 'Error creating download file. Please try again or download recordings individually.',
        variant: 'error'
      });
    }
  };

  const handleShare = async () => {
    if (!hasRecordings) {
      setAlertDialog({
        show: true,
        title: 'No Recordings',
        message: 'There are no recordings to share. Start recording to create audio files.',
        variant: 'info'
      });
      return;
    }

    try {
      dispatch({ type: 'SET_IS_UPLOADING', payload: true });

      const currentSet = getCurrentSet();
      let sessionId = state.currentSessionId;
      let isUpdate = false;

      // If we don't have a session ID, generate one
      if (!sessionId) {
        sessionId = SharedLessonService.generateSessionId();
        dispatch({ type: 'SET_CURRENT_SESSION_ID', payload: sessionId });
      } else {
        // Check if this session was already shared
        isUpdate = await SharedLessonService.checkIfSessionExists(sessionId);
      }

      const result = await SharedLessonService.uploadLessonRecap(
        sessionId,
        currentSet?.name || 'Vocal Training Session',
        currentSet?.description || 'A vocal training session with recordings',
        state.currentSessionPieces,
        getCurrentExercises,
        isUpdate
      );

      if (result.success && result.sessionId) {
        const shareUrl = `${window.location.origin}/shared/${result.sessionId}`;
        dispatch({ type: 'SET_SHARE_URL', payload: shareUrl });
        // Success - no popup needed, URL appears in UI
      } else {
        setAlertDialog({
          show: true,
          title: 'Share Failed',
          message: result.error || 'Failed to share session. Please try again.',
          variant: 'error'
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      setAlertDialog({
        show: true,
        title: 'Share Failed',
        message: 'An unexpected error occurred. Please try again.',
        variant: 'error'
      });
    } finally {
      dispatch({ type: 'SET_IS_UPLOADING', payload: false });
    }
  };

  const copyShareUrl = async () => {
    if (!state.shareUrl) return;

    try {
      await navigator.clipboard.writeText(state.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Success feedback shown by button state change, no popup needed
    } catch (error) {
      setAlertDialog({
        show: true,
        title: 'Copy Failed',
        message: 'Failed to copy link to clipboard. Please copy it manually.',
        variant: 'error'
      });
    }
  };

  const handlePlayStateChange = useCallback((pieceId: string, playing: boolean) => {
    if (playing) {
      // Stop any currently playing audio
      setCurrentlyPlaying(pieceId);
    } else {
      // Only clear if this piece was playing
      if (currentlyPlaying === pieceId) {
        setCurrentlyPlaying(null);
      }
    }
  }, [currentlyPlaying]);

  const downloadPiece = useCallback((piece: any) => {
    const exerciseId = piece.exerciseId || 'recording';
    try {
      const url = URL.createObjectURL(piece.blob);
      const fileExtension = getFileExtensionFromMimeType(piece.blob.type);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exerciseId}_${piece.id}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading piece:', error);
    }
  }, [getFileExtensionFromMimeType]);

  const updatePieceTitle = useCallback((pieceId: string, title: string) => {
    // Find which exercise this piece belongs to
    for (const [exerciseKey, pieces] of Object.entries(state.currentSessionPieces)) {
      const piece = pieces.find(p => p.id === pieceId);
      if (piece) {
        dispatch({
          type: 'UPDATE_AUDIO_PIECE_TITLE',
          payload: { exerciseKey, pieceId, title }
        });
        break;
      }
    }
  }, [dispatch, state.currentSessionPieces]);

  // No-op delete function for recap (we don't allow deleting from recap)
  const handleDelete = useCallback((pieceId: string) => {
    // In recap view, we don't allow deletion
    console.log('Delete not allowed in recap view');
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={backToLesson}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lesson
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadAll}
              disabled={!hasRecordings}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download All {totalPieces > 0 && `(${totalPieces})`}
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={handleShare}
              disabled={!hasRecordings || state.isUploading}
              className="flex items-center gap-2"
            >
              {state.isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {state.currentSessionId ? 'Updating...' : 'Sharing...'}
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  {state.shareUrl ? 'Update Share' : 'Share Lesson'}
                </>
              )}
            </Button>
          </div>
        </div>

        

        <h2 className="text-2xl font-bold text-gray-800">
          Session Recap
        </h2>
        <p className="text-gray-600">
          Review your recorded exercises from this session
        </p>

        {/* Share URL Display */}
        {state.shareUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 mb-1">
                  Shareable Link Available
                </p>
                <div className="bg-white border border-green-200 rounded px-2 py-1 text-sm text-gray-700 break-all">
                  {state.shareUrl}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyShareUrl}
                className="ml-3 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Recap Content */}
      <div className="space-y-6">
        {Object.keys(state.currentSessionPieces).length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎤</div>
            <h3 className="text-xl font-semibold mb-2">No recordings yet</h3>
            <p className="text-gray-600 mb-4">
              Start recording exercises to see your progress here.
            </p>
            <Button onClick={backToLesson} variant="primary">
              Back to Lesson
            </Button>
          </div>
        ) : (
          Object.entries(state.currentSessionPieces).map(([exerciseKey, pieces]) => {
            if (pieces.length === 0) return null;

            const exerciseId = exerciseKey.split('_')[1];
            const exercise = getCurrentExercises().find(ex => 
              ex.id.toString() === exerciseId
            );

            if (!exercise) return null;

            return (
              <div key={exerciseKey} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-secondary p-4">
                  <h3 className="text-xl font-semibold text-white">
                    {exercise.name}
                  </h3>
                  <p className="text-white/80">
                    {pieces.length} recording{pieces.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="p-4 space-y-3">
                  {pieces.map((piece, index) => (
                    <AudioPlayer
                      key={piece.id}
                      piece={piece}
                      index={index}
                      onDelete={handleDelete}
                      onDownload={downloadPiece}
                      onTitleUpdate={updatePieceTitle}
                      isPlaying={currentlyPlaying === piece.id}
                      onPlayStateChange={handlePlayStateChange}
                      exerciseName={exercise.name}
                      showDeleteButton={false}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.show}
        onClose={() => setAlertDialog({ ...alertDialog, show: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
      />
    </div>
  );
}