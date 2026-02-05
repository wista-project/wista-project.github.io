// Siawase API for video information
// Primary source: https://siawaseok.duckdns.org/api/video2/{videoId}
// Fallback: oembed

const SIAWASE_API_BASE = 'https://siawaseok.duckdns.org/api/video2';
const OEMBED_URLS = [
  'https://noembed.com/embed?url=https://www.youtube.com/watch?v=',
  'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=',
];

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

const TIMEOUT_MS = 3000;

export interface SiawaseVideoInfo {
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
}

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

// Try to fetch from Siawase API
export const fetchFromSiawase = async (videoId: string): Promise<SiawaseVideoInfo | null> => {
  console.log(`[Siawase API] Fetching video info for ${videoId}`);
  
  // Try direct first, then with proxies
  const urls = [
    `${SIAWASE_API_BASE}/${videoId}`,
    ...CORS_PROXIES.map(proxy => `${proxy}${encodeURIComponent(`${SIAWASE_API_BASE}/${videoId}`)}`),
  ];
  
  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, TIMEOUT_MS);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && (data.title || data.videoId)) {
          console.log(`[Siawase API] Success for ${videoId}`);
          return {
            videoId: data.videoId || videoId,
            title: data.title || 'Unknown',
            author: data.author || data.channelTitle || data.uploader || 'Unknown',
            authorId: data.authorId || data.channelId || '',
            description: data.description || '',
            viewCount: parseInt(data.viewCount || data.views || '0', 10),
            lengthSeconds: parseInt(data.lengthSeconds || data.duration || '0', 10),
            publishedText: data.publishedText || data.uploadDate || '',
            thumbnail: data.thumbnail || data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            authorThumbnail: data.authorThumbnail || data.uploaderAvatar,
            likeCount: data.likeCount || data.likes,
          };
        }
      }
    } catch (error) {
      console.log(`[Siawase API] Failed with URL: ${url.substring(0, 50)}...`);
    }
  }
  
  return null;
};

// Fetch from oembed as fallback
export const fetchFromOembed = async (videoId: string): Promise<SiawaseVideoInfo | null> => {
  console.log(`[Oembed] Fetching video info for ${videoId}`);
  
  for (const baseUrl of OEMBED_URLS) {
    // Try direct first
    try {
      const response = await fetchWithTimeout(`${baseUrl}${videoId}`, TIMEOUT_MS);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.title) {
          console.log(`[Oembed] Success for ${videoId}`);
          return {
            videoId,
            title: data.title,
            author: data.author_name || 'Unknown',
            authorId: data.author_url?.split('/').pop() || '',
            description: '',
            viewCount: 0,
            lengthSeconds: 0,
            publishedText: '',
            thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          };
        }
      }
    } catch (error) {
      // Try with proxy
      for (const proxy of CORS_PROXIES) {
        try {
          const proxyUrl = `${proxy}${encodeURIComponent(`${baseUrl}${videoId}`)}`;
          const response = await fetchWithTimeout(proxyUrl, TIMEOUT_MS);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data && data.title) {
              console.log(`[Oembed] Success via proxy for ${videoId}`);
              return {
                videoId,
                title: data.title,
                author: data.author_name || 'Unknown',
                authorId: data.author_url?.split('/').pop() || '',
                description: '',
                viewCount: 0,
                lengthSeconds: 0,
                publishedText: '',
                thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
              };
            }
          }
        } catch {
          // Continue
        }
      }
    }
  }
  
  return null;
};

// Combined fetch: try Siawase first, then oembed
export const getVideoInfoFromSiawase = async (videoId: string): Promise<SiawaseVideoInfo | null> => {
  // Try Siawase API first
  const siawaseResult = await fetchFromSiawase(videoId);
  if (siawaseResult) return siawaseResult;
  
  // Fallback to oembed
  const oembedResult = await fetchFromOembed(videoId);
  if (oembedResult) return oembedResult;
  
  return null;
};
