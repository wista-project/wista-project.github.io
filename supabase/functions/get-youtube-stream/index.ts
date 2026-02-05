import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Piped API servers (expanded list)
const PIPED_SERVERS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.r4fo.com',
  'https://api.piped.yt',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.syncpundit.io',
];

// Invidious instances as fallback (expanded list)
const INVIDIOUS_INSTANCES = [
  'https://inv.vern.cc',
  'https://invidious.fdn.fr',
  'https://iv.ggtyler.dev',
  'https://invidious.lunar.icu',
  'https://yt.artemislena.eu',
  'https://invidious.privacydev.net',
  'https://vid.puffyan.us',
  'https://yewtu.be',
  'https://invidious.nerdvpn.de',
  'https://inv.riverside.rocks',
  'https://invidious.slipfox.xyz',
];

// Cobalt API endpoints
const COBALT_APIS = [
  'https://api.cobalt.tools',
  'https://co.wuk.sh',
];

interface StreamResult {
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
}

// Parallel fetch with early termination
async function parallelFetch<T>(
  urls: string[],
  timeout: number
): Promise<{ data: T; source: string } | null> {
  const promises = urls.map(async (url): Promise<{ data: T; source: string } | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return null;
      
      const text = await response.text();
      
      // Validate response
      const invalidPatterns = ['shutdown', 'blocked', '<!DOCTYPE', '<html', 'Forbidden', 'error'];
      if (invalidPatterns.some(p => text.toLowerCase().includes(p.toLowerCase()))) {
        return null;
      }
      
      const data = JSON.parse(text);
      if (!data) return null;
      
      return { data, source: url };
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
    }, timeout + 500);
  });
}

// Try Choco-tube Video API (fastest, highest priority)
async function tryChocoVideo(videoId: string): Promise<StreamResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${CHOCO_VIDEO_API}?id=${videoId}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data || data.error) return null;
    
    // Extract stream URLs from the response
    const formats: Array<{ url: string; quality: string; type: string; container: string }> = [];
    
    if (data.formats && Array.isArray(data.formats)) {
      for (const fmt of data.formats) {
        if (fmt.url) {
          formats.push({
            url: fmt.url,
            quality: fmt.quality || fmt.qualityLabel || 'Unknown',
            type: fmt.mimeType || fmt.type || 'video/mp4',
            container: fmt.container || 'mp4',
          });
        }
      }
    }
    
    // Get best stream URL
    let streamUrl = data.url || data.stream_url || '';
    if (!streamUrl && formats.length > 0) {
      // Prefer 720p or 1080p
      const best = formats.find(f => f.quality.includes('1080')) ||
                   formats.find(f => f.quality.includes('720')) ||
                   formats[0];
      streamUrl = best.url;
    }
    
    if (!streamUrl) return null;
    
    console.log(`[ChocoVideo] Success for ${videoId}`);
    
    return {
      video_id: videoId,
      title: data.title || 'Unknown',
      thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      duration: data.duration || data.lengthSeconds || 0,
      stream_url: streamUrl,
      hls_url: data.hlsUrl || data.hls_url,
      is_live: data.isLive || data.liveNow || false,
      author: data.author || data.uploader,
      formats,
    };
  } catch (error) {
    console.warn('[ChocoVideo] Failed:', error);
    return null;
  }
}

// Try Choco-tube Direct Stream API
async function tryChocoStream(videoId: string): Promise<StreamResult | null> {
  try {
    // First get metadata
    const metadata = await getMetadata(videoId);
    
    // The stream URL can be used directly
    const streamUrl = `${CHOCO_STREAM_API}?id=${videoId}`;
    const m3u8Url = `${CHOCO_M3U8_API}?id=${videoId}`;
    
    // Verify the stream is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(streamUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    console.log(`[ChocoStream] Direct stream available for ${videoId}`);
    
    return {
      video_id: videoId,
      title: metadata?.title || 'Unknown',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 0,
      stream_url: streamUrl,
      hls_url: m3u8Url,
      is_live: false,
      author: metadata?.author_name,
      formats: [
        { url: streamUrl, quality: 'Best', type: 'video/mp4', container: 'mp4' },
        { url: m3u8Url, quality: 'HLS', type: 'application/x-mpegURL', container: 'm3u8' },
      ],
    };
  } catch (error) {
    console.warn('[ChocoStream] Failed:', error);
    return null;
  }
}

