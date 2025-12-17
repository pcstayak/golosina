'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import VideoEmbed from '@/components/lesson/VideoEmbed'
import { VideoEmbedService } from '@/services/videoEmbedService'
import MediaPreview from '@/components/lessons/MediaPreview'
import type { LessonStep } from '@/services/lessonService'

interface StepDisplayProps {
  step: LessonStep
  stepNumber: number
  showComments?: boolean
}

export default function StepDisplay({ step, stepNumber, showComments = false }: StepDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

  // Combine all media types and sort by display_order
  const allMedia = [...step.media].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  return (
    <div className="bg-white rounded-lg border">
      {/* Collapsible Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-bold text-gray-800">
          Step {stepNumber}: {step.title}
        </h2>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6">
          {step.description && (
            <p className="text-gray-700 whitespace-pre-wrap mb-4">{step.description}</p>
          )}

          {/* Unified Media Carousel */}
          {allMedia.length > 0 && (
            <div className="mb-6">
              {/* Current Media Display */}
              {allMedia[currentMediaIndex].media_type === 'video' || allMedia[currentMediaIndex].media_type === 'audio' ? (
                // Video/Audio - MediaPreview handles its own container sizing
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
                  />
                </div>
              ) : (
                // Image/GIF - use 16:9 container with navigation
                <div className="relative">
                  <div className="relative" style={{ paddingTop: '56.25%' }}>
                    <div className="absolute inset-0 flex items-center justify-center p-4 bg-gray-100 rounded-lg">
                      <img
                        src={allMedia[currentMediaIndex].media_url}
                        alt={allMedia[currentMediaIndex].caption || `Media ${currentMediaIndex + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Navigation Buttons - positioned on fixed container */}
                  {allMedia.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentMediaIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all z-10"
                        aria-label="Previous media"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-800" />
                      </button>

                      <button
                        onClick={() => setCurrentMediaIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all z-10"
                        aria-label="Next media"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-800" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Caption - outside fixed container, scales vertically */}
              {allMedia[currentMediaIndex].caption && (
                <p className="mt-3 text-sm text-gray-700">{allMedia[currentMediaIndex].caption}</p>
              )}

              {/* Dot Indicators - Only show if more than one media item */}
              {allMedia.length > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {allMedia.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMediaIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentMediaIndex
                          ? 'bg-blue-600 w-8'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to media ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Media Counter - Only show if more than one media item */}
              {allMedia.length > 1 && (
                <p className="mt-2 text-center text-sm text-gray-600">
                  Media {currentMediaIndex + 1} of {allMedia.length}
                </p>
              )}
            </div>
          )}

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">💡 Tips</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                {step.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Teacher Comments */}
          {showComments && step.comments && step.comments.length > 0 && (
            <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">📝 Teacher Notes</h3>
              {step.comments.map((comment, index) => (
                <div key={index} className="text-sm text-blue-800 mb-2">
                  <p className="whitespace-pre-wrap">{comment.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
