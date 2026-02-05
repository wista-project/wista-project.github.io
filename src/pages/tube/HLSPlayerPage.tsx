import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Radio, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getVideoDetails, getThumbnailUrl } from '@/lib/invidious';

const HLSPlayerPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId]);

  const loadVideo = async () => {
    if (!videoId) return;
    setLoading(false);
    setError('');
    try {
      const details = await getVideoDetails(videoId);
      setVideo(details);
      
      if (details.hlsUrl && videoRef.current) {
        // Check if HLS.js is needed (not Safari)
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = details.hlsUrl;
        } else {
          // For non-Safari browsers, we'd need HLS.js
          // For now, fallback to regular stream
          const format = details.formatStreams?.[0];
          if (format) {
            videoRef.current.src = format.url;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load video:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <Link
            to={videoId ? `/tube/watch/${videoId}` : '/home'}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="flex items-center gap-2 text-white">
            <Radio className="w-5 h-5 text-primary" />
            <span className="font-medium">{t('hls')}</span>
          </div>
        </div>
      </header>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <div className="text-white">{t('loading')}</div>
        ) : error ? (
          <div className="text-center">
            <p className="text-white mb-4">{error}</p>
            <button onClick={loadVideo} className="btn-primary">
              {t('retry')}
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full max-h-screen"
            controls
            autoPlay
            playsInline
            poster={video ? getThumbnailUrl(video.videoThumbnails) : undefined}
          />
        )}
      </div>

      {/* Video Info */}
      {video && (
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <h1 className="text-white font-bold text-lg line-clamp-1">{video.title}</h1>
          <p className="text-white/70 text-sm">{video.author}</p>
        </div>
      )}
    </div>
  );
};

export default HLSPlayerPage;
