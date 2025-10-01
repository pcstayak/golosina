export type VideoPlatform = 'youtube' | 'vimeo' | 'audio' | 'other';

export interface VideoProvider {
  platform: VideoPlatform;
  validateUrl(url: string): boolean;
  extractId(url: string): string | null;
  getEmbedUrl(id: string): string;
  getThumbnailUrl(id: string): string;
}

export interface VideoEmbedData {
  platform: VideoPlatform;
  embedId: string;
  embedUrl: string;
  thumbnailUrl: string;
  originalUrl: string;
}

class YouTubeProvider implements VideoProvider {
  platform: VideoPlatform = 'youtube';

  validateUrl(url: string): boolean {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/v\/[\w-]+/,
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  extractId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  getEmbedUrl(id: string): string {
    return `https://www.youtube.com/embed/${id}`;
  }

  getThumbnailUrl(id: string): string {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
}

class VimeoProvider implements VideoProvider {
  platform: VideoPlatform = 'vimeo';

  validateUrl(url: string): boolean {
    const patterns = [
      /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+/,
      /^(https?:\/\/)?(player\.)?vimeo\.com\/video\/\d+/,
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  extractId(url: string): string | null {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /vimeo\.com\/video\/(\d+)/,
      /^(\d+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  getEmbedUrl(id: string): string {
    return `https://player.vimeo.com/video/${id}`;
  }

  getThumbnailUrl(id: string): string {
    return `https://vumbnail.com/${id}.jpg`;
  }
}

export class VideoEmbedService {
  private static providers: VideoProvider[] = [
    new YouTubeProvider(),
    new VimeoProvider(),
  ];

  static detectProvider(url: string): VideoProvider | null {
    for (const provider of this.providers) {
      if (provider.validateUrl(url)) {
        return provider;
      }
    }
    return null;
  }

  static validateVideoUrl(url: string): { valid: boolean; error?: string } {
    if (!url || url.trim() === '') {
      return { valid: false, error: 'URL is required' };
    }

    const trimmedUrl = url.trim();

    try {
      new URL(trimmedUrl);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }

    const provider = this.detectProvider(trimmedUrl);
    if (!provider) {
      return {
        valid: false,
        error: 'Unsupported video platform. Currently supported: YouTube, Vimeo'
      };
    }

    const id = provider.extractId(trimmedUrl);
    if (!id) {
      return { valid: false, error: 'Could not extract video ID from URL' };
    }

    return { valid: true };
  }

  static extractVideoData(url: string): VideoEmbedData | null {
    const validation = this.validateVideoUrl(url);
    if (!validation.valid) {
      return null;
    }

    const trimmedUrl = url.trim();
    const provider = this.detectProvider(trimmedUrl);

    if (!provider) {
      return null;
    }

    const id = provider.extractId(trimmedUrl);
    if (!id) {
      return null;
    }

    return {
      platform: provider.platform,
      embedId: id,
      embedUrl: provider.getEmbedUrl(id),
      thumbnailUrl: provider.getThumbnailUrl(id),
      originalUrl: trimmedUrl,
    };
  }

  static getEmbedUrl(platform: VideoPlatform, embedId: string): string {
    const provider = this.providers.find(p => p.platform === platform);
    if (!provider) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return provider.getEmbedUrl(embedId);
  }

  static getThumbnailUrl(platform: VideoPlatform, embedId: string): string {
    const provider = this.providers.find(p => p.platform === platform);
    if (!provider) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return provider.getThumbnailUrl(embedId);
  }

  static getSupportedPlatforms(): string[] {
    return this.providers.map(p => p.platform);
  }
}
