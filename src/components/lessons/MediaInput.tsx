'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, X, Video, Image as ImageIcon } from 'lucide-react'
import { VideoEmbedService } from '@/services/videoEmbedService'
import type { LessonStepMedia } from '@/services/lessonService'

interface MediaInputProps {
  media: LessonStepMedia[]
  onChange: (media: LessonStepMedia[]) => void
}

export default function MediaInput({ media, onChange }: MediaInputProps) {
  const [url, setUrl] = useState('')
  const [mediaType, setMediaType] = useState<'video' | 'image' | 'gif'>('video')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    let newMedia: LessonStepMedia

    if (mediaType === 'video') {
      const videoData = VideoEmbedService.extractVideoData(url)
      if (!videoData) {
        setError('Invalid video URL. Please use YouTube or Vimeo URLs.')
        return
      }

      newMedia = {
        media_type: 'video',
        media_url: url,
        media_platform: videoData.platform,
        embed_id: videoData.embedId,
        display_order: media.length,
        caption: caption || undefined,
      }
    } else {
      newMedia = {
        media_type: mediaType,
        media_url: url,
        display_order: media.length,
        caption: caption || undefined,
      }
    }

    onChange([...media, newMedia])
    setUrl('')
    setCaption('')
    setError('')
  }

  const handleRemove = (index: number) => {
    const newMedia = media.filter((_, i) => i !== index)
    onChange(newMedia.map((m, i) => ({ ...m, display_order: i })))
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Media</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  mediaType === 'video'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border'
                }`}
              >
                <Video className="w-4 h-4" />
                Video
              </button>
              <button
                type="button"
                onClick={() => setMediaType('image')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  mediaType === 'image'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </button>
              <button
                type="button"
                onClick={() => setMediaType('gif')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  mediaType === 'gif'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                GIF
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                mediaType === 'video'
                  ? 'https://www.youtube.com/watch?v=...'
                  : 'https://example.com/image.jpg'
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caption (optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe this media..."
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Submit Media
          </Button>
        </div>
      </div>

      {media.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Media Items ({media.length})</h4>
          {media.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-white border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {item.media_type === 'video' && <Video className="w-4 h-4 text-blue-600" />}
                  {(item.media_type === 'image' || item.media_type === 'gif') && (
                    <ImageIcon className="w-4 h-4 text-green-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {item.media_type.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{item.media_url}</p>
                {item.caption && (
                  <p className="text-xs text-gray-600 mt-1">{item.caption}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1 text-red-600 hover:text-red-700"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
