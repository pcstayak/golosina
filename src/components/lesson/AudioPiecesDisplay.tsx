'use client'

import { useApp } from '@/contexts/AppContext';
import { useState, useCallback } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AudioPlayer from './AudioPlayer';
import { useAudioRecording } from '@/hooks/useAudioRecording';

export default function AudioPiecesDisplay() {
  const { state, dispatch, getCurrentExercise, getCurrentSet } = useApp();
  const { getFileExtensionFromMimeType } = useAudioRecording();
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; pieceId: string | null }>({
    show: false,
    pieceId: null
  });
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const currentExercise = getCurrentExercise();
  const exerciseKey = `${getCurrentSet()?.id || 'shared'}_${currentExercise?.id}`;
  const pieces = state.currentSessionPieces[exerciseKey] || [];

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

  const downloadPiece = useCallback((piece: typeof pieces[0]) => {
    if (!currentExercise) return;

    try {
      const url = URL.createObjectURL(piece.blob);

      // Get the proper file extension based on the blob's mime type
      const fileExtension = getFileExtensionFromMimeType(piece.blob.type);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentExercise.name}_${piece.id}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading piece:', error);
    }
  }, [currentExercise, getFileExtensionFromMimeType]);

  const deletePiece = useCallback((pieceId: string) => {
    // Stop playback if this piece is currently playing
    if (currentlyPlaying === pieceId) {
      setCurrentlyPlaying(null);
    }
    setDeleteConfirm({ show: true, pieceId });
  }, [currentlyPlaying]);

  const confirmDelete = useCallback(() => {
    if (deleteConfirm.pieceId) {
      dispatch({
        type: 'REMOVE_AUDIO_PIECE',
        payload: { exerciseKey, pieceId: deleteConfirm.pieceId }
      });
    }
    setDeleteConfirm({ show: false, pieceId: null });
  }, [dispatch, exerciseKey, deleteConfirm.pieceId]);

  const updatePieceTitle = useCallback((pieceId: string, title: string) => {
    dispatch({
      type: 'UPDATE_AUDIO_PIECE_TITLE',
      payload: { exerciseKey, pieceId, title }
    });
  }, [dispatch, exerciseKey]);

  if (!currentExercise) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No exercise selected</p>
      </div>
    );
  }

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
        <AudioPlayer
          key={piece.id}
          piece={piece}
          index={index}
          onDelete={deletePiece}
          onDownload={downloadPiece}
          onTitleUpdate={updatePieceTitle}
          isPlaying={currentlyPlaying === piece.id}
          onPlayStateChange={handlePlayStateChange}
          exerciseName={currentExercise.name}
          showDeleteButton={true}
        />
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