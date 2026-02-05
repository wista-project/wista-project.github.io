import React, { useRef, useEffect, useState } from 'react';
import { Download, Settings, Volume2, VolumeX, Maximize, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPreferredQuality, setPreferredQuality } from '@/lib/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoFormat {
  url: string;
  itag: string;
  type: string;
  quality: string;
  qualityLabel?: string;
  container: string;
}

interface VideoPlayerProps {
  formats: VideoFormat[];
  hlsUrl?: string;
  title: string;
  poster?: string;
  isLive?: boolean;
}

const QUALITY_OPTIONS = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];

const VideoPlayer: React.FC<VideoPlayerProps> = ({ formats, hlsUrl, title, poster, isLive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState(getPreferredQuality());
  const [showControls, setShowControls] = useState(true);
  const { t } = useLanguage();

  const availableQualities = QUALITY_OPTIONS.filter(q =>
    formats.some(f => f.qualityLabel?.includes(q) || f.quality?.includes(q))
  );

  const getVideoUrl = (quality: string): string => {
    const format = formats.find(f =>
      (f.qualityLabel?.includes(quality) || f.quality?.includes(quality)) &&
      f.type.includes('video')
    );
    if (format) return format.url;
    
    // Fallback to any available video format
    const videoFormat = formats.find(f => f.type.includes('video'));
    return videoFormat?.url || '';
  };

  const currentUrl = hlsUrl || getVideoUrl(selectedQuality);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    setPreferredQuality(quality);
    const currentTime = videoRef.current?.currentTime || 0;
    const wasPlaying = !videoRef.current?.paused;
    
    if (videoRef.current) {
      videoRef.current.src = getVideoUrl(quality);
      videoRef.current.currentTime = currentTime;
      if (wasPlaying) videoRef.current.play();
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const url = getVideoUrl(selectedQuality);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.mp4`;
      a.click();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={currentUrl}
        poster={poster}
        className="w-full aspect-video"
        onClick={togglePlay}
        playsInline
      />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4">
          <h2 className="text-white font-medium truncate">{title}</h2>
        </div>

        {/* Center Play Button */}
        <button
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-all hover:scale-110"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-primary-foreground" fill="currentColor" />
          ) : (
            <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
          )}
        </button>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Progress Bar */}
          {!isLive && (
            <div className="flex items-center gap-2 text-white text-sm">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
              <span>{formatTime(duration)}</span>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => skip(-10)}
                className="p-2 text-white hover:text-primary transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="p-2 text-white hover:text-primary transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => skip(10)}
                className="p-2 text-white hover:text-primary transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={toggleMute}
                className="p-2 text-white hover:text-primary transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Quality Selector */}
              {availableQualities.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1 text-white text-sm bg-white/20 rounded hover:bg-white/30 transition-colors">
                    <Settings className="w-4 h-4" />
                    {selectedQuality}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-border">
                    {availableQualities.map((q) => (
                      <DropdownMenuItem
                        key={q}
                        onClick={() => handleQualityChange(q)}
                        className={`cursor-pointer ${selectedQuality === q ? 'text-primary' : ''}`}
                      >
                        {q}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="p-2 text-white hover:text-primary transition-colors"
                title={t('download')}
              >
                <Download className="w-5 h-5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white hover:text-primary transition-colors"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
