// YouTube Data API with multiple keys and CORS proxy
import { getStaticProxies, getDynamicProxies } from './corsProxy';
const YOUTUBE_API_KEYS = [
  'AIzaSyAAERSrXStyHsU889OZGfrCFe1E2Bit_xs',
  'AIzaSyDy3NduCSea7KbTdabDxRkWklCxK_dmJtY',
  'AIzaSyDF46IyZYwPlb6ZBxAD6-IuLxVNYsbTIwQ',
  'AIzaSyBroaNLJRfoYfQ5S1yW0InFypEBdH0eiK0',
  'AIzaSyBnGMPSO546hpwnIqhWyMXcRweY6PuzaAU',
  'AIzaSyBoaOjgPGL8W69BJq2VvQw_L1AtkYpqjXY',
  'AIzaSyCHf7bfggJPlwwz98LjvpayBSKYaqulTe4',
  'AIzaSyBSikgWMfwePdzobV76pCBrzBKRHYItw84',
  'AIzaSyAqL193sdtj8fQpeHyoXIg0DOWiI6ujdSU',
  'AIzaSyBD05MVL9MXxgFoeonGIhl_lkbb82XMydg',
  'AIzaSyD-mY93-KPr7OLzxyDCLSWz4_JTZSz8agg',
  'AIzaSyCw0QqwZ-GYPAZ87Fsu7HlELk2pWvPdud8',
  'AIzaSyCTmknsR-_37_vewUFVNkQGnyaNDrYgf1M',
  'AIzaSyBuJUlt9rO00c_X3-kdNe2103T6nIXNiqM',
  'AIzaSyBcNb4sGU0lYyGLgkI8z5ZXtJhLmuLuXCU',
  'AIzaSyBkab-vITkWMnuzINdvGpE_mj-RoNXvocc',
  'AIzaSyDO-m0_wded_rnirygrSq_laCD7brWcTL0',
  'AIzaSyBh8zm6ncRxzISVtgt4X7NuPrdXT95_QU8',
  'AIzaSyAasUQSKuaQaqwWdFQUAEJuwILLOCawDMY',
  'AIzaSyCOfN5Tv-qcFGsvn23O4M7KkmysDUXxAU8',
  'AIzaSyCqhfGgU-dSdNLShQNu00SVi6rMSFQMYIM',
  'AIzaSyD325R23qW7PqEuAEM0nwn7IL7I_KXX0tA',
  'AIzaSyD6gDl3Bl8WrCjxV0AN7coWHTPnh44wjzg',
  'AIzaSyBSfx_5J034ZUWw522GQVnRoKpq8mr0HuY',
  'AIzaSyBQ5YJg8avLmuyljyrMX5yjlhAk2_3wahs',
  'AIzaSyBYM3oTYVr1ReaCLi_0BuI8ME0MmWpuUl0',
  'AIzaSyCkXqYBVESKSf5QC6mssYf2BI4klUFRgbA',
  'AIzaSyDVI68zWP_N3800Rd5ObvduTeLYNXhi4Ws',
  'AIzaSyD94j08eEtwLXAThjLbgGY85CnC1eMnxdk',
  'AIzaSyD-oF5vYA5S6TCq4bn8rSs1r9VOABp6Anc',
  'AIzaSyAgK-wj-Qfp8LXlhBJifCJoUy0M8TadO0Y',
  'AIzaSyBh3W2ayzU1vd2GmgFjkYzv-oG3aCb-e6k',
  'AIzaSyA7yJv-p4cBu9q_RN64GRZxIZvfweO4Pgc',
  'AIzaSyAjigtvb_xdOW_kPkrCk9sEmvgfw_Ao1jU',
  'AIzaSyCbveLFNoS3lfj-xsPFHMiOa4nsfJO34hA',
  'AIzaSyBkBfE1QzE3ynSNdFttANwB9QxPmaHjR_I',
  'AIzaSyD_vyrjzI5V7JTnrztTFpCXJ4S3OeQzAgs',
  'AIzaSyCczWQ_sML0-1lC4jsVOewMsFQt3hBSb-E',
  'AIzaSyCb_HDFt0ebDLNg64B4q73cYysVunUHAx8',
  'AIzaSyDqkonJ1mWNo81wvcXtNw_gB3-4k5R-ULs',
  'AIzaSyDRqJinH5mDEB71bj8QtsdNVr3GCDVv36Q',
  'AIzaSyCZ9dEZn119YoAum3ISWqabv4whkwSGYb8',
  'AIzaSyBjfFYP0k_LgiBhDZVr1jxxcIK51NMBLdY',
  'AIzaSyDO6K5pFlOZ9LB56DXo8e6_Z_ii_33QMyk',
  'AIzaSyAgMq6gOWcBWBMM4MbmJA5SOnRl-EaT-oA',
  'AIzaSyDHIA8eWXDVkV9b-S19Yb9KxZWVr9c4HrU',
  'AIzaSyBz9PLNYmP_LcKrV5Z3JttbYpH-1vjt8XU',
  'AIzaSyCxglXaqL6AkmPjWkQwRkKQPne4pOsgJvg',
  'AIzaSyCm9Uxs01o9BcJt8POXAU6wej9DM9QUCHM',
  'AIzaSyDkAlhI9CHTfjyIE0eNWW5-xsu9Hwf5llk',
  'AIzaSyAlLr6rvBV6T4VaJG0zaMY3sI13ikbHTVw',
  'AIzaSyChZjsS2eM4_E-oxhqnHuleblR_0m1Pcag',
  'AIzaSyAxxhF47hgYZGAXoR-a1sY1YV-eoBaBNiw',
  'AIzaSyCZOBiuZbRMYQ1T_fX6G-ilaRQ5zsAlE1s',
  'AIzaSyDbq6qh1ehtKnNuJF0-YZ7KUC8xVDw9A5o',
  'AIzaSyCBfihhJr9Kb-e3yIWJ94wIRcFxjosa_98',
  'AIzaSyD3FNKRvQKx9fZwIxCmHgbLbk8V2I0R91I',
  'AIzaSyD9Nh_Qm1YI0FfLuFCsol2m5CVs4gkloCo',
  'AIzaSyD9-BLjgotrhRk5igeN6JtNj52wo85Ij_0',
  'AIzaSyBipPlvUcJyyriM7cfcsQ64L8z6RJin9p4',
  'AIzaSyBejY-2eqOFhWegJURL9Gn-VPqSHixrzVs',
  'AIzaSyAGQfKp7lmC5H_f0GU4F9e6LX8nD0rbhoI',
  'AIzaSyAi_m49_Q-xekEhsRhWXfZL7iBK3MfgA0o',
  'AIzaSyCk7RkERZuCGWklO8xN6sfGQHiMcQW8g7M',
  'AIzaSyDUUHTeL9FzDa43WNzSjjz_kOVLK3zNuTA',
  'AIzaSyDzdyRYwdYHXBp2Z6Sf-bUPpSHwkk625jU',
  'AIzaSyAE8rMoP_FPDPyJMps9dC5LOuIgC4NrDQk',
  'AIzaSyCz7f0X_giaGyC9u1EfGZPBuAC9nXiL5Mo',
  'AIzaSyBmzCw7-sX1vm-uL_u2Qy3LuVZuxye4Wys',
  'AIzaSyBWScla0K91jUL6qQErctN9N2b3j9ds7HI',
  'AIzaSyA17CdOQtQRC3DQe7rgIzFwTUjwAy_3CAc',
  'AIzaSyDdk_yY0tN4gKsm4uyMYrIlv1RwXIYXrnw',
  'AIzaSyBbIBpIzlKSQKqNkLbzMVHYrRR4mKTmKR4',
  'AIzaSyDCJsL6gRCu75g3aykpBz06VZYIckycaVE',
  'AIzaSyDWdLcZ0tv8Sns3JAcTZ3YvTzgzOhgzKj0',
  'AIzaSyAZwLva1HxzDbKFJuE9RVcxS5B4q_ol8yE',
  'AIzaSyBkiLAtaav2ecI7Vvgs-iBeeMs_v3XndD8',
  'AIzaSyCoz9NrmBu5mFRm_-qD4XoTFaqu7AGvGeU',
  'AIzaSyAz70cXGQouaQRm3cyirNMkwNxIYgDmHfY',
  'AIzaSyBEiZ4kJU4dE0jhdTQijbz6RHJWZM3gePk',
  'AIzaSyDG42dyXmbelllXl_D3IBtakJ0LofKcv_w',
  'AIzaSyC2JOX9DGAlIxp2Q3nVWU4uYRb5XSmA0vI',
  'AIzaSyCFl7A4m0soaCJ43HaEIO_9w2_xJZ_XHVY',
  'AIzaSyCqvGnAlX4_Ss7PInUEg3RWucbdjmnWP6U',
  'AIzaSyBQ-40ld7erVfx7s6iKBYl-GjDqJVYBwrc',
  'AIzaSyAlH_l4pN_2Hp640_awBIfLbgmaGOpmbLE',
  'AIzaSyAuChwfN7zd0Adf-aDZ1G1ZgDH6vkeQIBE',
  'AIzaSyBTqAsUhw4t4vHhvObPc7Zc1K2ROsjXJaI',
  'AIzaSyA-SwTMCb0vpQ4w9MWvnIKIk425i0djApI',
  'AIzaSyBDDqtUHw9RKeSDcn1BDRzutlYXYpKTVKk',
  'AIzaSyDdgsY60mxo98j99leqp1pb5aFYvSSvrSc',
  'AIzaSyDLW4ADM18tbAr15aqK21bsYn7aQKJNZRg',
  'AIzaSyAqQbBUIMzb-HB8skXH1Mdk_D8XoluavYY',
];

