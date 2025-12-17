'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Plus, X, Video, Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import { VideoEmbedService } from '@/services/videoEmbedService'
import { supabase } from '@/lib/supabase'
import type { LessonStepMedia } from '@/services/lessonService'
import MediaPreview, { MediaComment } from './MediaPreview'

interface MediaInputProps {
  media: LessonStepMedia[]
  onChange: (media: LessonStepMedia[]) => void
  userId?: string
  lessonId?: string
  stepId?: string
}

export default function MediaInput({ media, onChange, userId, lessonId, stepId }: MediaInputProps) {
  const [url, setUrl] = useState('')
  const [mediaType, setMediaType] = useState<'video' | 'image' | 'gif' | 'audio'>('video')
  const [caption, setCaption] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        lyrics: lyrics || undefined,
      }
    } else {
      newMedia = {
        media_type: mediaType,
        media_url: url,
        display_order: media.length,
        caption: caption || undefined,
        lyrics: lyrics || undefined,
      }
    }

    onChange([...media, newMedia])
    setUrl('')
    setCaption('')
    setLyrics('')
    setError('')
  }

  const handleRemove = (index: number) => {
    const newMedia = media.filter((_, i) => i !== index)
    onChange(newMedia.map((m, i) => ({ ...m, display_order: i })))
    if (selectedMediaIndex === index) {
      setSelectedMediaIndex(null)
    } else if (selectedMediaIndex !== null && selectedMediaIndex > index) {
      setSelectedMediaIndex(selectedMediaIndex - 1)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (100MB limit)
    const MAX_FILE_SIZE = 100 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 100MB limit')
      return
    }

    // Detect media type from file extension
    const fileName = file.name.toLowerCase()
    let detectedMediaType: 'video' | 'audio' | 'image' | 'gif' = 'video'

    if (fileName.match(/\.(mp3|wav|m4a|ogg)$/)) {
      detectedMediaType = 'audio'
    } else if (fileName.match(/\.(mp4|webm|mov)$/)) {
      detectedMediaType = 'video'
    } else if (fileName.match(/\.gif$/)) {
      detectedMediaType = 'gif'
    } else if (fileName.match(/\.(jpg|jpeg|png|webp)$/)) {
      detectedMediaType = 'image'
    } else {
      setError('Unsupported file format. Please use: mp4, webm, mov, mp3, wav, m4a, ogg, jpg, png, gif')
      return
    }

    if (!supabase) {
      setError('File upload is not available. Supabase is not configured.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      // Generate unique filename
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${userId || 'temp'}/${lessonId || 'draft'}/${stepId || 'step'}/${timestamp}_${sanitizedFileName}`

      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lesson-media')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lesson-media')
        .getPublicUrl(storagePath)

      const publicUrl = urlData.publicUrl

      // Add media to list
      const newMedia: LessonStepMedia = {
        media_type: detectedMediaType,
        media_url: publicUrl,
        display_order: media.length,
        caption: caption || undefined,
        lyrics: lyrics || undefined,
      }

      onChange([...media, newMedia])
      setCaption('')
      setLyrics('')
      setError('')

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      console.error('Error uploading file:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddComment = (mediaIndex: number, timestampSeconds: number, commentText: string) => {
    const updatedMedia = [...media]
    const mediaItem = updatedMedia[mediaIndex]

    if (!mediaItem.comments) {
      mediaItem.comments = []
    }

    const newComment: MediaComment = {
      id: `temp-${Date.now()}`,
      timestamp_seconds: timestampSeconds,
      comment_text: commentText,
      created_by: userId || 'teacher',
      created_at: new Date().toISOString()
    }

    mediaItem.comments.push(newComment)
    onChange(updatedMedia)
  }

  const handleDeleteComment = (mediaIndex: number, commentId: string) => {
    const updatedMedia = [...media]
    const mediaItem = updatedMedia[mediaIndex]

    if (mediaItem.comments) {
      mediaItem.comments = mediaItem.comments.filter(c => c.id !== commentId)
    }

    onChange(updatedMedia)
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media Type
            </label>
            <div className="flex gap-2 flex-wrap">
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
                onClick={() => setMediaType('audio')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  mediaType === 'audio'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border'
                }`}
              >
                <Video className="w-4 h-4" />
                Audio
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

          <div className="flex gap-2">
            <div className="flex-1">
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
            <div className="flex-1">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {/* Lyrics textarea - only show for video/audio */}
          {(mediaType === 'video' || mediaType === 'audio') && (
            <div>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Lyrics (optional)"
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Add song lyrics or text content. You can search for lyrics in Phase 2.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAdd}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add from URL
            </Button>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/mp4,audio/ogg,image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload from Device
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {media.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Media Items ({media.length})</h4>
          {media.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-white border rounded-lg">
                <button
                  type="button"
                  onClick={() => setSelectedMediaIndex(selectedMediaIndex === index ? null : index)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {item.media_type === 'video' && <Video className="w-4 h-4 text-blue-600" />}
                    {item.media_type === 'audio' && <Video className="w-4 h-4 text-purple-600" />}
                    {(item.media_type === 'image' || item.media_type === 'gif') && (
                      <ImageIcon className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {item.media_type.toUpperCase()}
                    </span>
                    {item.comments && item.comments.length > 0 && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {item.comments.length} comment{item.comments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {item.lyrics && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded ml-2">
                        Has lyrics
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{item.media_url}</p>
                  {item.caption && (
                    <p className="text-xs text-gray-600 mt-1">{item.caption}</p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1 text-red-600 hover:text-red-700"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Media Preview */}
              {selectedMediaIndex === index && (item.media_type === 'video' || item.media_type === 'audio') && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <MediaPreview
                    mediaUrl={item.media_url}
                    mediaType={item.media_type}
                    mediaPlatform={item.media_platform}
                    embedId={item.embed_id}
                    comments={item.comments || []}
                    onAddComment={(timestamp, text) => handleAddComment(index, timestamp, text)}
                    onDeleteComment={(commentId) => handleDeleteComment(index, commentId)}
                    isEditable={true}
                    lyrics={item.lyrics}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
