// ytdlp-based stream fetching with caching and parallel optimization
// Enhanced with MIN-Tube2 APIs and expanded fallback chain
import { streamCache } from './streamCache';
import { getApiPriority, ApiSource } from './storage';
// Choco-tube custom APIs (highest priority - fast and reliable)
const CHOCO_VIDEO_API = 'https://siawaseok.duckdns.org/api/video2/';
const CHOCO_STREAM_API = 'https://ytdl-0et1.onrender.com/stream/';
const CHOCO_M3U8_API = 'https://ytdl-0et1.onrender.com/m3u8/';

// MIN-Tube2 API servers (from https://github.com/mino-hobby-pro/MIN-Tube2)
const MIN_TUBE_APIS = [
  'https://min-tube2-api.vercel.app',
  'https://min-tube-api-3.vercel.app',
  'https://min-tube-api4.vercel.app',
  'https://server-minp.vercel.app',
  'https://min-tube-api5.vercel.app',
];

// Dynamic API list URL for auto-updating
const MIN_TUBE_API_LIST_URL = 'https://raw.githubusercontent.com/Minotaur-ZAOU/test/refs/heads/main/min-tube-api.json';

const COBALT_APIS = [
  'https://api.cobalt.tools',
  'https://co.wuk.sh',
];

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

// Expanded Invidious instances for better reliability
const INVIDIOUS_INSTANCES = [
  'https://inv.vern.cc',
  'https://invidious.fdn.fr',
  'https://iv.ggtyler.dev',
  'https://invidious.lunar.icu',
  'https://yt.artemislena.eu',
  'https://invidious.privacydev.net',
  'https://invidious.drgns.space',
  'https://inv.n8pjl.ca',
  'https://vid.puffyan.us',
  'https://yewtu.be',
  'https://invidious.nerdvpn.de',
  'https://inv.riverside.rocks',
  'https://invidious.slipfox.xyz',
  'https://invidious.esmailelbob.xyz',
];

// Piped API servers for additional fallback
const PIPED_SERVERS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.r4fo.com',
  'https://api.piped.yt',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.syncpundit.io',
];

