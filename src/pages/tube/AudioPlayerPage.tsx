import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Music, ArrowLeft, Play, Pause, SkipBack, SkipForward, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getVideoDetails, getThumbnailUrl, formatDuration } from '@/lib/invidious';

const AudioPlayerPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId]);

  const loadVideo = async () => {
    if (!videoId) return;
    setLoading(true);
    setError('');
    try {
      const details = await getVideoDetails(videoId);
      setVideo(details);
      
      // Find audio-only format
      const audioFormat = details.adaptiveFormats?.find(
        (f: any) => f.type.includes('audio') && f.container === 'mp4'
      ) || details.adaptiveFormats?.find((f: any) => f.type.includes('audio'));
      
      if (audioFormat && audioRef.current) {
        audioRef.current.src = audioFormat.url;
      }
    } catch (err) {
      console.error('Failed to load video:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Link
            to={videoId ? `/tube/watch/${videoId}` : '/home'}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <span className="font-medium">{t('audio')}</span>
          </div>
        </div>
      </header>

      {/* Audio Player */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <audio ref={audioRef} className="hidden" />
        
        {loading ? (
          <div className="text-muted-foreground">{t('loading')}</div>
        ) : error ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button onClick={loadVideo} className="btn-primary">
              {t('retry')}
            </button>
          </div>
        ) : video && (
          <div className="w-full max-w-md space-y-8">
            {/* Album Art */}
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={getThumbnailUrl(video.videoThumbnails)}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="text-center">
              <h1 className="text-xl font-bold line-clamp-2">{video.title}</h1>
              <p className="text-muted-foreground mt-1">{video.author}</p>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => skip(-10)}
                className="p-3 rounded-full hover:bg-secondary transition-colors"
              >
                <SkipBack className="w-6 h-6" />
              </button>
              <button
                onClick={togglePlay}
                className="p-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" fill="currentColor" />
                ) : (
                  <Play className="w-8 h-8 ml-1" fill="currentColor" />
                )}
              </button>
              <button
                onClick={() => skip(10)}
                className="p-3 rounded-full hover:bg-secondary transition-colors"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayerPage;
