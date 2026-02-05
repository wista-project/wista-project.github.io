// Unified video fetching with prioritized fallback
// Priority: Siawase API → Edu API → Invidious → Piped
// Search/Trending Priority: YouTube Data API → Invidious → Piped

import { streamCache } from './streamCache';
import { 
  fetchFromInvidious, 
  VideoDetails, 
  VideoResult, 
  TrendingVideo,
  getThumbnailUrl 
} from './invidious';
import { 
  getPipedVideoInfo, 
  searchPiped, 
  getTrendingPiped,
  pipedToInvidiousFormat,
  getBestStreamsFromPiped,
  PipedVideoInfo 
} from './piped';
import { getEduVideoInfo, eduToInvidiousFormat } from './eduApi';
import { getVideoInfoFromSiawase } from './siawaseApi';
import { searchVideosYouTube, getTrendingYouTube, YouTubeSearchResult } from './youtubeDataApi';

export interface UnifiedVideoInfo {
  videoId: string;
  title: string;
  author: string;
  authorId: string;
  description: string;
  viewCount: number;
  lengthSeconds: number;
  publishedText: string;
  thumbnail: string;
  authorThumbnail?: string;
  likeCount?: number;
  liveNow?: boolean;
  hlsUrl?: string;
  formatStreams?: any[];
  adaptiveFormats?: any[];
  recommendedVideos?: VideoResult[];
  source: 'siawase' | 'edu' | 'invidious' | 'piped' | 'cache';
}

// Track API success rates for adaptive priority
export interface ApiStats {
  successes: number;
  failures: number;
  lastSuccess: number;
}

export type ApiStatsData = Record<string, ApiStats>;

const apiStats: ApiStatsData = {
  youtube: { successes: 0, failures: 0, lastSuccess: 0 },
  siawase: { successes: 0, failures: 0, lastSuccess: 0 },
  edu: { successes: 0, failures: 0, lastSuccess: 0 },
  invidious: { successes: 0, failures: 0, lastSuccess: 0 },
  piped: { successes: 0, failures: 0, lastSuccess: 0 },
};

const updateStats = (api: string, success: boolean) => {
  if (success) {
    apiStats[api].successes++;
    apiStats[api].lastSuccess = Date.now();
  } else {
    apiStats[api].failures++;
  }
};

// Export stats for dashboard
export const getApiStats = (): ApiStatsData => {
  return JSON.parse(JSON.stringify(apiStats));
};

export const resetApiStats = () => {
  Object.keys(apiStats).forEach(api => {
    apiStats[api] = { successes: 0, failures: 0, lastSuccess: 0 };
  });
};

// Get API priority based on recent success rates
const getApiPriority = (): string[] => {
  const now = Date.now();
  const recentThreshold = 5 * 60 * 1000; // 5 minutes
  
  const scores = Object.entries(apiStats).map(([api, stats]) => {
    const total = stats.successes + stats.failures;
    const successRate = total > 0 ? stats.successes / total : 0.5;
    const recency = now - stats.lastSuccess < recentThreshold ? 1 : 0;
    return { api, score: successRate + recency * 0.5 };
  });
  
  scores.sort((a, b) => b.score - a.score);
  return scores.map(s => s.api);
};