export interface YtdlpStream {
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

export interface YtdlpResult {
  success: boolean;
  streams: YtdlpStream[];
  hlsUrl?: string;
  dashUrl?: string;
  isLive?: boolean;
  title?: string;
  author?: string;
  error?: string;
}

interface EdgeFunctionResponse {
  video_id: string;
  title: string;
  thumbnail: string;
  duration: number;
  stream_url: string;
  hls_url?: string;
  is_live?: boolean;
  author?: string;
  formats?: Array<{
    url: string;
    quality: string;
    type: string;
    container: string;
  }>;
  error?: string;
}

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Choco-tube Video API - highest priority
const fetchFromChocoVideo = async (videoId: string): Promise<YtdlpResult> => {
  try {
    console.log('[ytdlp] Trying Choco-tube Video API...');
    
    const response = await fetchWithTimeout(
      `${CHOCO_VIDEO_API}?id=${videoId}`,
      { method: 'GET', headers: { 'Accept': 'application/json' } },
      5000
    );
    
    if (!response.ok) {
      return { success: false, streams: [], error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      return { success: false, streams: [], error: data?.error || 'Invalid response' };
    }
    
    const streams: YtdlpStream[] = [];
    
    // Extract formats
    if (data.formats && Array.isArray(data.formats)) {
      for (const fmt of data.formats) {
        if (fmt.url) {
          streams.push({
            url: fmt.url,
            quality: fmt.quality || fmt.qualityLabel || 'Unknown',
            format: 'video',
            container: fmt.container || 'mp4',
            hasAudio: true,
            hasVideo: true,
          });
        }
      }
    }
    
    // Main stream URL
    if (data.url || data.stream_url) {
      const mainUrl = data.url || data.stream_url;
      const isHLS = mainUrl.includes('.m3u8');
      const isDASH = mainUrl.includes('.mpd');
      
      streams.unshift({
        url: mainUrl,
        quality: 'Best',
        format: isHLS ? 'hls' : isDASH ? 'dash' : 'video',
        container: isHLS ? 'm3u8' : isDASH ? 'mpd' : 'mp4',
        hasAudio: true,
        hasVideo: true,
        isHLS,
        isDASH,
        isLive: data.isLive || data.liveNow,
      });
    }
    
    // HLS URL
    if (data.hlsUrl || data.hls_url) {
      const hlsUrl = data.hlsUrl || data.hls_url;
      if (!streams.some(s => s.url === hlsUrl)) {
        streams.push({
          url: hlsUrl,
          quality: 'Auto (HLS)',
          format: 'hls',
          container: 'm3u8',
          hasAudio: true,
          hasVideo: true,
          isHLS: true,
          isLive: data.isLive || data.liveNow,
        });
      }
    }
    
    if (streams.length === 0) {
      return { success: false, streams: [], error: 'No streams found' };
    }
    
    console.log('[ytdlp] Choco Video API success:', streams.length, 'streams');
    
    return {
      success: true,
      streams,
      hlsUrl: data.hlsUrl || data.hls_url,
      isLive: data.isLive || data.liveNow,
      title: data.title,
      author: data.author || data.uploader,
    };
  } catch (err) {
    console.warn('[ytdlp] Choco Video API failed:', err);
    return { success: false, streams: [], error: String(err) };
  }
};

// Choco-tube Direct Stream - use URL directly
const fetchFromChocoStream = async (videoId: string): Promise<YtdlpResult> => {
  try {
    console.log('[ytdlp] Trying Choco-tube Direct Stream...');
    
    const streamUrl = `${CHOCO_STREAM_API}?id=${videoId}`;
    const m3u8Url = `${CHOCO_M3U8_API}?id=${videoId}`;
    
    // Verify availability with HEAD request
    const response = await fetchWithTimeout(streamUrl, { method: 'HEAD' }, 4000);
    
    if (!response.ok) {
      return { success: false, streams: [], error: `HTTP ${response.status}` };
    }
    
    const streams: YtdlpStream[] = [
      {
        url: streamUrl,
        quality: 'Best',
        format: 'video',
        container: 'mp4',
        hasAudio: true,
        hasVideo: true,
      },
      {
        url: m3u8Url,
        quality: 'Auto (HLS)',
        format: 'hls',
        container: 'm3u8',
        hasAudio: true,
        hasVideo: true,
        isHLS: true,
      },
    ];
    
    console.log('[ytdlp] Choco Direct Stream success');
    
    return {
      success: true,
      streams,
      hlsUrl: m3u8Url,
    };
  } catch (err) {
    console.warn('[ytdlp] Choco Direct Stream failed:', err);
    return { success: false, streams: [], error: String(err) };
  }
};

// MIN-Tube2 API - parallel fetch from multiple servers
const fetchFromMinTubeParallel = async (videoId: string): Promise<YtdlpResult> => {
  console.log('[ytdlp] Trying MIN-Tube APIs in parallel...');
  
  // Optionally update API list from GitHub
  let apiServers = [...MIN_TUBE_APIS];
  try {
    const listResponse = await fetchWithTimeout(MIN_TUBE_API_LIST_URL, {}, 2000);
    if (listResponse.ok) {
      const updatedList = await listResponse.json();
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        apiServers = updatedList;
        console.log('[ytdlp] Updated MIN-Tube API list:', apiServers.length, 'servers');
      }
    }
  } catch {
    // Use default list
  }
  
  const promises = apiServers.map(async (apiBase): Promise<YtdlpResult | null> => {
    try {
      const response = await fetchWithTimeout(
        `${apiBase}/api/video/${videoId}`,
        { headers: { 'Accept': 'application/json' } },
        6000
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (!data || !data.stream_url) return null;
      
      const streams: YtdlpStream[] = [];
      const streamUrl = data.stream_url;
      const isHLS = streamUrl.includes('.m3u8');
      const isDASH = streamUrl.includes('.mpd');
      
      streams.push({
        url: streamUrl,
        quality: 'Best',
        format: isHLS ? 'hls' : isDASH ? 'dash' : 'video',
        container: isHLS ? 'm3u8' : isDASH ? 'mpd' : 'mp4',
        hasAudio: true,
        hasVideo: true,
        isHLS,
        isDASH,
        isLive: data.is_live || data.isLive,
      });
      
      // Add HLS if available
      if (data.hls_url && data.hls_url !== streamUrl) {
        streams.push({
          url: data.hls_url,
          quality: 'Auto (HLS)',
          format: 'hls',
          container: 'm3u8',
          hasAudio: true,
          hasVideo: true,
          isHLS: true,
          isLive: data.is_live || data.isLive,
        });
      }
      
      // Add formats if available
      if (data.formats && Array.isArray(data.formats)) {
        for (const fmt of data.formats) {
          if (fmt.url && !streams.some(s => s.url === fmt.url)) {
            streams.push({
              url: fmt.url,
              quality: fmt.quality || fmt.qualityLabel || 'Unknown',
              format: 'video',
              container: fmt.container || 'mp4',
              hasAudio: true,
              hasVideo: true,
            });
          }
        }
      }
      
      console.log(`[ytdlp] MIN-Tube success from ${apiBase}`);
      
      return {
        success: true,
        streams,
        hlsUrl: data.hls_url,
        isLive: data.is_live || data.isLive,
        title: data.videoTitle || data.title,
        author: data.author,
      };
    } catch {
      return null;
    }
  });
  
  // Race for first success
  return new Promise((resolve) => {
    let settled = false;
    let completed = 0;
    
    promises.forEach(promise => {
      promise.then(result => {
        completed++;
        if (!settled && result && result.success) {
          settled = true;
          resolve(result);
        } else if (completed === promises.length && !settled) {
          resolve({ success: false, streams: [], error: 'All MIN-Tube APIs failed' });
        }
      });
    });

    // Timeout
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ success: false, streams: [], error: 'MIN-Tube timeout' });
      }
    }, 8000);
  });
};

