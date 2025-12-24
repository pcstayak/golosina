'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import VideoEmbed from '@/components/lesson/VideoEmbed'
import { VideoEmbedService } from '@/services/videoEmbedService'
import MediaPreview from '@/components/lessons/MediaPreview'
import LyricsWithAnnotations from '@/components/lessons/LyricsWithAnnotations'
import type { LessonStep } from '@/services/lessonService'
import { useAuth } from '@/contexts/AuthContext'

interface StepDisplayProps {
  step: LessonStep
  stepNumber: number
  showComments?: boolean
  assignmentId?: string
}

export default function StepDisplay({ step, stepNumber, showComments = false, assignmentId }: StepDisplayProps) {
  const { user, profile } = useAuth()
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

  // Combine all media types and sort by display_order
  const allMedia = [...step.media].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  return (
    <div className="border border-border rounded-[14px] overflow-hidden bg-[rgba(255,255,255,0.03)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.02)]">
      {/* Card Body */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <div className="text-sm font-black text-text m-0">Step {stepNumber}: {step.title}</div>
            {step.description && (
              <div className="text-[13.5px] text-muted leading-relaxed mt-2.5 max-w-[70ch]">
                {step.description}
              </div>
            )}
            {step.tips && step.tips.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {step.tips.map((tip, index) => (
                  <span
                    key={index}
                    className="border border-border bg-[rgba(255,255,255,0.04)] [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.03)] text-muted font-extrabold text-xs px-2.5 py-1.5 rounded-full"
                  >
                    {tip}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1.5 rounded-full border border-border bg-[rgba(255,255,255,0.05)] text-muted [html[data-theme='mist']_&]:bg-[rgba(17,24,39,0.04)] shrink-0">
            <span className="w-2 h-2 rounded-full bg-success" />
            In progress
          </span>
        </div>
      </div>

      {/* Media Section */}
      {allMedia.length > 0 && (
        <div className="border-t border-b border-border bg-gradient-to-br from-[rgba(255,255,255,0.12)] via-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.02)] [html[data-theme='mist']_&]:from-[rgba(109,40,217,0.12)] [html[data-theme='mist']_&]:via-[rgba(37,99,235,0.10)] [html[data-theme='mist']_&]:to-transparent flex items-center justify-center text-muted font-extrabold">
          {allMedia[currentMediaIndex].media_type === 'video' || allMedia[currentMediaIndex].media_type === 'audio' ? (
            <div className="w-full">
              <MediaPreview
                mediaUrl={allMedia[currentMediaIndex].media_url}
                mediaType={allMedia[currentMediaIndex].media_type}
                mediaPlatform={allMedia[currentMediaIndex].media_platform}
                embedId={allMedia[currentMediaIndex].embed_id}
                comments={allMedia[currentMediaIndex].comments || []}
                onAddComment={() => {}}
                onDeleteComment={() => {}}
                isEditable={false}
                lyrics={allMedia[currentMediaIndex].lyrics}
                mediaId={allMedia[currentMediaIndex].id}
                userId={user?.id}
                isTeacher={profile?.role === 'teacher'}
                assignmentId={assignmentId}
                studentId={assignmentId ? user?.id : undefined}
              />
            </div>
          ) : (
            <div className="w-full relative flex items-center justify-center p-4">
              <img
                src={allMedia[currentMediaIndex].media_url}
                alt={allMedia[currentMediaIndex].caption || `Media ${currentMediaIndex + 1}`}
                className="max-w-full h-auto object-contain"
              />
              {allMedia.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentMediaIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-panel hover:bg-panel-2 rounded-full p-2 shadow-custom transition-all z-10 border border-border"
                    aria-label="Previous media"
                  >
                    <ChevronLeft className="w-5 h-5 text-text" />
                  </button>
                  <button
                    onClick={() => setCurrentMediaIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-panel hover:bg-panel-2 rounded-full p-2 shadow-custom transition-all z-10 border border-border"
                    aria-label="Next media"
                  >
                    <ChevronRight className="w-5 h-5 text-text" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step Comments Section (teacher feedback on steps) */}
      {showComments && step.comments && step.comments.length > 0 && (
        <div className="p-3 border-t border-border">
          <div className="text-sm font-black text-text mb-2.5">Teacher Feedback</div>
          <div className="space-y-2">
            {step.comments.map((comment, index) => (
              <div key={index} className="text-[13.5px] text-muted">
                <p className="whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
