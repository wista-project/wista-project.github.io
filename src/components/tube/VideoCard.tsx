import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Radio } from 'lucide-react';
import { formatDuration, formatViewCount, getThumbnailUrl } from '@/lib/invidious';
import { useLanguage } from '@/contexts/LanguageContext';

interface VideoCardProps {
  videoId: string;
  title: string;
  author: string;
  authorId?: string;
  viewCount?: number;
  lengthSeconds?: number;
  publishedText?: string;
  thumbnails: { url: string; width: number; height: number; quality: string }[];
  liveNow?: boolean;
  compact?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({
  videoId,
  title,
  author,
  viewCount,
  lengthSeconds,
  publishedText,
  thumbnails,
  liveNow,
  compact = false,
}) => {
  const { t } = useLanguage();
  const thumbnailUrl = getThumbnailUrl(thumbnails);

  if (compact) {
    return (
      <Link
        to={`/tube/watch/${videoId}`}
        className="flex gap-3 p-2 rounded-lg hover:bg-secondary transition-colors group"
      >
        <div className="relative w-40 shrink-0">
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {liveNow ? (
            <span className="absolute bottom-1 right-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
              <Radio className="w-3 h-3" />
              {t('live')}
            </span>
          ) : lengthSeconds ? (
            <span className="absolute bottom-1 right-1 bg-background/80 text-xs px-1.5 py-0.5 rounded">
              {formatDuration(lengthSeconds)}
            </span>
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{author}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {viewCount !== undefined && (
              <span>{formatViewCount(viewCount)} {t('views')}</span>
            )}
            {publishedText && <span>• {publishedText}</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/tube/watch/${videoId}`}
      className="group block"
    >
      <div className="video-thumbnail aspect-video bg-muted">
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
        {liveNow ? (
          <span className="absolute bottom-2 right-2 bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
            <Radio className="w-3 h-3" />
            {t('live')}
          </span>
        ) : lengthSeconds ? (
          <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded">
            {formatDuration(lengthSeconds)}
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{author}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {viewCount !== undefined && (
            <span>{formatViewCount(viewCount)} {t('views')}</span>
          )}
          {publishedText && <span>• {publishedText}</span>}
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;
