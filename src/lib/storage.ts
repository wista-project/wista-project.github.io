import { Language } from './i18n';

const STORAGE_KEYS = {
  AUTH: 'tube_auth',
  LANGUAGE: 'tube_language',
  HISTORY: 'tube_history',
  FAVORITES: 'tube_favorites',
  QUALITY: 'tube_quality',
  API_PRIORITY: 'tube_api_priority',
   THUMBNAIL_SOURCE: 'tube_thumbnail_source',
} as const;

// API Priority types and defaults
export type ApiSource = 'choco_video' | 'choco_stream' | 'min_tube' | 'edge_function' | 'piped' | 'invidious' | 'cobalt';

export const DEFAULT_API_PRIORITY: ApiSource[] = [
  'choco_video',
  'choco_stream', 
  'min_tube',
  'edge_function',
  'piped',
  'invidious',
  'cobalt',
];

export const API_LABELS: Record<ApiSource, { name: string; description: string }> = {
  choco_video: { name: 'Choco Video', description: '高速・安定（推奨）' },
  choco_stream: { name: 'Choco Stream', description: 'ダイレクトストリーム' },
  min_tube: { name: 'MIN-Tube', description: '複数サーバー並列取得' },
  edge_function: { name: 'Edge Function', description: 'サーバーサイド処理' },
  piped: { name: 'Piped', description: 'プライバシー重視' },
  invidious: { name: 'Invidious', description: 'オープンソース' },
  cobalt: { name: 'Cobalt', description: '最終フォールバック' },
};

// API Priority
export const getApiPriority = (): ApiSource[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.API_PRIORITY);
    if (data) {
      const parsed = JSON.parse(data) as ApiSource[];
      // Validate and merge with defaults (in case new APIs are added)
      const validPriority = parsed.filter(api => DEFAULT_API_PRIORITY.includes(api));
      const missingApis = DEFAULT_API_PRIORITY.filter(api => !validPriority.includes(api));
      return [...validPriority, ...missingApis];
    }
    return DEFAULT_API_PRIORITY;
  } catch {
    return DEFAULT_API_PRIORITY;
  }
};

export const setApiPriority = (priority: ApiSource[]): void => {
  localStorage.setItem(STORAGE_KEYS.API_PRIORITY, JSON.stringify(priority));
};

export const resetApiPriority = (): void => {
  localStorage.removeItem(STORAGE_KEYS.API_PRIORITY);
};

export interface HistoryItem {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  timestamp: number;
  duration: number;
}

export interface FavoriteItem extends HistoryItem {}

// Auth
export const isAuthenticated = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
};

export const setAuthenticated = (value: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.AUTH, value.toString());
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
};

// Language
export const getStoredLanguage = (): Language | null => {
  return localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language | null;
};

export const setStoredLanguage = (lang: Language): void => {
  localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
};

// History
export const getHistory = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addToHistory = (item: HistoryItem): void => {
  const history = getHistory().filter(h => h.videoId !== item.videoId);
  history.unshift(item);
  // Keep only last 100 items
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 100)));
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
};

// Favorites
export const getFavorites = (): FavoriteItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addToFavorites = (item: FavoriteItem): void => {
  const favorites = getFavorites().filter(f => f.videoId !== item.videoId);
  favorites.unshift(item);
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
};

export const removeFromFavorites = (videoId: string): void => {
  const favorites = getFavorites().filter(f => f.videoId !== videoId);
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
};

export const isFavorite = (videoId: string): boolean => {
  return getFavorites().some(f => f.videoId === videoId);
};

// Quality preference
export const getPreferredQuality = (): string => {
  return localStorage.getItem(STORAGE_KEYS.QUALITY) || '720p';
};

export const setPreferredQuality = (quality: string): void => {
  localStorage.setItem(STORAGE_KEYS.QUALITY, quality);
};
 
 // Thumbnail source
 export type ThumbnailSource = 'i.ytimg.com' | 'img.youtube.com';
 
 export const getThumbnailSource = (): ThumbnailSource => {
   const stored = localStorage.getItem(STORAGE_KEYS.THUMBNAIL_SOURCE);
   if (stored === 'i.ytimg.com' || stored === 'img.youtube.com') {
     return stored;
   }
   return 'i.ytimg.com';
 };
 
 export const setThumbnailSource = (source: ThumbnailSource): void => {
   localStorage.setItem(STORAGE_KEYS.THUMBNAIL_SOURCE, source);
 };
