'use client'

import VideoCarousel from '@/components/lesson/VideoCarousel'
import VideoEmbed from '@/components/lesson/VideoEmbed'
import { VideoEmbedService } from '@/services/videoEmbedService'
import type { LessonStep } from '@/services/lessonService'

interface StepDisplayProps {
  step: LessonStep
  stepNumber: number
  showComments?: boolean
}

export default function StepDisplay({ step, stepNumber, showComments = false }: StepDisplayProps) {
  const videoMedia = step.media.filter((m) => m.media_type === 'video')
  const imageMedia = step.media.filter((m) => m.media_type === 'image' || m.media_type === 'gif')

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Step {stepNumber}: {step.title}
        </h2>
        {step.description && (
          <p className="text-gray-700 whitespace-pre-wrap">{step.description}</p>
        )}
      </div>

      {/* Media Content */}
      {videoMedia.length > 0 && (
        <div className="mb-6">
          {videoMedia.length === 1 ? (
            <div>
              {videoMedia[0].embed_id ? (
                <VideoEmbed
                  embedUrl={VideoEmbedService.getEmbedUrl(
                    (videoMedia[0].media_platform as any) || 'youtube',
                    videoMedia[0].embed_id
                  )}
                  platform={videoMedia[0].media_platform as any}
                  title={videoMedia[0].caption}
                />
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    Video embed ID missing. URL: {videoMedia[0].media_url}
                  </p>
                </div>
              )}
              {videoMedia[0].caption && (
                <p className="text-sm text-gray-600 mt-2">{videoMedia[0].caption}</p>
              )}
            </div>
          ) : (
            <VideoCarousel
              videos={videoMedia.map((m) => ({
                video_url: m.media_url,
                video_platform: m.media_platform as any,
                embed_id: m.embed_id || '',
                description: m.caption,
                display_order: m.display_order,
              }))}
            />
          )}
        </div>
      )}

      {imageMedia.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {imageMedia.map((media, index) => (
              <div key={index} className="rounded-lg overflow-hidden border">
                <img
                  src={media.media_url}
                  alt={media.caption || `Image ${index + 1}`}
                  className="w-full h-auto"
                />
                {media.caption && (
                  <div className="p-2 bg-gray-50">
                    <p className="text-sm text-gray-600">{media.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {step.tips && (
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
          <h3 className="text-sm font-semibold text-yellow-900 mb-1">💡 Tips</h3>
          <p className="text-sm text-yellow-800 whitespace-pre-wrap">{step.tips}</p>
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
  )
}
