import React from 'react';
import VideoCard from './VideoCard';

interface Video {
  videoId: string;
  title: string;
  author: string;
  authorId?: string;
  viewCount?: number;
  lengthSeconds?: number;
  publishedText?: string;
  videoThumbnails: { url: string; width: number; height: number; quality: string }[];
  liveNow?: boolean;
}

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  compact?: boolean;
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos, loading, compact }) => {
  if (loading) {
    return (
      <div className={compact ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={compact ? 'flex gap-3 p-2' : ''}>
            <div className={`${compact ? 'w-40' : 'w-full'} aspect-video bg-muted rounded-lg animate-pulse`} />
            {compact && (
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>
            )}
            {!compact && (
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1">
        {videos.map((video) => (
          <VideoCard
            key={video.videoId}
            videoId={video.videoId}
            title={video.title}
            author={video.author}
            authorId={video.authorId}
            viewCount={video.viewCount}
            lengthSeconds={video.lengthSeconds}
            publishedText={video.publishedText}
            thumbnails={video.videoThumbnails}
            liveNow={video.liveNow}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <VideoCard
          key={video.videoId}
          videoId={video.videoId}
          title={video.title}
          author={video.author}
          authorId={video.authorId}
          viewCount={video.viewCount}
          lengthSeconds={video.lengthSeconds}
          publishedText={video.publishedText}
          thumbnails={video.videoThumbnails}
          liveNow={video.liveNow}
        />
      ))}
    </div>
  );
};

export default VideoGrid;