// Piped API parallel fetch
const fetchFromPipedParallel = async (videoId: string): Promise<YtdlpResult> => {
  console.log('[ytdlp] Trying Piped APIs in parallel...');
  
  const promises = PIPED_SERVERS.map(async (server): Promise<YtdlpResult | null> => {
    try {
      const response = await fetchWithTimeout(
        `${server}/streams/${videoId}`,
        { headers: { 'Accept': 'application/json' } },
        5000
      );
      
      if (!response.ok) return null;
      
      const text = await response.text();
      if (text.includes('error') || text.includes('<!DOCTYPE')) return null;
      
      const data = JSON.parse(text);
      if (!data.title) return null;
      
      const streams: YtdlpStream[] = [];
      
      // Add HLS stream
      if (data.hls) {
        streams.push({
          url: data.hls,
          quality: 'Auto (HLS)',
          format: 'hls',
          container: 'm3u8',
          hasAudio: true,
          hasVideo: true,
          isHLS: true,
          isLive: data.livestream,
        });
      }
      
      // Get video streams with audio
      const videoStreams = (data.videoStreams || []).filter((s: any) => s.url && !s.videoOnly);
      
      // Sort by quality
      const sorted = [...videoStreams].sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
      
      for (const s of sorted.slice(0, 5)) {
        streams.push({
          url: s.url,
          quality: s.quality || `${s.height}p`,
          format: 'video',
          container: s.format || 'webm',
          hasAudio: !s.videoOnly,
          hasVideo: true,
        });
      }
      
      if (streams.length === 0) return null;
      
      console.log(`[ytdlp] Piped success from ${server}`);
      
      return {
        success: true,
        streams,
        hlsUrl: data.hls,
        isLive: data.livestream,
        title: data.title,
        author: data.uploader,
      };
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
        if (!settled && result && result.success) {
          settled = true;
          resolve(result);
        } else if (completed === promises.length && !settled) {
          resolve({ success: false, streams: [], error: 'All Piped APIs failed' });
        }
      });
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ success: false, streams: [], error: 'Piped timeout' });
      }
    }, 7000);
  });
};

