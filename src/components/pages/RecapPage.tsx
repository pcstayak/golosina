'use client'

import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { useState } from 'react';
import ShareModal from '@/components/modals/ShareModal';
import AlertDialog from '@/components/ui/AlertDialog';
import { useAudioRecording } from '@/hooks/useAudioRecording';

export default function RecapPage() {
  const { state, dispatch, getCurrentExercises } = useApp();
  const { getFileExtensionFromMimeType } = useAudioRecording();
  const [showShareModal, setShowShareModal] = useState(false);
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

  const handleShare = () => {
    setShowShareModal(true);
  };

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
              disabled={!hasRecordings}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Lesson
            </Button>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800">
          Session Recap
        </h2>
        <p className="text-gray-600">
          Review your recorded exercises from this session
        </p>
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
                    <div 
                      key={piece.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            Recording {index + 1}
                          </div>
                          <div className="text-sm text-gray-500">
                            {piece.duration.toFixed(1)}s • {new Date(piece.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const audio = new Audio(URL.createObjectURL(piece.blob));
                            audio.play();
                          }}
                        >
                          ▶️ Play
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const url = URL.createObjectURL(piece.blob);
                            const fileExtension = getFileExtensionFromMimeType(piece.blob.type);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${exercise.name}_${piece.id}.${fileExtension}`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          💾 Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          currentSessionPieces={state.currentSessionPieces}
          getCurrentExercises={getCurrentExercises}
        />
      )}

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