// Piped API integration for video stream fetching
// Based on choco-tube implementation

const PIPED_SERVERS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.moomoo.me',
  'https://api.piped.yt',
];

const TIMEOUT_MS = 5000;

export interface PipedStream {
  url: string;
  format: string;
  quality: string;
  mimeType: string;
  codec?: string;
  videoOnly: boolean;
  bitrate?: number;
  width?: number;
  height?: number;
}

export interface PipedVideoInfo {
  title: string;
  description: string;
  uploader: string;
  uploaderId: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  uploaderSubscriberCount: number;
  views: number;
  likes: number;
  dislikes: number;
  duration: number;
  uploadDate: string;
  thumbnailUrl: string;
  hls?: string;
  dash?: string;
  audioStreams: PipedStream[];
  videoStreams: PipedStream[];
  relatedStreams: PipedRelatedVideo[];
  livestream: boolean;
}

export interface PipedRelatedVideo {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  duration: number;
  views: number;
  uploaded: number;
  uploadedDate: string;
}

export interface PipedSearchResult {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderAvatar: string;
  duration: number;
  views: number;
  uploaded: number;
  uploadedDate: string;
  type: string;
}

// Track working servers for optimization
let workingServers: string[] = [];
let lastServerUpdate = 0;
const SERVER_CACHE_DURATION = 5 * 60 * 1000;

const fetchWithTimeout = async (url: string, timeout: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Parallel fetch with early termination
const parallelFetch = async <T>(
  endpoint: string,
  servers: string[]
): Promise<{ data: T; server: string } | null> => {
  const promises = servers.map(async (server): Promise<{ data: T; server: string } | null> => {
    try {
      const response = await fetchWithTimeout(`${server}${endpoint}`, TIMEOUT_MS);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data && !data.error) {
        // Track successful server
        if (!workingServers.includes(server)) {
          workingServers = [server, ...workingServers].slice(0, 3);
          lastServerUpdate = Date.now();
        }
        return { data, server };
      }
      return null;
    } catch {
      return null;
    }
  });

  return new Promise((resolve) => {
    let settled = false;
    let completed = 0;
    
    promises.forEach(promise => {
      promise.then(result => {
        completed++;
        if (!settled && result) {
          settled = true;
          console.log(`[Piped] Success from ${result.server}`);
          resolve(result);
        } else if (completed === promises.length && !settled) {
          resolve(null);
        }
      });
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, TIMEOUT_MS + 500);
  });
};

const getOrderedServers = (): string[] => {
  const now = Date.now();
  if (now - lastServerUpdate > SERVER_CACHE_DURATION) {
    workingServers = [];
  }
  
  return [
    ...workingServers,
    ...PIPED_SERVERS.filter(s => !workingServers.includes(s))
  ];
};

// Fetch video info from Piped API
export const getPipedVideoInfo = async (videoId: string): Promise<PipedVideoInfo | null> => {
  const servers = getOrderedServers();
  const result = await parallelFetch<PipedVideoInfo>(`/streams/${videoId}`, servers);
  return result?.data || null;
};

// Search videos using Piped API
export const searchPiped = async (query: string): Promise<PipedSearchResult[]> => {
  const servers = getOrderedServers();
  const result = await parallelFetch<{ items: PipedSearchResult[] }>(
    `/search?q=${encodeURIComponent(query)}&filter=videos`,
    servers
  );
  return result?.data?.items || [];
};

// Get trending videos from Piped API
export const getTrendingPiped = async (region = 'JP'): Promise<PipedRelatedVideo[]> => {
  const servers = getOrderedServers();
  const result = await parallelFetch<PipedRelatedVideo[]>(
    `/trending?region=${region}`,
    servers
  );
  return result?.data || [];
};

// Convert Piped video info to Invidious-compatible format
export const pipedToInvidiousFormat = (piped: PipedVideoInfo, videoId: string) => {
  const formatStreams = piped.videoStreams
    .filter(s => !s.videoOnly && s.url)
    .map(s => ({
      url: s.url,
      itag: '',
      type: s.mimeType,
      quality: s.quality,
      container: s.format,
      resolution: s.quality,
    }));

  const adaptiveFormats = [
    ...piped.videoStreams.map(s => ({
      url: s.url,
      itag: '',
      type: s.mimeType,
      quality: s.quality,
      container: s.format,
      encoding: s.codec || '',
      qualityLabel: s.quality,
      resolution: s.height ? `${s.height}p` : s.quality,
      bitrate: String(s.bitrate || ''),
    })),
    ...piped.audioStreams.map(s => ({
      url: s.url,
      itag: '',
      type: s.mimeType,
      quality: s.quality,
      container: s.format,
      encoding: s.codec || '',
      qualityLabel: s.quality,
      bitrate: String(s.bitrate || ''),
    }))
  ];

  return {
    videoId,
    title: piped.title,
    author: piped.uploader,
    authorId: piped.uploaderUrl?.split('/').pop() || '',
    authorThumbnails: [{ url: piped.uploaderAvatar }],
    description: piped.description,
    viewCount: piped.views,
    likeCount: piped.likes,
    lengthSeconds: piped.duration,
    published: new Date(piped.uploadDate).getTime() / 1000,
    publishedText: piped.uploadDate,
    videoThumbnails: [
      { url: piped.thumbnailUrl, quality: 'high', width: 480, height: 360 },
      { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, quality: 'maxres', width: 1280, height: 720 },
    ],
    liveNow: piped.livestream,
    hlsUrl: piped.hls,
    dashUrl: piped.dash,
    formatStreams,
    adaptiveFormats,
    recommendedVideos: piped.relatedStreams?.map(r => ({
      videoId: r.url?.split('=').pop() || '',
      title: r.title || '',
      author: r.uploaderName || '',
      authorId: r.uploaderUrl?.split('/').pop() || '',
      description: '',
      viewCount: r.views || 0,
      lengthSeconds: r.duration || 0,
      published: r.uploaded || 0,
      publishedText: r.uploadedDate || '',
      videoThumbnails: [{ url: r.thumbnail || '', quality: 'medium', width: 320, height: 180 }],
    })) || [],
  };
};

// Get best stream URLs from Piped data
export const getBestStreamsFromPiped = (piped: PipedVideoInfo): {
  videoUrl?: string;
  audioUrl?: string;
  hlsUrl?: string;
  quality: string;
} => {
  // Prefer HLS for live streams
  if (piped.livestream && piped.hls) {
    return { hlsUrl: piped.hls, quality: 'Auto (HLS)' };
  }

  // Get best video stream (prefer 1080p, then 720p)
  const videoStreams = piped.videoStreams.filter(s => s.url);
  const sorted = [...videoStreams].sort((a, b) => (b.height || 0) - (a.height || 0));
  
  const best1080 = sorted.find(s => s.height === 1080 && !s.videoOnly);
  const best720 = sorted.find(s => s.height === 720 && !s.videoOnly);
  const bestAny = sorted.find(s => !s.videoOnly);
  
  const bestVideo = best1080 || best720 || bestAny;
  
  // Get best audio stream
  const audioStreams = piped.audioStreams.filter(s => s.url);
  const bestAudio = audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

  return {
    videoUrl: bestVideo?.url,
    audioUrl: bestAudio?.url,
    hlsUrl: piped.hls,
    quality: bestVideo?.quality || 'Unknown',
  };
};

// Check if Piped API is available
export const checkPipedAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(`${PIPED_SERVERS[0]}/`, 3000);
    return response.ok;
  } catch {
    return false;
  }
};