// Fetch video info with prioritized fallback
export const getUnifiedVideoInfo = async (videoId: string): Promise<UnifiedVideoInfo | null> => {
  // Check cache first
  const cached = streamCache.getVideoInfo(videoId);
  if (cached) {
    return {
      ...cached,
      source: 'cache',
    };
  }

  const priority = getApiPriority();
  console.log(`[VideoFetch] Priority order: ${priority.join(' → ')}`);

  for (const api of priority) {
    try {
      let result: UnifiedVideoInfo | null = null;

      if (api === 'siawase') {
        const siawaseInfo = await getVideoInfoFromSiawase(videoId);
        if (siawaseInfo) {
          result = {
            videoId,
            title: siawaseInfo.title,
            author: siawaseInfo.author,
            authorId: siawaseInfo.authorId,
            description: siawaseInfo.description,
            viewCount: siawaseInfo.viewCount,
            lengthSeconds: siawaseInfo.lengthSeconds,
            publishedText: siawaseInfo.publishedText,
            thumbnail: siawaseInfo.thumbnail,
            authorThumbnail: siawaseInfo.authorThumbnail,
            likeCount: siawaseInfo.likeCount,
            source: 'siawase',
          };
        }
      } else if (api === 'edu') {
        const eduInfo = await getEduVideoInfo(videoId);
        if (eduInfo) {
          result = {
            videoId,
            title: eduInfo.title,
            author: eduInfo.author,
            authorId: eduInfo.authorId,
            description: eduInfo.description,
            viewCount: eduInfo.views,
            lengthSeconds: eduInfo.lengthSeconds,
            publishedText: eduInfo.published,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            authorThumbnail: eduInfo.authorThumbnail,
            likeCount: eduInfo.likes,
            recommendedVideos: eduInfo.related.map(r => ({
              videoId: r.videoId,
              title: r.title,
              author: r.author,
              authorId: r.authorId,
              description: '',
              viewCount: r.viewCount,
              lengthSeconds: r.lengthSeconds,
              published: 0,
              publishedText: '',
              videoThumbnails: [{ url: r.thumbnail, quality: 'medium', width: 320, height: 180 }],
            })),
            source: 'edu',
          };
        }
      } else if (api === 'invidious') {
        const invInfo = await fetchFromInvidious<VideoDetails>(`/videos/${videoId}`);
        if (invInfo) {
          result = {
            videoId: invInfo.videoId,
            title: invInfo.title,
            author: invInfo.author,
            authorId: invInfo.authorId,
            description: invInfo.description,
            viewCount: invInfo.viewCount,
            lengthSeconds: invInfo.lengthSeconds,
            publishedText: invInfo.publishedText,
            thumbnail: getThumbnailUrl(invInfo.videoThumbnails),
            liveNow: invInfo.liveNow,
            hlsUrl: invInfo.hlsUrl,
            formatStreams: invInfo.formatStreams,
            adaptiveFormats: invInfo.adaptiveFormats,
            recommendedVideos: invInfo.recommendedVideos,
            source: 'invidious',
          };
        }
      } else if (api === 'piped') {
        const pipedInfo = await getPipedVideoInfo(videoId);
        if (pipedInfo) {
          const converted = pipedToInvidiousFormat(pipedInfo, videoId);
          result = {
            videoId,
            title: pipedInfo.title,
            author: pipedInfo.uploader,
            authorId: pipedInfo.uploaderUrl?.split('/').pop() || '',
            description: pipedInfo.description,
            viewCount: pipedInfo.views,
            lengthSeconds: pipedInfo.duration,
            publishedText: pipedInfo.uploadDate,
            thumbnail: pipedInfo.thumbnailUrl,
            authorThumbnail: pipedInfo.uploaderAvatar,
            likeCount: pipedInfo.likes,
            liveNow: pipedInfo.livestream,
            hlsUrl: pipedInfo.hls,
            formatStreams: converted.formatStreams,
            adaptiveFormats: converted.adaptiveFormats,
            recommendedVideos: converted.recommendedVideos,
            source: 'piped',
          };
        }
      }

      if (result) {
        updateStats(api, true);
        console.log(`[VideoFetch] Success from ${api}`);
        
        // Cache the result
        streamCache.setVideoInfo(videoId, {
          videoId: result.videoId,
          title: result.title,
          author: result.author,
          authorId: result.authorId,
          description: result.description,
          viewCount: result.viewCount,
          lengthSeconds: result.lengthSeconds,
          publishedText: result.publishedText,
          thumbnail: result.thumbnail,
        });
        
        return result;
      }
    } catch (error) {
      updateStats(api, false);
      console.log(`[VideoFetch] ${api} failed:`, error);
    }
  }

  return null;
};