const TIMEOUT_MS = 2000;
const MAX_RETRIES = 3;

let currentKeyIndex = 0;

const getNextApiKey = (): string => {
  const key = YOUTUBE_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
  return key;
};

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

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  authorId: string;
  description: string;
  viewCount: number;
  lengthSeconds: number;
  published: number;
  publishedText: string;
  thumbnail: string;
}

export interface YouTubeVideoDetails {
  videoId: string;
  title: string;
  author: string;
  authorId: string;
  description: string;
  viewCount: number;
  lengthSeconds: number;
  publishedText: string;
  thumbnail: string;
}

const tryFetchWithProxy = async (apiUrl: string): Promise<any> => {
  const staticProxies = getStaticProxies();
  
  // Try static proxies first
  for (const proxy of staticProxies) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const url = `${proxy}${encodeURIComponent(apiUrl)}`;
        const response = await fetchWithTimeout(url, TIMEOUT_MS);
        
        if (response.ok) {
          const data = await response.json();
          if (!data.error) {
            return data;
          }
        }
      } catch (error) {
        console.log(`[YouTube API] Proxy ${proxy} attempt ${attempt + 1} failed`);
      }
    }
  }
  
  // Fallback to GitHub proxy list
  console.log('[YouTube API] Static proxies exhausted, trying GitHub proxy list...');
  const dynamicProxies = await getDynamicProxies();
  
  for (const proxy of dynamicProxies) {
    try {
      const url = `${proxy}${encodeURIComponent(apiUrl)}`;
      const response = await fetchWithTimeout(url, TIMEOUT_MS);
      
      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          console.log(`[YouTube API] Success with GitHub proxy: ${proxy}`);
          return data;
        }
      }
    } catch (error) {
      console.log(`[YouTube API] GitHub proxy ${proxy} failed`);
    }
  }
  
  return null;
};

