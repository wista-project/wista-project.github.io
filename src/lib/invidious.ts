import { streamCache } from './streamCache';
import { getStaticProxies, getDynamicProxies } from './corsProxy';
 import { getThumbnailSource } from './storage';

// Updated Invidious instances list
const INVIDIOUS_INSTANCES = [
  'https://app.materialio.us',
  'https://inv.kamuridesu.com',
  'https://inv.nadeko.net',
  'https://inv.vern.cc',
  'https://inv1.nadeko.net',
  'https://inv2.nadeko.net',
  'https://inv3.nadeko.net',
  'https://inv4.nadeko.net',
  'https://inv5.nadeko.net',
  'https://inv6.nadeko.net',
  'https://inv7.nadeko.net',
  'https://inv8.nadeko.net',
  'https://inv9.nadeko.net',
  'https://invidious.f5.si',
  'https://invidious.lunivers.trade',
  'https://invidious.nerdvpn.de',
  'https://invidious.nietzospannend.nl',
  'https://invidious.projectsegfau.lt',
  'https://invidious.protokolla.fi',
  'https://invidious.tiekoetter.com',
  'https://lekker.gay',
  'https://nyc1.iv.ggtyler.dev',
  'https://rust.oskamp.nl',
  'https://y.com.sb',
  'https://yewtu.be',
  'https://yt.thechangebook.org',
  'https://yt.vern.cc',
];

// Timeout 2 seconds, max 3 retries
const TIMEOUT_MS = 2000;
const MAX_RETRIES = 3;
const BATCH_SIZE = 6;

// LocalStorage keys for working instances
const STORAGE_KEY_WORKING_INSTANCES = 'invidious_working_instances';
const STORAGE_KEY_INSTANCE_UPDATE = 'invidious_instance_update';

export interface VideoResult {
  videoId: string;
  title: string;
  author: string;
  authorId: string;
  description: string;
  viewCount: number;
  lengthSeconds: number;
  published: number;
  publishedText: string;
  videoThumbnails: { url: string; width: number; height: number; quality: string }[];
  liveNow?: boolean;
}

export interface TrendingVideo extends VideoResult {}

export interface VideoDetails extends VideoResult {
  adaptiveFormats: {
    url: string;
    itag: string;
    type: string;
    quality: string;
    container: string;
    encoding: string;
    qualityLabel?: string;
    resolution?: string;
    bitrate?: string;
  }[];
  formatStreams: {
    url: string;
    itag: string;
    type: string;
    quality: string;
    container: string;
    resolution?: string;
  }[];
  hlsUrl?: string;
  recommendedVideos?: VideoResult[];
}

export interface Comment {
  author: string;
  authorThumbnails: { url: string }[];
  content: string;
  published: number;
  publishedText: string;
  likeCount: number;
  replies?: { replyCount: number };
}

export interface CommentsResponse {
  comments: Comment[];
  continuation?: string;
}

// Working instance tracking with localStorage persistence
const loadWorkingInstances = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_WORKING_INSTANCES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return [];
};

const saveWorkingInstances = (instances: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_WORKING_INSTANCES, JSON.stringify(instances));
    localStorage.setItem(STORAGE_KEY_INSTANCE_UPDATE, Date.now().toString());
  } catch {
    // Ignore
  }
};

const getLastInstanceUpdate = (): number => {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY_INSTANCE_UPDATE) || '0', 10);
  } catch {
    return 0;
  }
};

let workingInstances: string[] = loadWorkingInstances();
let lastInstanceUpdate = getLastInstanceUpdate();
const INSTANCE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (longer for localStorage)

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

const validateResponse = (text: string): boolean => {
  const invalidPatterns = [
    'shutdown', 'blocked', 'Forbidden', 'error',
    '<!DOCTYPE', '<html', 'Rate limit', 'not found',
    'temporarily unavailable', 'maintenance'
  ];
  return !invalidPatterns.some(pattern => text.toLowerCase().includes(pattern.toLowerCase()));
};

