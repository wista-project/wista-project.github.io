// Education parameter sources based on toka-kun/Education
// https://github.com/toka-kun/Education

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

export interface EduParameter {
  name: string;
  value: string;
  source: string;
  category: 'education' | 'nocookie';
}

export interface EduSource {
  id: string;
  name: string;
  url: string | null;
  category: 'education' | 'nocookie';
  parseType: 'text' | 'json-params' | 'json-result';
}

// Parameter sources from toka-kun/Education
export const EDU_SOURCES: EduSource[] = [
  // Nocookie
  {
    id: 'nocookie',
    name: 'Nocookie',
    url: null,
    category: 'nocookie',
    parseType: 'text',
  },
  // Education sources
  {
    id: 'wakame',
    name: 'Education - wakame',
    url: 'https://raw.githubusercontent.com/wakame02/wktopu/refs/heads/main/edu.text',
    category: 'education',
    parseType: 'text',
  },
  {
    id: 'siawaseok',
    name: 'Education - siawaseok',
    url: 'https://raw.githubusercontent.com/siawaseok3/wakame/master/video_config.json',
    category: 'education',
    parseType: 'json-params',
  },
  {
    id: 'woolisbest4520-1',
    name: 'Education - woolisbest4520-1',
    url: 'https://raw.githubusercontent.com/woolisbest-4520/about-youtube/refs/heads/main/edu/edu.txt',
    category: 'education',
    parseType: 'text',
  },
  {
    id: 'woolisbest4520-2',
    name: 'Education - woolisbest4520-2',
    url: 'https://raw.githubusercontent.com/woolisbest-4520/about-youtube/refs/heads/main/edu/parameter.txt',
    category: 'education',
    parseType: 'text',
  },
  {
    id: 'woolisbest4520-3',
    name: 'Education - woolisbest4520-3',
    url: 'https://raw.githubusercontent.com/woolisbest-4520/about-youtube/refs/heads/main/edu/ep.txt',
    category: 'education',
    parseType: 'text',
  },
  {
    id: 'toka-kun-1',
    name: 'Education - Toka_Kun_-1',
    url: 'https://raw.githubusercontent.com/toka-kun/Education/refs/heads/main/keys/key1.json',
    category: 'education',
    parseType: 'json-result',
  },
  {
    id: 'toka-kun-2',
    name: 'Education - Toka_Kun_-2',
    url: 'https://raw.githubusercontent.com/toka-kun/Education/refs/heads/main/keys/key2.json',
    category: 'education',
    parseType: 'json-result',
  },
];

const fetchWithProxy = async (url: string): Promise<string> => {
  // First try direct fetch
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Fall through to proxy
  }

  // Try with CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        return await response.text();
      }
    } catch {
      continue;
    }
  }
  throw new Error('All proxies failed');
};

export const fetchParameterFromSource = async (source: EduSource): Promise<string> => {
  if (!source.url) {
    return ''; // Nocookie doesn't need parameters
  }

  try {
    const text = await fetchWithProxy(source.url);
    
    switch (source.parseType) {
      case 'text':
        return text.trim();
      case 'json-params': {
        const data = JSON.parse(text);
        return data.params || '';
      }
      case 'json-result': {
        const data = JSON.parse(text);
        return data.result || '';
      }
      default:
        return text.trim();
    }
  } catch (error) {
    console.warn(`Failed to fetch parameter from ${source.name}:`, error);
    return '';
  }
};

export const fetchAllParameters = async (): Promise<EduParameter[]> => {
  const params: EduParameter[] = [];
  
  for (const source of EDU_SOURCES) {
    try {
      const value = await fetchParameterFromSource(source);
      params.push({
        name: source.name,
        value,
        source: source.url || 'builtin',
        category: source.category,
      });
    } catch {
      // Include even if fetch failed, with empty value
      params.push({
        name: source.name,
        value: '',
        source: source.url || 'builtin',
        category: source.category,
      });
    }
  }
  
  return params;
};

export const buildEduEmbedUrl = (
  videoId: string, 
  params: string, 
  options?: {
    autoplay?: boolean;
    loop?: boolean;
    start?: number;
    end?: number;
    listId?: string;
  }
): string => {
  const baseUrl = `https://www.youtubeeducation.com/embed/${videoId}`;
  
  // Start with provided params or empty
  let finalParams = params ? `${params}` : '';
  
  // Build additional params
  const additionalParams: string[] = [];
  
  if (options?.autoplay !== false) {
    additionalParams.push('autoplay=1');
  }
  
  if (options?.loop) {
    additionalParams.push('loop=1');
    additionalParams.push(`playlist=${videoId}`);
  }
  
  if (options?.start !== undefined && options.start > 0) {
    additionalParams.push(`start=${options.start}`);
  }
  
  if (options?.end !== undefined && options.end > 0) {
    additionalParams.push(`end=${options.end}`);
  }
  
  if (options?.listId) {
    if (options.listId === videoId) {
      additionalParams.push(`playlist=${options.listId}`);
    } else {
      additionalParams.push(`list=${options.listId}`);
    }
  }
  
  // Combine params
  if (additionalParams.length > 0) {
    const additionalStr = additionalParams.join('&');
    if (finalParams) {
      // Check if params already has ? or starts with ?
      if (finalParams.startsWith('?')) {
        finalParams = `${finalParams}&${additionalStr}`;
      } else {
        finalParams = `?${finalParams}&${additionalStr}`;
      }
    } else {
      finalParams = `?${additionalStr}`;
    }
  } else if (finalParams && !finalParams.startsWith('?')) {
    finalParams = `?${finalParams}`;
  }
  
  return `${baseUrl}${finalParams}`;
};

export const buildNoCookieEmbedUrl = (
  videoId: string,
  options?: {
    autoplay?: boolean;
    loop?: boolean;
    start?: number;
    end?: number;
    listId?: string;
  }
): string => {
  const params: string[] = [];
  
  if (options?.autoplay !== false) {
    params.push('autoplay=1');
  }
  
  params.push('mute=0');
  
  if (options?.loop) {
    params.push('loop=1');
    params.push(`playlist=${videoId}`);
  }
  
  if (options?.start !== undefined && options.start > 0) {
    params.push(`start=${options.start}`);
  }
  
  if (options?.end !== undefined && options.end > 0) {
    params.push(`end=${options.end}`);
  }
  
  if (options?.listId) {
    if (options.listId === videoId) {
      params.push(`playlist=${options.listId}`);
    } else {
      params.push(`list=${options.listId}`);
    }
  }
  
  const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  return `https://www.youtube-nocookie.com/embed/${videoId}${queryString}`;
};

// Helper to convert time string (1:30, 90, etc.) to seconds
export const convertToSeconds = (input: string): number | null => {
  if (!input) return null;
  
  // Normalize full-width characters
  const str = input
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/：/g, ':')
    .trim();
  
  if (!str) return null;
  
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  
  const val = parseInt(str, 10);
  return isNaN(val) ? null : val;
};

// Fetch default params (legacy function for compatibility)
export const fetchDefaultParams = async (): Promise<string> => {
  const siawaseok = EDU_SOURCES.find(s => s.id === 'siawaseok');
  if (siawaseok) {
    return fetchParameterFromSource(siawaseok);
  }
  return '';
};