// Edge Function API - primary method
const fetchFromEdgeFunction = async (videoId: string): Promise<YtdlpResult> => {
  try {
    console.log('[ytdlp] Trying Edge Function API...');
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[ytdlp] Missing Supabase configuration');
      return { success: false, streams: [], error: 'Missing Supabase configuration' };
    }

    const response = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/get-youtube-stream?video_id=${videoId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      },
      8000
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[ytdlp] Edge Function HTTP error:', response.status, errorText);
      return { success: false, streams: [], error: `HTTP ${response.status}` };
    }

    const data: EdgeFunctionResponse = await response.json();

    if (data.error) {
      console.warn('[ytdlp] Edge Function returned error:', data.error);
      return { success: false, streams: [], error: data.error };
    }

    const streams: YtdlpStream[] = [];

    if (data.stream_url) {
      const isHLS = data.stream_url.includes('.m3u8') || data.stream_url.includes('manifest');
      const isDASH = data.stream_url.includes('.mpd');
      
      streams.push({
        url: data.stream_url,
        quality: 'Best',
        format: isHLS ? 'hls' : isDASH ? 'dash' : 'video',
        container: isHLS ? 'm3u8' : isDASH ? 'mpd' : 'mp4',
        hasAudio: true,
        hasVideo: true,
        isHLS,
        isDASH,
        isLive: data.is_live,
      });
    }

    if (data.hls_url && data.hls_url !== data.stream_url) {
      streams.push({
        url: data.hls_url,
        quality: 'Auto (HLS)',
        format: 'hls',
        container: 'm3u8',
        hasAudio: true,
        hasVideo: true,
        isHLS: true,
        isLive: data.is_live,
      });
    }

    if (data.formats && data.formats.length > 0) {
      for (const fmt of data.formats) {
        if (fmt.url && !streams.some(s => s.url === fmt.url)) {
          streams.push({
            url: fmt.url,
            quality: fmt.quality || 'Unknown',
            format: 'video',
            container: fmt.container || 'mp4',
            hasAudio: true,
            hasVideo: true,
          });
        }
      }
    }

    if (streams.length === 0) {
      return { success: false, streams: [], error: 'No streams found' };
    }

    console.log('[ytdlp] Edge Function success:', streams.length, 'streams');

    return {
      success: true,
      streams,
      hlsUrl: data.hls_url,
      isLive: data.is_live,
      title: data.title,
      author: data.author,
    };
  } catch (err) {
    console.warn('[ytdlp] Edge Function fetch failed:', err);
    return { success: false, streams: [], error: String(err) };
  }
};