// Fast parallel fetch with early termination
const fastParallelFetch = async <T>(
  endpoint: string,
  instances: string[],
  proxy: string,
  timeout: number
): Promise<T | null> => {
  const promises: Promise<{ data: T; instance: string } | null>[] = [];
  
  for (const instance of instances) {
    const apiUrl = `${instance}/api/v1${endpoint}`;
    const url = proxy ? `${proxy}${encodeURIComponent(apiUrl)}` : apiUrl;
    
    promises.push(
      fetchWithTimeout(url, timeout)
        .then(async response => {
          if (!response.ok) return null;
          const text = await response.text();
          if (!validateResponse(text)) return null;
          
          try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object' && !data.error) {
              // Track successful instance and save to localStorage
              if (!workingInstances.includes(instance)) {
                workingInstances = [instance, ...workingInstances].slice(0, 8);
                lastInstanceUpdate = Date.now();
                saveWorkingInstances(workingInstances);
              } else {
                // Move to front if already in list
                workingInstances = [instance, ...workingInstances.filter(i => i !== instance)].slice(0, 8);
                saveWorkingInstances(workingInstances);
              }
              return { data, instance };
            }
          } catch {
            return null;
          }
          return null;
        })
        .catch(() => null)
    );
  }

  // Race for first successful result
  return new Promise((resolve) => {
    let settled = false;
    let completedCount = 0;
    
    promises.forEach(promise => {
      promise.then(result => {
        completedCount++;
        if (!settled && result) {
          settled = true;
          console.log(`[Invidious] Success from ${result.instance}`);
          resolve(result.data);
        } else if (completedCount === promises.length && !settled) {
          resolve(null);
        }
      });
    });

    // Timeout fallback
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeout + 500);
  });
};

export const fetchFromInvidious = async <T>(endpoint: string): Promise<T> => {
  let lastError: Error | null = null;

  // Reload working instances from localStorage and check expiry
  const now = Date.now();
  const storedUpdate = getLastInstanceUpdate();
  
  if (now - storedUpdate > INSTANCE_CACHE_DURATION) {
    workingInstances = [];
    saveWorkingInstances([]);
  } else if (storedUpdate > lastInstanceUpdate) {
    // Reload from storage if updated elsewhere
    workingInstances = loadWorkingInstances();
    lastInstanceUpdate = storedUpdate;
  }

  const orderedInstances = [
    ...workingInstances,
    ...INVIDIOUS_INSTANCES.filter(i => !workingInstances.includes(i))
  ];

  const staticProxies = getStaticProxies();

  // Phase 1: Fast parallel with working instances (via first proxy)
  if (workingInstances.length > 0 && staticProxies.length > 0) {
    const result = await fastParallelFetch<T>(endpoint, workingInstances, staticProxies[0], TIMEOUT_MS);
    if (result) return result;
    console.log('[Invidious] Fast path failed, trying full search...');
  }

  // Phase 2: Try all instances with static proxies (with retries)
  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    for (const proxy of staticProxies) {
      for (let batch = 0; batch < Math.ceil(orderedInstances.length / BATCH_SIZE); batch++) {
        const batchInstances = orderedInstances.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
        
        const result = await fastParallelFetch<T>(endpoint, batchInstances, proxy, TIMEOUT_MS);
        if (result) return result;
        
        console.log(`[Invidious] Retry ${retry + 1}, Batch ${batch + 1} with proxy "${proxy}" failed`);
      }
    }
  }

  // Phase 3: Fallback to GitHub proxy list
  console.log('[Invidious] Static proxies exhausted, trying GitHub proxy list...');
  const dynamicProxies = await getDynamicProxies();
  
  for (const proxy of dynamicProxies) {
    for (let batch = 0; batch < Math.ceil(orderedInstances.length / BATCH_SIZE); batch++) {
      const batchInstances = orderedInstances.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
      
      const result = await fastParallelFetch<T>(endpoint, batchInstances, proxy, TIMEOUT_MS);
      if (result) {
        console.log(`[Invidious] Success with GitHub proxy: ${proxy}`);
        return result;
      }
    }
  }

  throw lastError || new Error('All Invidious instances failed');
};

// Cached search with deduplication
export const searchVideos = async (query: string): Promise<VideoResult[]> => {
  return fetchFromInvidious<VideoResult[]>(`/search?q=${encodeURIComponent(query)}&type=video`);
};