// Unified search with fallback - YouTube Data API first
export const unifiedSearch = async (query: string): Promise<VideoResult[]> => {
  console.log('[Search] Priority: YouTube Data API → Invidious → Piped');
  
  // Try YouTube Data API first
  try {
    const ytResults = await searchVideosYouTube(query);
    if (ytResults && ytResults.length > 0) {
      updateStats('youtube', true);
      console.log('[Search] Success from YouTube Data API');
      return ytResults.map(r => ({
        videoId: r.videoId,
        title: r.title,
        author: r.author,
        authorId: r.authorId,
        description: r.description,
        viewCount: r.viewCount,
        lengthSeconds: r.lengthSeconds,
        published: r.published,
        publishedText: r.publishedText,
        videoThumbnails: [{ url: r.thumbnail, quality: 'medium', width: 320, height: 180 }],
      })) as VideoResult[];
    }
  } catch (error) {
    updateStats('youtube', false);
    console.log('[Search] YouTube Data API failed:', error);
  }

  // Fallback to Invidious
  try {
    const results = await fetchFromInvidious<VideoResult[]>(`/search?q=${encodeURIComponent(query)}&type=video`);
    if (results && results.length > 0) {
      updateStats('invidious', true);
      console.log('[Search] Success from Invidious');
      return results;
    }
  } catch (error) {
    updateStats('invidious', false);
    console.log('[Search] Invidious failed:', error);
  }

  // Fallback to Piped
  try {
    const results = await searchPiped(query);
    if (results && results.length > 0) {
      updateStats('piped', true);
      console.log('[Search] Success from Piped');
      return results.map(r => ({
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
      })) as VideoResult[];
    }
  } catch (error) {
    updateStats('piped', false);
    console.log('[Search] Piped failed:', error);
  }
  
  return [];
};

// Unified trending with fallback - YouTube Data API first
export const unifiedTrending = async (region = 'JP'): Promise<TrendingVideo[]> => {
  console.log('[Trending] Priority: YouTube Data API → Invidious → Piped');
  
  // Try YouTube Data API first
  try {
    const ytResults = await getTrendingYouTube(region);
    if (ytResults && ytResults.length > 0) {
      updateStats('youtube', true);
      console.log('[Trending] Success from YouTube Data API');
      return ytResults.map(r => ({
        videoId: r.videoId,
        title: r.title,
        author: r.author,
        authorId: r.authorId,
        description: r.description,
        viewCount: r.viewCount,
        lengthSeconds: r.lengthSeconds,
        published: r.published,
        publishedText: r.publishedText,
        videoThumbnails: [{ url: r.thumbnail, quality: 'medium', width: 320, height: 180 }],
      })) as TrendingVideo[];
    }
  } catch (error) {
    updateStats('youtube', false);
    console.log('[Trending] YouTube Data API failed:', error);
  }

  // Fallback to Invidious
  try {
    const results = await fetchFromInvidious<TrendingVideo[]>(`/trending?region=${region}`);
    if (results && results.length > 0) {
      updateStats('invidious', true);
      console.log('[Trending] Success from Invidious');
      return results;
    }
  } catch (error) {
    updateStats('invidious', false);
    console.log('[Trending] Invidious failed:', error);
  }

  // Fallback to Piped
  try {
    const results = await getTrendingPiped(region);
    if (results && results.length > 0) {
      updateStats('piped', true);
      console.log('[Trending] Success from Piped');
      return results.map(r => ({
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
      })) as TrendingVideo[];
    }
  } catch (error) {
    updateStats('piped', false);
    console.log('[Trending] Piped failed:', error);
  }
  
  return [];
};


// Quick metadata fetch (for thumbnails, titles)
export const getQuickMetadata = async (videoId: string): Promise<{
  title: string;
  author: string;
  thumbnail: string;
} | null> => {
  // Check cache first
  const cached = streamCache.getVideoInfo(videoId);
  if (cached) {
    return {
      title: cached.title,
      author: cached.author,
      thumbnail: cached.thumbnail,
    };
  }

  // Try Siawase API first
  try {
    const siawaseInfo = await getVideoInfoFromSiawase(videoId);
    if (siawaseInfo) {
      return {
        title: siawaseInfo.title,
        author: siawaseInfo.author,
        thumbnail: siawaseInfo.thumbnail,
      };
    }
  } catch {
    // Continue to fallback
  }

  // Try noembed as fallback
  try {
    const response = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'Unknown',
        author: data.author_name || 'Unknown',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      };
    }
  } catch {
    // Ignore
  }

  return null;
};
