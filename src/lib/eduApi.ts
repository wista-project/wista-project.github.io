// Education API for video information (alternative source)
// Based on choco-tube EDU_VIDEO_API implementation

const EDU_VIDEO_API = 'https://vid.puffyan.us/api/v1/videos/';
const EDU_TIMEOUT = 4000;

export interface EduVideoInfo {
  title: string;
  description: string;
  author: string;
  authorId: string;
  authorThumbnail: string;
  views: number;
  likes: number;
  subscribers: string;
  published: string;
  lengthSeconds: number;
  related: EduRelatedVideo[];
}

export interface EduRelatedVideo {
  videoId: string;
  title: string;
  author: string;
  authorId: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
}

// Fetch video info from Education API
export const getEduVideoInfo = async (videoId: string): Promise<EduVideoInfo | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EDU_TIMEOUT);
    
    const response = await fetch(`${EDU_VIDEO_API}${videoId}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const text = await response.text();
    
    // Validate it's JSON
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      return null;
    }
    
    const data = JSON.parse(text);
    
    if (!data.title) return null;
    
    // Extract author thumbnail
    const authorThumbnails = data.authorThumbnails || [];
    const authorThumbnail = authorThumbnails[0]?.url || '';
    
    // Format related videos
    const related: EduRelatedVideo[] = (data.recommendedVideos || [])
      .slice(0, 20)
      .map((r: any) => ({
        videoId: r.videoId,
        title: r.title,
        author: r.author,
        authorId: r.authorId,
        lengthSeconds: r.lengthSeconds || 0,
        viewCount: r.viewCount || 0,
        thumbnail: r.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`,
      }));
    
    return {
      title: data.title,
      description: data.description || '',
      author: data.author || '',
      authorId: data.authorId || '',
      authorThumbnail,
      views: data.viewCount || 0,
      likes: data.likeCount || 0,
      subscribers: data.subCountText || '',
      published: data.publishedText || '',
      lengthSeconds: data.lengthSeconds || 0,
      related,
    };
  } catch (error) {
    console.log('[EduAPI] Error:', error);
    return null;
  }
};

// Convert Edu API response to Invidious-compatible format
export const eduToInvidiousFormat = (edu: EduVideoInfo, videoId: string) => {
  return {
    videoId,
    title: edu.title,
    author: edu.author,
    authorId: edu.authorId,
    description: edu.description,
    viewCount: edu.views,
    likeCount: edu.likes,
    lengthSeconds: edu.lengthSeconds,
    publishedText: edu.published,
    videoThumbnails: [
      { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, quality: 'medium', width: 320, height: 180 },
      { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, quality: 'maxres', width: 1280, height: 720 },
    ],
    authorThumbnails: edu.authorThumbnail ? [{ url: edu.authorThumbnail }] : [],
    recommendedVideos: edu.related.map(r => ({
      videoId: r.videoId,
      title: r.title,
      author: r.author,
      authorId: r.authorId,
      viewCount: r.viewCount,
      lengthSeconds: r.lengthSeconds,
      videoThumbnails: [{ url: r.thumbnail, quality: 'medium', width: 320, height: 180 }],
    })),
  };
};
