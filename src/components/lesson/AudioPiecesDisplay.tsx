'use client'

import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/Button';
import { Play, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function AudioPiecesDisplay() {
  const { state, dispatch, getCurrentExercise, getCurrentSet } = useApp();
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; pieceId: string | null }>({ 
    show: false, 
    pieceId: null 
  });
  
  const currentExercise = getCurrentExercise();
  
  if (!currentExercise) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No exercise selected</p>
      </div>
    );
  }

  const exerciseKey = `${getCurrentSet()?.id || 'shared'}_${currentExercise.id}`;
  const pieces = state.currentSessionPieces[exerciseKey] || [];

  const playAudioPiece = (piece: typeof pieces[0]) => {
    try {
      const audio = new Audio(URL.createObjectURL(piece.blob));
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    } catch (error) {
      console.error('Error creating audio URL:', error);
    }
  };

  const downloadPiece = (piece: typeof pieces[0]) => {
    try {
      const url = URL.createObjectURL(piece.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentExercise.name}_${piece.id}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading piece:', error);
    }
  };

  const deletePiece = (pieceId: string) => {
    setDeleteConfirm({ show: true, pieceId });
  };

  const confirmDelete = () => {
    if (deleteConfirm.pieceId) {
      dispatch({ 
        type: 'REMOVE_AUDIO_PIECE', 
        payload: { exerciseKey, pieceId: deleteConfirm.pieceId } 
      });
    }
    setDeleteConfirm({ show: false, pieceId: null });
  };

  if (pieces.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="text-4xl mb-4">🎤</div>
        <p className="mb-2">No recordings yet</p>
        <p className="text-sm">Start recording to see your audio pieces here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 mb-4">
        {pieces.length} recording{pieces.length !== 1 ? 's' : ''} for this exercise
      </div>
      
      {pieces.map((piece, index) => (
        <div key={piece.id} className="audio-piece">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800">
                Recording {index + 1}
              </div>
              <div className="text-xs text-gray-500">
                {piece.duration.toFixed(1)}s • {new Date(piece.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => playAudioPiece(piece)}
              className="p-2"
            >
              <Play className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadPiece(piece)}
              className="p-2"
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => deletePiece(piece.id)}
              className="p-2"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, pieceId: null })}
        onConfirm={confirmDelete}
        title="Delete Recording"
        message="Are you sure you want to delete this recording? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        confirmButtonVariant="danger"
      />
    </div>
  );
}