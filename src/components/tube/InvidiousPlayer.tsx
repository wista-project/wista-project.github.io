import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVideoDetails } from '@/lib/invidious';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, Volume2, VolumeX, Maximize, Download, RefreshCw, Video, Music, Film, FileVideo } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface StreamSource {
  url: string;
  quality: string;
  label: string;
  type: string;
  container: string;
  isAdaptive: boolean;
}

interface InvidiousPlayerProps {
  videoId: string;
  onError?: () => void;
  onSuccess?: () => void;
}

const InvidiousPlayer: React.FC<InvidiousPlayerProps> = ({ videoId, onError, onSuccess }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [videoKey, setVideoKey] = useState(0);
  const [hasReportedError, setHasReportedError] = useState(false);
  const [formatTab, setFormatTab] = useState<string>('combined');

  const { data: videoDetails, isLoading, error } = useQuery({
    queryKey: ['videoDetails', videoId],
    queryFn: () => getVideoDetails(videoId),
    staleTime: 5 * 60 * 1000,
  });

  // Parse all available streams
  const allStreams = useMemo(() => {
    if (!videoDetails) return { combined: [], video: [], audio: [], hls: null };

    const combined: StreamSource[] = [];
    const video: StreamSource[] = [];
    const audio: StreamSource[] = [];

    // Format streams (combined video+audio)
    videoDetails.formatStreams?.forEach(stream => {
      if (stream.url) {
        const container = stream.container || 'mp4';
        combined.push({
          url: stream.url,
          quality: stream.quality || stream.resolution || 'unknown',
          label: `${stream.resolution || stream.quality || 'Stream'} (${container.toUpperCase()})`,
          type: stream.type || 'video/mp4',
          container,
          isAdaptive: false,
        });
      }
    });

    // Adaptive formats (video-only or audio-only)
    videoDetails.adaptiveFormats?.forEach(format => {
      if (format.url) {
        const container = format.container || (format.type?.includes('webm') ? 'webm' : format.type?.includes('mp4') ? 'mp4' : 'unknown');
        const isAudio = format.type?.includes('audio');
        const isVideo = format.type?.includes('video');
        
        const source: StreamSource = {
          url: format.url,
          quality: format.qualityLabel || format.quality || format.bitrate || 'unknown',
          label: isAudio 
            ? `${format.bitrate || format.quality} (${container.toUpperCase()} Audio)`
            : `${format.qualityLabel || format.resolution || format.quality} (${container.toUpperCase()})`,
          type: format.type || '',
          container,
          isAdaptive: true,
        };

        if (isAudio) {
          audio.push(source);
        } else if (isVideo) {
          video.push(source);
        }
      }
    });

    return { 
      combined, 
      video, 
      audio, 
      hls: videoDetails.hlsUrl || null 
    };
  }, [videoDetails]);

  // Get current format list based on tab
  const currentSources = useMemo(() => {
    switch (formatTab) {
      case 'video': return allStreams.video;
      case 'audio': return allStreams.audio;
      case 'hls': return allStreams.hls ? [{ url: allStreams.hls, quality: 'HLS', label: 'HLS Live', type: 'application/x-mpegURL', container: 'm3u8', isAdaptive: false }] : [];
      default: return allStreams.combined;
    }
  }, [formatTab, allStreams]);

  // Set default source when sources change
  useEffect(() => {
    if (currentSources.length > 0) {
      const defaultSource = currentSources.find(s => s.quality.includes('720')) || currentSources[0];
      setSelectedSource(defaultSource.url);
    }
  }, [currentSources]);

  const currentSource = currentSources.find(s => s.url === selectedSource) || currentSources[0];
  const formatTime = (time: number) => `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;

  const handleDownload = (source: StreamSource) => {
    const link = document.createElement('a');
    link.href = source.url;
    link.download = `${videoId}.${source.container}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Report error when loading fails
  useEffect(() => {
    if (error && !hasReportedError) {
      setHasReportedError(true);
      onError?.();
    }
  }, [error, hasReportedError, onError]);

  // Report error when no streams available
  useEffect(() => {
    if (!isLoading && allStreams.combined.length === 0 && !allStreams.hls && !hasReportedError) {
      setHasReportedError(true);
      onError?.();
    }
  }, [isLoading, allStreams, hasReportedError, onError]);

  if (isLoading) return <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white">{t('loading')}</div>;
  if (error) return <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white">{t('failedToLoad')}</div>;

  return (
    <div className="space-y-4">
      {/* Format Type Selector */}
      <Tabs value={formatTab} onValueChange={setFormatTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="combined" className="flex items-center gap-1 text-xs">
            <Film className="w-3 h-3" />
            <span className="hidden sm:inline">MP4/WebM</span>
            <span className="sm:hidden">Video</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-1 text-xs">
            <Video className="w-3 h-3" />
            <span className="hidden sm:inline">{t('videoOnly')}</span>
            <span className="sm:hidden">V</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-1 text-xs">
            <Music className="w-3 h-3" />
            <span className="hidden sm:inline">{t('audioOnly')}</span>
            <span className="sm:hidden">A</span>
          </TabsTrigger>
          <TabsTrigger value="hls" disabled={!allStreams.hls} className="flex items-center gap-1 text-xs">
            <FileVideo className="w-3 h-3" />
            HLS
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Video Player */}
      {currentSource && (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            key={`${videoKey}-${selectedSource}`}
            ref={videoRef}
            src={currentSource.url}
            className="w-full aspect-video"
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
                onSuccess?.();
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              if (!hasReportedError) {
                setHasReportedError(true);
                onError?.();
              }
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={v => { if (videoRef.current) videoRef.current.currentTime = v[0]; }}
              className="mb-3"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="text-white h-8 w-8" onClick={() => { videoRef.current && (isPlaying ? videoRef.current.pause() : videoRef.current.play()); }}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="text-white h-8 w-8" onClick={() => { if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted); } }}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <div className="w-20 hidden sm:block">
                  <Slider value={[isMuted ? 0 : volume]} max={1} step={0.1} onValueChange={v => { setVolume(v[0]); if (videoRef.current) videoRef.current.volume = v[0]; setIsMuted(v[0] === 0); }} />
                </div>
                <span className="text-white text-xs">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-32 sm:w-40 h-8 bg-transparent text-white border-white/50 text-xs">
                    <SelectValue placeholder={t('selectQuality')} />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSources.map((s, i) => (
                      <SelectItem key={i} value={s.url} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="text-white h-8 w-8" onClick={() => videoRef.current?.requestFullscreen()}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!currentSource && (
        <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white">
          {formatTab === 'hls' ? t('hlsNotAvailable') : t('noStreamsAvailable')}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setVideoKey(p => p + 1); setIsPlaying(false); }}>
          <RefreshCw className="h-4 w-4 mr-1" />{t('reloadVideo')}
        </Button>
        {currentSource && (
          <Button variant="outline" size="sm" onClick={() => handleDownload(currentSource)}>
            <Download className="h-4 w-4 mr-1" />{t('download')} ({currentSource.container.toUpperCase()})
          </Button>
        )}
      </div>

      {/* Download Options */}
      {currentSources.length > 1 && (
        <div className="border rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">{t('downloadOptions')}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {currentSources.slice(0, 8).map((source, i) => (
              <Button key={i} variant="secondary" size="sm" className="text-xs" onClick={() => handleDownload(source)}>
                <Download className="h-3 w-3 mr-1" />
                {source.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvidiousPlayer;
