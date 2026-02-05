// CORS Proxy management with dynamic fallback from GitHub

const STATIC_CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/',
  'https://corsproxy.io/?url=',
  'https://cors.lol/?url=',
  'https://yacdn.org/proxy/',
  'https://proxy.cors.sh/',
  'https://cors.wtf/?url=',
  'https://corsproxy.rocks/?url=',
  'https://cors.hyoo.ru/?url=',
  'https://cors.miaouf.com/?url=',
  'https://crossorigin.me/',
  'https://cors.x2u.in/',
  'https://jsonp.afeld.me/?url=',
  'https://cors-proxy.htmldriven.com/?url=',
  'https://corsproxy.our.buildo.io/?url=',
  'https://cors.now.sh/',
  'https://api.allorigins.win/get?url=',
];

const GITHUB_PROXY_LIST_URL = 'https://raw.githubusercontent.com/woolisbest/crosproxy-list/refs/heads/main/main.txt';
const STORAGE_KEY = 'cors_proxies_github';
const STORAGE_TIMESTAMP_KEY = 'cors_proxies_github_ts';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

let dynamicProxies: string[] = [];
let lastFetchAttempt = 0;
const FETCH_COOLDOWN = 5 * 60 * 1000; // 5 minutes between fetch attempts

// Load cached proxies from localStorage
const loadCachedProxies = (): string[] => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    
    if (cached && timestamp) {
      const ts = parseInt(timestamp, 10);
      if (Date.now() - ts < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch {
    // Ignore
  }
  return [];
};

// Save proxies to localStorage
const saveCachedProxies = (proxies: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proxies));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore
  }
};

// Parse proxy list from text (handles various formats)
const parseProxyList = (text: string): string[] => {
  const lines = text.split('\n');
  const proxies: string[] = [];
  
  for (const line of lines) {
    let trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }
    
    // Handle JSON format: "url",
    if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
      trimmed = trimmed.replace(/^["']|["'],?$/g, '');
    }
    
    // Handle array format: - url
    if (trimmed.startsWith('-')) {
      trimmed = trimmed.substring(1).trim();
    }
    
    // Validate URL format
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // Ensure proxy ends with proper delimiter
      if (!trimmed.includes('?') && !trimmed.endsWith('/')) {
        trimmed += '/';
      }
      proxies.push(trimmed);
    }
  }
  
  return proxies;
};

// Fetch proxies from GitHub
const fetchProxiesFromGitHub = async (): Promise<string[]> => {
  const now = Date.now();
  
  // Check cooldown
  if (now - lastFetchAttempt < FETCH_COOLDOWN) {
    return dynamicProxies;
  }
  
  lastFetchAttempt = now;
  
  try {
    console.log('[CORSProxy] Fetching proxy list from GitHub...');
    const response = await fetch(GITHUB_PROXY_LIST_URL, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const text = await response.text();
      const proxies = parseProxyList(text);
      
      if (proxies.length > 0) {
        console.log(`[CORSProxy] Loaded ${proxies.length} proxies from GitHub`);
        dynamicProxies = proxies;
        saveCachedProxies(proxies);
        return proxies;
      }
    }
  } catch (error) {
    console.log('[CORSProxy] Failed to fetch from GitHub:', error);
  }
  
  return [];
};

// Initialize dynamic proxies from cache
dynamicProxies = loadCachedProxies();

// Get all available proxies (static + dynamic)
export const getAllProxies = (): string[] => {
  const combined = [...STATIC_PROXIES_SET];
  
  for (const proxy of dynamicProxies) {
    if (!combined.includes(proxy)) {
      combined.push(proxy);
    }
  }
  
  return combined;
};

// Create a Set for deduplication
const STATIC_PROXIES_SET = [...STATIC_CORS_PROXIES];

// Get static proxies
export const getStaticProxies = (): string[] => {
  return [...STATIC_CORS_PROXIES];
};

// Get dynamic proxies (from GitHub)
export const getDynamicProxies = async (): Promise<string[]> => {
  if (dynamicProxies.length === 0) {
    await fetchProxiesFromGitHub();
  }
  return dynamicProxies;
};

// Force refresh proxies from GitHub
export const refreshProxiesFromGitHub = async (): Promise<string[]> => {
  lastFetchAttempt = 0; // Reset cooldown
  return fetchProxiesFromGitHub();
};

// Fetch with proxy fallback
export const fetchWithProxyFallback = async <T>(
  apiUrl: string,
  timeout: number = 3000,
  maxRetries: number = 2
): Promise<T | null> => {
  const staticProxies = getStaticProxies();
  
  // Try static proxies first
  for (let retry = 0; retry < maxRetries; retry++) {
    for (const proxy of staticProxies) {
      try {
        const url = `${proxy}${encodeURIComponent(apiUrl)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data && !data.error) {
            return data as T;
          }
        }
      } catch {
        // Continue to next proxy
      }
    }
  }
  
  // Fallback to GitHub proxies
  console.log('[CORSProxy] Static proxies failed, trying GitHub list...');
  const githubProxies = await getDynamicProxies();
  
  for (const proxy of githubProxies) {
    try {
      const url = `${proxy}${encodeURIComponent(apiUrl)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data && !data.error) {
          console.log(`[CORSProxy] Success with GitHub proxy: ${proxy}`);
          return data as T;
        }
      }
    } catch {
      // Continue to next proxy
    }
  }
  
  return null;
};

// Export static list for backward compatibility
export const CORS_PROXIES = STATIC_CORS_PROXIES;