// Try MIN-Tube2 APIs (parallel fetch from multiple servers)
async function tryMinTube(videoId: string): Promise<StreamResult | null> {
  console.log('[MinTube] Trying MIN-Tube APIs in parallel...');
  
  // Optionally update API list from GitHub
  let apiServers = [...MIN_TUBE_APIS];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const listResponse = await fetch(MIN_TUBE_API_LIST_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (listResponse.ok) {
      const updatedList = await listResponse.json();
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        apiServers = updatedList;
        console.log('[MinTube] Updated API list:', apiServers.length, 'servers');
      }
    }
  } catch {
    // Use default list
  }
  
  const urls = apiServers.map(api => `${api}/api/video/${videoId}`);
  const result = await parallelFetch<any>(urls, 6000);
  
  if (!result?.data?.stream_url) return null;
  
  const data = result.data;
  
  const formats: Array<{ url: string; quality: string; type: string; container: string }> = [];
  
  // Add formats if available
  if (data.formats && Array.isArray(data.formats)) {
    for (const fmt of data.formats) {
      if (fmt.url) {
        formats.push({
          url: fmt.url,
          quality: fmt.quality || fmt.qualityLabel || 'Unknown',
          type: fmt.mimeType || 'video/mp4',
          container: fmt.container || 'mp4',
        });
      }
    }
  }
  
  console.log(`[MinTube] Success from ${result.source}`);
  
  return {
    video_id: videoId,
    title: data.videoTitle || data.title || 'Unknown',
    thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    duration: data.duration || data.lengthSeconds || 0,
    stream_url: data.stream_url,
    hls_url: data.hls_url,
    is_live: data.is_live || data.isLive || false,
    author: data.author || data.uploader,
    formats,
  };
}

// Try Piped API (fastest and most reliable)
async function tryPiped(videoId: string): Promise<StreamResult | null> {
  const urls = PIPED_SERVERS.map(server => `${server}/streams/${videoId}`);
  const result = await parallelFetch<any>(urls, 5000);
  
  if (!result?.data?.title) return null;
  
  const data = result.data;
  
  // Get video streams with audio
  const videoStreams = (data.videoStreams || []).filter((s: any) => s.url && !s.videoOnly);
  const audioStreams = (data.audioStreams || []).filter((s: any) => s.url);
  
  // Find best stream
  const sorted = [...videoStreams].sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
  const best1080 = sorted.find((s: any) => s.height === 1080);
  const best720 = sorted.find((s: any) => s.height === 720);
  const bestStream = best1080 || best720 || sorted[0];
  
  const formats = videoStreams.map((s: any) => ({
    url: s.url,
    quality: s.quality || `${s.height}p`,
    type: s.mimeType,
    container: s.format,
  }));
  
  console.log(`[Piped] Success from ${result.source}`);
  
  return {
    video_id: videoId,
    title: data.title,
    thumbnail: data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    duration: data.duration || 0,
    stream_url: bestStream?.url || '',
    hls_url: data.hls,
    is_live: data.livestream,
    author: data.uploader,
    formats,
  };
}