// Cached trending with deduplication
export const getTrending = async (region = 'JP'): Promise<TrendingVideo[]> => {
  return fetchFromInvidious<TrendingVideo[]>(`/trending?region=${region}`);
};

// Cached video details with deduplication
export const getVideoDetails = async (videoId: string): Promise<VideoDetails> => {
  // Check cache first
  const cached = streamCache.getVideoInfo(videoId);
  if (cached) {
    // Return cached data in VideoDetails format
    return fetchFromInvidious<VideoDetails>(`/videos/${videoId}`);
  }

  const result = await fetchFromInvidious<VideoDetails>(`/videos/${videoId}`);
  
  // Cache the video info
  if (result) {
    const thumbnail = getThumbnailUrl(result.videoThumbnails);
    streamCache.setVideoInfo(videoId, {
      videoId: result.videoId,
      title: result.title,
      author: result.author,
      authorId: result.authorId,
      description: result.description,
      viewCount: result.viewCount,
      lengthSeconds: result.lengthSeconds,
      publishedText: result.publishedText,
      thumbnail,
    });

    // Prefetch recommended videos
    if (result.recommendedVideos && result.recommendedVideos.length > 0) {
      const recommendedIds = result.recommendedVideos.slice(0, 5).map(v => v.videoId);
      streamCache.prefetchVideoInfo(recommendedIds, async (id) => {
        try {
          const details = await fetchFromInvidious<VideoDetails>(`/videos/${id}`);
          return {
            videoId: details.videoId,
            title: details.title,
            author: details.author,
            authorId: details.authorId,
            description: details.description,
            viewCount: details.viewCount,
            lengthSeconds: details.lengthSeconds,
            publishedText: details.publishedText,
            thumbnail: getThumbnailUrl(details.videoThumbnails),
          };
        } catch {
          return null;
        }
      });
    }
  }

  return result;
};

export const getVideoComments = async (videoId: string): Promise<CommentsResponse> => {
  return fetchFromInvidious<CommentsResponse>(`/comments/${videoId}`);
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export const getThumbnailUrl = (thumbnails: VideoResult['videoThumbnails'], videoId?: string): string => {
   // If videoId is provided, use direct YouTube thumbnail URL
   if (videoId) {
     const source = getThumbnailSource();
     return `https://${source}/vi/${videoId}/mqdefault.jpg`;
   }
   
   // Fallback to thumbnails array
   const preferred = thumbnails.find(t => t.quality === 'medium' || t.quality === 'high');
   const url = preferred?.url || thumbnails[0]?.url || '';
   
   // Convert Invidious thumbnail URLs to direct YouTube URLs
   if (url) {
     const source = getThumbnailSource();
     // Extract videoId from Invidious URL if possible
     const match = url.match(/\/vi\/([a-zA-Z0-9_-]+)\//);
     if (match) {
       return `https://${source}/vi/${match[1]}/mqdefault.jpg`;
     }
   }
   
   return url;
};
 
 // Generate thumbnail URL directly from videoId
 export const getDirectThumbnailUrl = (videoId: string, quality: 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault' = 'mqdefault'): string => {
   const source = getThumbnailSource();
   return `https://${source}/vi/${videoId}/${quality}.jpg`;
 };

// Quick video info fetch (for recommendations, etc.)
export const getQuickVideoInfo = async (videoId: string): Promise<{
  title: string;
  author: string;
  thumbnail: string;
  lengthSeconds: number;
} | null> => {
  // Check cache first
  const cached = streamCache.getVideoInfo(videoId);
  if (cached) {
    return {
      title: cached.title,
      author: cached.author,
      thumbnail: cached.thumbnail,
      lengthSeconds: cached.lengthSeconds,
    };
  }

  // Try noembed for quick metadata
  try {
    const response = await fetchWithTimeout(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
      3000
    );
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'Unknown',
        author: data.author_name || 'Unknown',
      thumbnail: getDirectThumbnailUrl(videoId),
        lengthSeconds: 0,
      };
    }
  } catch {
    // Ignore
  }

  return null;
};
