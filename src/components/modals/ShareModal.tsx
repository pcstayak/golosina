'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Share2, Mail, Copy, Download, Check, Cloud, Loader2 } from 'lucide-react';
import { useNotification } from '@/hooks/useNotification';
import type { AudioPiece } from '@/contexts/AppContext';
import {
  createLessonSummary,
  generateShareText,
  shareViaWebAPI,
  shareViaEmail,
  copyToClipboard,
  canUseWebShare,
  canShareFiles,
  createAudioFiles,
  type ShareData
} from '@/utils/shareUtils';
import { SharedLessonService } from '@/services/sharedLessonService';
import { useApp } from '@/contexts/AppContext';

interface ShareModalProps {
  onClose: () => void;
  currentSessionPieces: Record<string, AudioPiece[]>;
  getCurrentExercises: () => any[];
}

export default function ShareModal({ onClose, currentSessionPieces, getCurrentExercises }: ShareModalProps) {
  const { showSuccess, showError } = useNotification();
  const { getCurrentSet } = useApp();
  const [isCreatingFiles, setIsCreatingFiles] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const summary = createLessonSummary(currentSessionPieces, getCurrentExercises);
  const shareText = generateShareText(summary);
  const shareTitle = `Vocal Training Session - ${summary.sessionDate}`;
  
  const hasRecordings = summary.totalRecordings > 0;
  const webShareSupported = canUseWebShare();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleWebShare = async (includeFiles: boolean = false) => {
    try {
      setIsCreatingFiles(true);
      
      const shareData: ShareData = {
        title: shareTitle,
        text: shareText
      };
      
      if (includeFiles && hasRecordings) {
        const files = await createAudioFiles(currentSessionPieces, getCurrentExercises);
        if (files.length > 0 && canShareFiles(files)) {
          shareData.files = files;
        }
      }
      
      const success = await shareViaWebAPI(shareData);
      
      if (success) {
        showSuccess('Shared successfully!');
        onClose();
      } else {
        // Fallback to copy to clipboard
        await handleCopyToClipboard();
      }
    } catch (error) {
      console.error('Share failed:', error);
      showError('Failed to share. Try copying to clipboard instead.');
    } finally {
      setIsCreatingFiles(false);
    }
  };

  const handleEmailShare = () => {
    shareViaEmail({
      title: shareTitle,
      text: shareText
    });
    showSuccess('Email client opened');
    onClose();
  };

  const handleCopyToClipboard = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      showSuccess('Copied to clipboard!');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      showError('Failed to copy to clipboard');
    }
  };

  const handleDownloadSummary = () => {
    const blob = new Blob([shareText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocal-training-session-${summary.sessionDate.replace(/\//g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Summary downloaded!');
  };

  const handleUploadToCloud = async () => {
    if (!hasRecordings) {
      showError('No recordings to upload');
      return;
    }

    try {
      setIsUploadingToCloud(true);
      
      const currentSet = getCurrentSet();
      const sessionId = SharedLessonService.generateSessionId();
      
      const result = await SharedLessonService.uploadLessonRecap(
        sessionId,
        currentSet?.name || 'Vocal Training Session',
        currentSet?.description || 'A vocal training session with recordings',
        currentSessionPieces,
        getCurrentExercises
      );

      if (result.success && result.sessionId) {
        // Generate shareable URL on client side (always uses correct origin)
        const shareUrl = `${window.location.origin}/shared/${result.sessionId}`;
        
        // Copy the shareable URL to clipboard
        const copySuccess = await copyToClipboard(shareUrl);
        if (copySuccess) {
          showSuccess('Session uploaded! Shareable link copied to clipboard.');
        } else {
          showSuccess(`Session uploaded! Share this link: ${shareUrl}`);
        }
        onClose();
      } else {
        showError(result.error || 'Failed to upload session');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      showError('Failed to upload session. Please try again.');
    } finally {
      setIsUploadingToCloud(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Share Session</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Session Summary Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Session Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Date:</strong> {summary.sessionDate}</p>
              <p><strong>Recordings:</strong> {summary.totalRecordings}</p>
              <p><strong>Total Duration:</strong> {Math.floor(summary.totalDuration / 60)}m {Math.floor(summary.totalDuration % 60)}s</p>
              {summary.exercises.length > 0 && (
                <div className="mt-3">
                  <p><strong>Exercises:</strong></p>
                  <ul className="ml-4 space-y-1">
                    {summary.exercises.map((exercise, index) => (
                      <li key={index}>
                        • {exercise.name} ({exercise.recordings} recording{exercise.recordings !== 1 ? 's' : ''})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 mb-3">Share Options</h3>
            
            {/* Web Share API */}
            {webShareSupported && (
              <>
                <Button
                  onClick={() => handleWebShare(false)}
                  disabled={isCreatingFiles}
                  className="w-full flex items-center justify-center gap-2"
                  variant="primary"
                >
                  <Share2 className="w-4 h-4" />
                  Share Summary
                </Button>
                
                {hasRecordings && (
                  <Button
                    onClick={() => handleWebShare(true)}
                    disabled={isCreatingFiles}
                    className="w-full flex items-center justify-center gap-2"
                    variant="secondary"
                  >
                    <Share2 className="w-4 h-4" />
                    {isCreatingFiles ? 'Preparing files...' : 'Share with Audio Files'}
                  </Button>
                )}
              </>
            )}
            
            {/* Cloud Upload */}
            {hasRecordings && (
              <Button
                onClick={handleUploadToCloud}
                disabled={isUploadingToCloud || isCreatingFiles}
                className="w-full flex items-center justify-center gap-2"
                variant="primary"
              >
                {isUploadingToCloud ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading to Cloud...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    Upload & Get Shareable Link
                  </>
                )}
              </Button>
            )}
            
            {/* Email Share */}
            <Button
              onClick={handleEmailShare}
              className="w-full flex items-center justify-center gap-2"
              variant="secondary"
            >
              <Mail className="w-4 h-4" />
              Share via Email
            </Button>
            
            {/* Copy to Clipboard */}
            <Button
              onClick={handleCopyToClipboard}
              className="w-full flex items-center justify-center gap-2"
              variant="secondary"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            
            {/* Download Summary */}
            <Button
              onClick={handleDownloadSummary}
              className="w-full flex items-center justify-center gap-2"
              variant="secondary"
            >
              <Download className="w-4 h-4" />
              Download Summary
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 <strong>Tip:</strong> Use &quot;Upload &amp; Get Shareable Link&quot; to create a permanent link that others can access to listen to your recordings and view your session details. Other options work for quick local sharing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}