export const searchVideosYouTube = async (query: string): Promise<YouTubeSearchResult[]> => {
  const results: YouTubeSearchResult[] = [];
  
  // Try multiple API keys
  for (let keyAttempt = 0; keyAttempt < 5; keyAttempt++) {
    const apiKey = getNextApiKey();
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&key=${apiKey}`;
    
    const data = await tryFetchWithProxy(apiUrl);
    
    if (data && data.items) {
      // Get video details for duration and view count
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`;
      const detailsData = await tryFetchWithProxy(detailsUrl);
      
      const detailsMap = new Map<string, any>();
      if (detailsData && detailsData.items) {
        detailsData.items.forEach((item: any) => {
          detailsMap.set(item.id, item);
        });
      }
      
      for (const item of data.items) {
        const details = detailsMap.get(item.id.videoId);
        const duration = details?.contentDetails?.duration || 'PT0S';
        const viewCount = parseInt(details?.statistics?.viewCount || '0', 10);
        
        results.push({
          videoId: item.id.videoId,
          title: item.snippet.title,
          author: item.snippet.channelTitle,
          authorId: item.snippet.channelId,
          description: item.snippet.description,
          viewCount,
          lengthSeconds: parseDuration(duration),
          published: new Date(item.snippet.publishedAt).getTime(),
          publishedText: formatPublishedDate(item.snippet.publishedAt),
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
        });
      }
      
      console.log(`[YouTube API] Search successful with key index ${currentKeyIndex}`);
      return results;
    }
  }
  
  throw new Error('YouTube API search failed after all attempts');
};

