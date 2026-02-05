// Stream caching for faster repeated access
interface CachedStream {
  url: string;
  quality: string;
  format: string;
  container: string;
  hasAudio: boolean;
  hasVideo: boolean;
  filesize?: number;
  isLive?: boolean;
  isHLS?: boolean;
  isDASH?: boolean;
}

interface CacheEntry {
  streams: CachedStream[];
  hlsUrl?: string;
  dashUrl?: string;
  isLive?: boolean;
  title?: string;
  author?: string;
  timestamp: number;
}

interface VideoInfoCache {
  videoId: string;
  title: string;
  author: string;
  authorId: string;
  description: string;
  viewCount: number;
  lengthSeconds: number;
  publishedText: string;
  thumbnail: string;
  timestamp: number;
}

// Cache duration: 30 minutes for streams, 1 hour for video info
const STREAM_CACHE_DURATION = 30 * 60 * 1000;
const VIDEO_INFO_CACHE_DURATION = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

class StreamCache {
  private streamCache: Map<string, CacheEntry> = new Map();
  private videoInfoCache: Map<string, VideoInfoCache> = new Map();
  private pendingRequests: Map<string, Promise<CacheEntry | null>> = new Map();
  private pendingVideoInfo: Map<string, Promise<VideoInfoCache | null>> = new Map();

  getStream(videoId: string): CacheEntry | null {
    const entry = this.streamCache.get(videoId);
    if (entry && Date.now() - entry.timestamp < STREAM_CACHE_DURATION) {
      console.log(`[StreamCache] Cache hit for stream: ${videoId}`);
      return entry;
    }
    return null;
  }

  setStream(videoId: string, data: Omit<CacheEntry, 'timestamp'>): void {
    this.cleanupIfNeeded();
    this.streamCache.set(videoId, { ...data, timestamp: Date.now() });
    console.log(`[StreamCache] Cached stream: ${videoId}`);
  }

  getVideoInfo(videoId: string): VideoInfoCache | null {
    const entry = this.videoInfoCache.get(videoId);
    if (entry && Date.now() - entry.timestamp < VIDEO_INFO_CACHE_DURATION) {
      console.log(`[StreamCache] Cache hit for video info: ${videoId}`);
      return entry;
    }
    return null;
  }

  setVideoInfo(videoId: string, data: Omit<VideoInfoCache, 'timestamp'>): void {
    this.cleanupIfNeeded();
    this.videoInfoCache.set(videoId, { ...data, timestamp: Date.now() });
    console.log(`[StreamCache] Cached video info: ${videoId}`);
  }

  // Deduplicate concurrent requests
  async getOrFetchStream(
    videoId: string, 
    fetcher: () => Promise<Omit<CacheEntry, 'timestamp'> | null>
  ): Promise<CacheEntry | null> {
    // Check cache first
    const cached = this.getStream(videoId);
    if (cached) return cached;

    // Check if request is already pending
    const pending = this.pendingRequests.get(videoId);
    if (pending) {
      console.log(`[StreamCache] Waiting for pending stream request: ${videoId}`);
      return pending;
    }

    // Start new request
    const promise: Promise<CacheEntry | null> = fetcher().then(result => {
      this.pendingRequests.delete(videoId);
      if (result) {
        const entry: CacheEntry = { ...result, timestamp: Date.now() };
        this.streamCache.set(videoId, entry);
        return entry;
      }
      return null;
    }).catch(err => {
      this.pendingRequests.delete(videoId);
      throw err;
    });

    this.pendingRequests.set(videoId, promise);
    return promise;
  }

  async getOrFetchVideoInfo(
    videoId: string,
    fetcher: () => Promise<Omit<VideoInfoCache, 'timestamp'> | null>
  ): Promise<VideoInfoCache | null> {
    // Check cache first
    const cached = this.getVideoInfo(videoId);
    if (cached) return cached;

    // Check if request is already pending
    const pending = this.pendingVideoInfo.get(videoId);
    if (pending) {
      console.log(`[StreamCache] Waiting for pending video info request: ${videoId}`);
      return pending;
    }

    // Start new request
    const promise = fetcher().then(result => {
      this.pendingVideoInfo.delete(videoId);
      if (result) {
        const entry: VideoInfoCache = { ...result, timestamp: Date.now() };
        this.videoInfoCache.set(videoId, entry);
        return entry;
      }
      return null;
    }).catch(err => {
      this.pendingVideoInfo.delete(videoId);
      throw err;
    });

    this.pendingVideoInfo.set(videoId, promise);
    return promise;
  }

  private cleanupIfNeeded(): void {
    if (this.streamCache.size > MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.streamCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
      toRemove.forEach(([key]) => this.streamCache.delete(key));
    }

    if (this.videoInfoCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(this.videoInfoCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
      toRemove.forEach(([key]) => this.videoInfoCache.delete(key));
    }
  }

  // Prefetch related videos (for recommendations)
  prefetchVideoInfo(videoIds: string[], fetcher: (id: string) => Promise<Omit<VideoInfoCache, 'timestamp'> | null>): void {
    videoIds.slice(0, 5).forEach(id => {
      if (!this.getVideoInfo(id) && !this.pendingVideoInfo.has(id)) {
        this.getOrFetchVideoInfo(id, () => fetcher(id)).catch(() => {});
      }
    });
  }

  clear(): void {
    this.streamCache.clear();
    this.videoInfoCache.clear();
    console.log('[StreamCache] Cache cleared');
  }
}

export const streamCache = new StreamCache();