// Try Invidious API as fallback
async function tryInvidious(videoId: string): Promise<StreamResult | null> {
  const urls = INVIDIOUS_INSTANCES.map(instance => `${instance}/api/v1/videos/${videoId}`);
  const result = await parallelFetch<any>(urls, 6000);
  
  if (!result?.data?.title) return null;
  
  const data = result.data;
  
  // Get format streams
  const formatStreams = data.formatStreams || [];
  let bestStream = formatStreams.find((f: any) => f.url && f.qualityLabel);
  
  if (!bestStream && formatStreams.length > 0) {
    bestStream = formatStreams[0];
  }
  
  const formats = formatStreams.map((f: any) => ({
    url: f.url,
    quality: f.qualityLabel || f.quality,
    type: f.type,
    container: f.container,
  }));
  
  // Get adaptive formats for high quality
  const adaptiveFormats = data.adaptiveFormats || [];
  const webmStreams = adaptiveFormats.filter((s: any) => s.container === 'webm' && s.resolution);
  
  // Prefer 1080p webm, then 720p
  const highStream = webmStreams.find((s: any) => s.resolution === '1080p') ||
                     webmStreams.find((s: any) => s.resolution === '720p');
  
  console.log(`[Invidious] Success from ${result.source}`);
  
  return {
    video_id: videoId,
    title: data.title,
    thumbnail: data.videoThumbnails?.find((t: any) => t.quality === 'maxres')?.url || 
               `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    duration: data.lengthSeconds,
    stream_url: highStream?.url || bestStream?.url || '',
    hls_url: data.hlsUrl,
    is_live: data.liveNow,
    author: data.author,
    formats,
  };
}

// Try Cobalt API as final fallback
async function tryCobalt(videoId: string): Promise<StreamResult | null> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  for (const apiBase of COBALT_APIS) {
    const modes = ['max', '1080', '720'];
    
    for (const mode of modes) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${apiBase}/api/json`, {
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
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            // Get metadata from noembed
            const metadata = await getMetadata(videoId);
            
            console.log(`[Cobalt] Success from ${apiBase}`);
            
            return {
              video_id: videoId,
              title: data.filename || metadata?.title || 'Unknown',
              thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
              duration: 0,
              stream_url: data.url,
              is_live: data.isLive || false,
              author: metadata?.author_name,
            };
          }
        }
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

// Get metadata from noembed
async function getMetadata(videoId: string): Promise<{ title: string; author_name: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return { title: data.title, author_name: data.author_name };
    }
  } catch {
    // Ignore
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const videoId = url.searchParams.get('video_id') || url.pathname.split('/').pop();
    
    if (!videoId || videoId.length !== 11) {
      return new Response(
        JSON.stringify({ error: 'Invalid video_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[EdgeFn] Fetching stream for video: ${videoId}`);
    const startTime = Date.now();
    
    // Priority 1: Choco-tube Video API (highest priority)
    let result = await tryChocoVideo(videoId);
    
    // Priority 2: Choco-tube Direct Stream
    if (!result || (!result.stream_url && !result.hls_url)) {
      console.log('[EdgeFn] ChocoVideo failed, trying ChocoStream...');
      result = await tryChocoStream(videoId);
    }
    
    // Priority 3: MIN-Tube2 APIs
    if (!result || (!result.stream_url && !result.hls_url)) {
      console.log('[EdgeFn] ChocoStream failed, trying MIN-Tube...');
      result = await tryMinTube(videoId);
    }
    
    // Priority 4: Piped APIs
    if (!result || (!result.stream_url && !result.hls_url)) {
      console.log('[EdgeFn] MIN-Tube failed, trying Piped...');
      result = await tryPiped(videoId);
    }
    
    // Priority 5: Invidious APIs
    if (!result || (!result.stream_url && !result.hls_url)) {
      console.log('[EdgeFn] Piped failed, trying Invidious...');
      result = await tryInvidious(videoId);
    }
    
    // Priority 6: Cobalt API (final fallback)
    if (!result || (!result.stream_url && !result.hls_url)) {
      console.log('[EdgeFn] Invidious failed, trying Cobalt...');
      result = await tryCobalt(videoId);
    }
    
    const elapsed = Date.now() - startTime;
    
    if (result && (result.stream_url || result.hls_url)) {
      console.log(`[EdgeFn] Success in ${elapsed}ms for ${videoId}`);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[EdgeFn] All methods failed for ${videoId} after ${elapsed}ms`);
    
    return new Response(
      JSON.stringify({ error: 'Could not fetch stream URL. All services failed.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('[EdgeFn] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