export const getTrendingYouTube = async (region = 'JP'): Promise<YouTubeSearchResult[]> => {
  const results: YouTubeSearchResult[] = [];
  
  // Try multiple API keys
  for (let keyAttempt = 0; keyAttempt < 5; keyAttempt++) {
    const apiKey = getNextApiKey();
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=${region}&maxResults=25&key=${apiKey}`;
    
    const data = await tryFetchWithProxy(apiUrl);
    
    if (data && data.items) {
      for (const item of data.items) {
        const duration = item.contentDetails?.duration || 'PT0S';
        const viewCount = parseInt(item.statistics?.viewCount || '0', 10);
        
        results.push({
          videoId: item.id,
          title: item.snippet.title,
          author: item.snippet.channelTitle,
          authorId: item.snippet.channelId,
          description: item.snippet.description,
          viewCount,
          lengthSeconds: parseDuration(duration),
          published: new Date(item.snippet.publishedAt).getTime(),
          publishedText: formatPublishedDate(item.snippet.publishedAt),
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
        });
      }
      
      console.log(`[YouTube API] Trending successful with key index ${currentKeyIndex}`);
      return results;
    }
  }
  
  throw new Error('YouTube API trending failed after all attempts');
};

export const getVideoDetailsYouTube = async (videoId: string): Promise<YouTubeVideoDetails | null> => {
  for (let keyAttempt = 0; keyAttempt < 5; keyAttempt++) {
    const apiKey = getNextApiKey();
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
    
    const data = await tryFetchWithProxy(apiUrl);
    
    if (data && data.items && data.items.length > 0) {
      const item = data.items[0];
      const duration = item.contentDetails?.duration || 'PT0S';
      
      console.log(`[YouTube API] Video details successful for ${videoId}`);
      return {
        videoId: item.id,
        title: item.snippet.title,
        author: item.snippet.channelTitle,
        authorId: item.snippet.channelId,
        description: item.snippet.description,
        viewCount: parseInt(item.statistics?.viewCount || '0', 10),
        lengthSeconds: parseDuration(duration),
        publishedText: formatPublishedDate(item.snippet.publishedAt),
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      };
    }
  }
  
  return null;
};

// Parse ISO 8601 duration (PT1H2M3S) to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
};

const formatPublishedDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return 'Today';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};