// Parallel Invidious fetch for HLS streams
const fetchHLSFromInvidiousParallel = async (videoId: string): Promise<{
  hlsUrl?: string;
  isLive?: boolean;
  streams?: YtdlpStream[];
  title?: string;
  author?: string;
} | null> => {
  const promises = INVIDIOUS_INSTANCES.map(async (instance) => {
    for (const proxy of ['', ...CORS_PROXIES]) {
      try {
        const apiUrl = `${instance}/api/v1/videos/${videoId}`;
        const url = proxy ? `${proxy}${encodeURIComponent(apiUrl)}` : apiUrl;
        
        const response = await fetchWithTimeout(url, { method: 'GET' }, 5000);
        
        if (!response.ok) continue;
        
        const text = await response.text();
        if (text.includes('shutdown') || text.includes('blocked') || text.includes('<!DOCTYPE')) {
          continue;
        }
        
        const data = JSON.parse(text);
        if (!data.title) continue;
        
        const streams: YtdlpStream[] = [];
        
        // Add HLS stream
        if (data.hlsUrl) {
          streams.push({
            url: data.hlsUrl,
            quality: 'Auto (HLS)',
            format: 'hls',
            container: 'm3u8',
            hasAudio: true,
            hasVideo: true,
            isHLS: true,
            isLive: data.liveNow,
          });
        }
        
        // Add format streams
        if (data.formatStreams) {
          for (const fmt of data.formatStreams) {
            if (fmt.url) {
              streams.push({
                url: fmt.url,
                quality: fmt.qualityLabel || fmt.quality || 'Unknown',
                format: 'video',
                container: fmt.container || 'mp4',
                hasAudio: true,
                hasVideo: true,
              });
            }
          }
        }
        
        if (streams.length > 0) {
          return {
            hlsUrl: data.hlsUrl,
            isLive: data.liveNow,
            streams,
            title: data.title,
            author: data.author,
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  });

  // Race for first success
  return new Promise((resolve) => {
    let settled = false;
    let completed = 0;
    
    promises.forEach(promise => {
      promise.then(result => {
        completed++;
        if (!settled && result) {
          settled = true;
          resolve(result);
        } else if (completed === promises.length && !settled) {
          resolve(null);
        }
      });
    });

    // Timeout
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 8000);
  });
};

// Cobalt API fallback
const fetchFromCobalt = async (videoId: string): Promise<YtdlpResult> => {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  for (const apiBase of COBALT_APIS) {
    for (const proxy of CORS_PROXIES) {
      const modes = ['max', '1080', '720'];
      
      for (const mode of modes) {
        try {
          const response = await fetchWithTimeout(
            `${proxy}${encodeURIComponent(apiBase + '/api/json')}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                url: videoUrl,
                vQuality: mode,
                filenamePattern: 'basic',
                isAudioOnly: false,
              }),
            },
            6000
          );

          if (response.ok) {
            const data = await response.json();
            if (data.url) {
              const isHLS = data.url.includes('.m3u8');
              const isDASH = data.url.includes('.mpd');
              
              return {
                success: true,
                streams: [{
                  url: data.url,
                  quality: mode === 'max' ? 'Best' : mode + 'p',
                  format: isHLS ? 'hls' : isDASH ? 'dash' : 'video',
                  container: isHLS ? 'm3u8' : isDASH ? 'mpd' : 'mp4',
                  hasAudio: true,
                  hasVideo: true,
                  isHLS,
                  isDASH,
                  isLive: data.isLive || false,
                }],
                hlsUrl: isHLS ? data.url : undefined,
                dashUrl: isDASH ? data.url : undefined,
                isLive: data.isLive || false,
                title: data.filename,
              };
            }
          }
        } catch {
          continue;
        }
      }
    }
  }
  
  return { success: false, streams: [], error: 'All Cobalt APIs failed' };
};

// API fetch function mapping
const API_FETCH_FUNCTIONS: Record<ApiSource, (videoId: string) => Promise<YtdlpResult>> = {
  choco_video: fetchFromChocoVideo,
  choco_stream: fetchFromChocoStream,
  min_tube: fetchFromMinTubeParallel,
  edge_function: fetchFromEdgeFunction,
  piped: fetchFromPipedParallel,
  invidious: async (videoId: string) => {
    const result = await fetchHLSFromInvidiousParallel(videoId);
    if (result && result.streams && result.streams.length > 0) {
      return {
        success: true,
        streams: result.streams,
        hlsUrl: result.hlsUrl,
        isLive: result.isLive,
        title: result.title,
        author: result.author,
      };
    }
    return { success: false, streams: [], error: 'Invidious failed' };
  },
  cobalt: fetchFromCobalt,
};

// Main function with customizable fallback chain
export const getYtdlpStreams = async (videoId: string): Promise<YtdlpResult> => {
  return streamCache.getOrFetchStream(videoId, async () => {
    // Get user-configured priority order
    const priority = getApiPriority();
    
    console.log('[ytdlp] Using API priority:', priority.join(' → '));

    for (const apiSource of priority) {
      const fetchFunction = API_FETCH_FUNCTIONS[apiSource];
      if (!fetchFunction) continue;

      console.log(`[ytdlp] Trying ${apiSource}...`);
      
      try {
        const result = await fetchFunction(videoId);
        
        if (result.success && result.streams.length > 0) {
          console.log(`[ytdlp] Success from ${apiSource}`);
          return {
            streams: result.streams,
            hlsUrl: result.hlsUrl,
            isLive: result.isLive,
            title: result.title,
            author: result.author,
          };
        }
      } catch (error) {
        console.warn(`[ytdlp] ${apiSource} failed:`, error);
      }
      
      console.log(`[ytdlp] ${apiSource} failed, trying next...`);
    }

    return null;
  }).then(result => {
    if (result) {
      return {
        success: true,
        streams: result.streams,
        hlsUrl: result.hlsUrl,
        isLive: result.isLive,
        title: result.title,
        author: result.author,
      };
    }
    return {
      success: false,
      streams: [],
      error: 'Could not fetch streams via ytdlp',
    };
  });
};

// Check availability
export const checkYtdlpAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(
      `${CORS_PROXIES[0]}${encodeURIComponent(COBALT_APIS[0])}`,
      { method: 'GET' },
      3000
    );
    return response.ok;
  } catch {
    return false;
  }
};
