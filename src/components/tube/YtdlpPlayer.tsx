import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { getYtdlpStreams, YtdlpStream } from '@/lib/ytdlp';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Volume2, VolumeX, Maximize, Download, RefreshCw, AlertCircle, Radio, Film, Music, PictureInPicture2, Repeat, RectangleHorizontal, Keyboard } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import NoCookiePlayer from './NoCookiePlayer';
import EduPlayer from './EduPlayer';

const keyboardShortcuts = [
  { keys: ['Space', 'K'], description: '再生 / 一時停止' },
  { keys: ['←', 'J'], description: '5秒戻る (Shift: 10秒)' },
  { keys: ['→', 'L'], description: '5秒進む (Shift: 10秒)' },
  { keys: ['↑'], description: '音量を上げる' },
  { keys: ['↓'], description: '音量を下げる' },
  { keys: ['M'], description: 'ミュート切替' },
  { keys: ['F'], description: 'フルスクリーン' },
  { keys: ['T'], description: 'シアターモード' },
  { keys: ['P'], description: 'ピクチャーインピクチャー' },
  { keys: ['0-9'], description: '動画の0-90%位置にジャンプ' },
  { keys: [','], description: '1フレーム戻る' },
  { keys: ['.'], description: '1フレーム進む' },
  { keys: ['<'], description: '再生速度を下げる' },
  { keys: ['>'], description: '再生速度を上げる' },
  { keys: ['?'], description: 'ショートカットヘルプ' },
];

interface YtdlpPlayerProps {
  videoId: string;
  isTheaterMode?: boolean;
  onTheaterModeToggle?: () => void;
  onError?: () => void;
  onSuccess?: () => void;
}

const YtdlpPlayer: React.FC<YtdlpPlayerProps> = ({ videoId, isTheaterMode = false, onTheaterModeToggle, onError, onSuccess }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [videoKey, setVideoKey] = useState(0);
  const [fallbackMode, setFallbackMode] = useState<'none' | 'nocookie' | 'edu'>('none');
  const [hlsLevels, setHlsLevels] = useState<{ height: number; bitrate: number }[]>([]);
  const [currentHlsLevel, setCurrentHlsLevel] = useState<number>(-1);
  const [dashQualities, setDashQualities] = useState<{ qualityIndex: number; height: number; bitrate: number }[]>([]);
  const [currentDashQuality, setCurrentDashQuality] = useState<number>(-1);
  const [isPiP, setIsPiP] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoop, setIsLoop] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const { data: ytdlpResult, isLoading, error, refetch } = useQuery({
    queryKey: ['ytdlpStreams', videoId],
    queryFn: () => getYtdlpStreams(videoId),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const streams = ytdlpResult?.streams || [];
  const currentStream = streams.find(s => s.url === selectedStream) || streams[0];
  const isHlsStream = currentStream?.isHLS || currentStream?.container === 'm3u8';
  const isDashStream = currentStream?.isDASH || currentStream?.container === 'mpd';
  const isLive = ytdlpResult?.isLive || currentStream?.isLive;

  // Cleanup function for both HLS and DASH
  const cleanupPlayers = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.destroy();
      dashRef.current = null;
    }
    setHlsLevels([]);
    setDashQualities([]);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (isPlaying) {
            video.pause();
          } else {
            video.play();
          }
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - (e.shiftKey ? 10 : 5));
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          video.currentTime = Math.min(duration, video.currentTime + (e.shiftKey ? 10 : 5));
          break;
        case 'arrowup':
          e.preventDefault();
          const newVolUp = Math.min(1, volume + 0.1);
          setVolume(newVolUp);
          video.volume = newVolUp;
          setIsMuted(false);
          video.muted = false;
          break;
        case 'arrowdown':
          e.preventDefault();
          const newVolDown = Math.max(0, volume - 0.1);
          setVolume(newVolDown);
          video.volume = newVolDown;
          if (newVolDown === 0) setIsMuted(true);
          break;
        case 'm':
          e.preventDefault();
          video.muted = !isMuted;
          setIsMuted(!isMuted);
          break;
        case 'f':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            video.requestFullscreen?.();
          }
          break;
        case 't':
          e.preventDefault();
          onTheaterModeToggle?.();
          break;
        case 'p':
          e.preventDefault();
          if (document.pictureInPictureEnabled) {
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture();
            } else {
              video.requestPictureInPicture?.();
            }
          }
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 10;
          video.currentTime = (duration * percent) / 100;
          break;
        case ',':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - (1 / 30));
          break;
        case '.':
          e.preventDefault();
          video.currentTime = Math.min(duration, video.currentTime + (1 / 30));
          break;
        case '<':
          e.preventDefault();
          const slowerRate = Math.max(0.25, playbackRate - 0.25);
          setPlaybackRate(slowerRate);
          video.playbackRate = slowerRate;
          break;
        case '>':
          e.preventDefault();
          const fasterRate = Math.min(2, playbackRate + 0.25);
          setPlaybackRate(fasterRate);
          video.playbackRate = fasterRate;
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume, duration, playbackRate, onTheaterModeToggle]);

  // PiP event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoKey]);

  // Initialize HLS.js for HLS streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentStream || !isHlsStream) return;

    cleanupPlayers();

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 0 : 90,
      });

      hls.loadSource(currentStream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setHlsLevels(data.levels.map(l => ({ height: l.height, bitrate: l.bitrate })));
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentHlsLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setFallbackMode('nocookie');
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = currentStream.url;
      video.play().catch(() => {});
    }

    return cleanupPlayers;
  }, [currentStream?.url, isHlsStream, isLive, videoKey]);

  // Initialize dash.js for DASH streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentStream || !isDashStream) return;

    cleanupPlayers();

    const player = dashjs.MediaPlayer().create();
    player.initialize(video, currentStream.url, true);

    player.updateSettings({
      streaming: {
        delay: {
          liveDelay: isLive ? 3 : undefined,
        },
        abr: {
          autoSwitchBitrate: { video: true, audio: true },
        },
      },
    });

    player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
      const representations = player.getRepresentationsByType('video');
      setDashQualities(representations.map((rep, idx) => ({
        qualityIndex: idx,
        height: rep.height || 0,
        bitrate: rep.bandwidth || 0,
      })));
    });

    player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (e: any) => {
      if (e.mediaType === 'video') {
        setCurrentDashQuality(e.newQuality);
      }
    });

    player.on(dashjs.MediaPlayer.events.ERROR, () => {
      setFallbackMode('nocookie');
    });

    dashRef.current = player;

    return cleanupPlayers;
  }, [currentStream?.url, isDashStream, isLive, videoKey]);

  useEffect(() => {
    if (streams.length > 0 && !selectedStream) {
      // Prefer HLS for live streams
      const hlsStream = streams.find(s => s.isHLS);
      const defaultStream = isLive && hlsStream ? hlsStream : streams[0];
      setSelectedStream(defaultStream.url);
    }
  }, [streams, selectedStream, isLive]);

  // Auto-fallback when ytdlp fails - also notify parent
  useEffect(() => {
    if (!isLoading && (!ytdlpResult?.success || streams.length === 0)) {
      setFallbackMode('nocookie');
      onError?.();
    }
  }, [isLoading, ytdlpResult, streams.length, onError]);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '--:--';
    return `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
  };

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentHlsLevel(level);
    }
  };

  const handleDashQualityChange = (qualityIndex: number) => {
    if (dashRef.current) {
      if (qualityIndex === -1) {
        dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
      } else {
        dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
        dashRef.current.setRepresentationForTypeByIndex('video', qualityIndex);
      }
      setCurrentDashQuality(qualityIndex);
    }
  };

  const handleDownload = () => {
    if (currentStream && !isHlsStream && !isDashStream) {
      const link = document.createElement('a');
      link.href = currentStream.url;
      link.download = `${videoId}.${currentStream.container}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Show fallback player if ytdlp failed
  if (fallbackMode !== 'none') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <span className="text-yellow-600 dark:text-yellow-400">
            {t('ytdlpFailed')}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto"
            onClick={() => { setFallbackMode('none'); refetch(); }}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('retry')}
          </Button>
        </div>
        
        <div className="flex gap-2 mb-2">
          <Button 
            variant={fallbackMode === 'nocookie' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFallbackMode('nocookie')}
          >
            No-Cookie
          </Button>
          <Button 
            variant={fallbackMode === 'edu' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFallbackMode('edu')}
          >
            Education
          </Button>
        </div>

        {fallbackMode === 'nocookie' && <NoCookiePlayer videoId={videoId} />}
        {fallbackMode === 'edu' && <EduPlayer videoId={videoId} />}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-white gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
        <span className="text-sm">{t('ytdlpFetching')}</span>
      </div>
    );
  }

  if (!currentStream) {
    return (
      <div className="aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-white gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span>{t('failedToLoad')}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('retry')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setFallbackMode('nocookie')}>
            {t('useEmbedPlayer')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="animate-pulse">
            <Radio className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
          <span className="text-sm text-muted-foreground">{t('liveStream')}</span>
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          key={`${videoKey}-${selectedStream}`}
          ref={videoRef}
          src={!isHlsStream && !isDashStream ? currentStream.url : undefined}
          className="w-full aspect-video"
          loop={isLoop}
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
            if (!isHlsStream && !isDashStream) {
              setFallbackMode('nocookie');
              onError?.();
            }
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress bar (hide for live) */}
          {!isLive && (
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={v => { if (videoRef.current) videoRef.current.currentTime = v[0]; }}
              className="mb-3"
            />
          )}
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
              <span className="text-white text-xs">
                {isLive ? 'LIVE' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* HLS Quality selector */}
              {isHlsStream && hlsLevels.length > 0 && (
                <Select 
                  value={currentHlsLevel.toString()} 
                  onValueChange={(v) => handleQualityChange(parseInt(v))}
                >
                  <SelectTrigger className="w-24 h-8 bg-transparent text-white border-white/50 text-xs">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1" className="text-xs">Auto</SelectItem>
                    {hlsLevels.map((level, i) => (
                      <SelectItem key={i} value={i.toString()} className="text-xs">
                        {level.height}p
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* DASH Quality selector */}
              {isDashStream && dashQualities.length > 0 && (
                <Select 
                  value={currentDashQuality.toString()} 
                  onValueChange={(v) => handleDashQualityChange(parseInt(v))}
                >
                  <SelectTrigger className="w-24 h-8 bg-transparent text-white border-white/50 text-xs">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1" className="text-xs">Auto</SelectItem>
                    {dashQualities.map((q) => (
                      <SelectItem key={q.qualityIndex} value={q.qualityIndex.toString()} className="text-xs">
                        {q.height}p
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Stream selector */}
              {streams.length > 1 && (
                <Select value={selectedStream} onValueChange={setSelectedStream}>
                  <SelectTrigger className="w-28 h-8 bg-transparent text-white border-white/50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
              {streams.map((s, i) => (
                      <SelectItem key={i} value={s.url} className="text-xs">
                        {s.isHLS && <Radio className="h-3 w-3 inline mr-1" />}
                        {s.isDASH && <Film className="h-3 w-3 inline mr-1" />}
                        {s.quality} ({s.container.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Playback speed selector */}
              <Select 
                value={playbackRate.toString()} 
                onValueChange={(v) => {
                  const rate = parseFloat(v);
                  setPlaybackRate(rate);
                  if (videoRef.current) videoRef.current.playbackRate = rate;
                }}
              >
                <SelectTrigger className="w-16 h-8 bg-transparent text-white border-white/50 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {playbackRates.map((rate) => (
                    <SelectItem key={rate} value={rate.toString()} className="text-xs">
                      {rate}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Loop toggle */}
              <Button 
                size="icon" 
                variant="ghost" 
                className={`text-white h-8 w-8 ${isLoop ? 'bg-white/20' : ''}`}
                onClick={() => setIsLoop(!isLoop)}
              >
                <Repeat className="h-4 w-4" />
              </Button>

              {/* Theater mode toggle */}
              {onTheaterModeToggle && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={`text-white h-8 w-8 ${isTheaterMode ? 'bg-white/20' : ''}`}
                  onClick={onTheaterModeToggle}
                >
                  <RectangleHorizontal className="h-4 w-4" />
                </Button>
              )}

              {document.pictureInPictureEnabled && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={`text-white h-8 w-8 ${isPiP ? 'bg-white/20' : ''}`}
                  onClick={async () => {
                    try {
                      if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                        setIsPiP(false);
                      } else if (videoRef.current) {
                        await videoRef.current.requestPictureInPicture();
                        setIsPiP(true);
                      }
                    } catch (e) {
                      console.error('PiP error:', e);
                    }
                  }}
                >
                  <PictureInPicture2 className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="text-white h-8 w-8" onClick={() => videoRef.current?.requestFullscreen()}>
                <Maximize className="h-4 w-4" />
              </Button>

              {/* Keyboard shortcuts help */}
              <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-white h-8 w-8">
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>キーボードショートカット</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-2 mt-4">
                    {keyboardShortcuts.map((shortcut, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, j) => (
                            <kbd key={j} className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setVideoKey(p => p + 1); setIsPlaying(false); }}>
          <RefreshCw className="h-4 w-4 mr-1" />{t('reloadVideo')}
        </Button>
        {!isHlsStream && !isDashStream && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />{t('download')}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setFallbackMode('nocookie')}>
          {t('useEmbedPlayer')}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground p-2 bg-muted rounded flex items-center gap-2 flex-wrap">
        <span>ytdlp:</span>
        {isHlsStream && <Badge variant="outline" className="text-xs"><Radio className="h-3 w-3 mr-1" />HLS</Badge>}
        {isDashStream && <Badge variant="outline" className="text-xs"><Film className="h-3 w-3 mr-1" />DASH</Badge>}
        {isLive && <Badge variant="destructive" className="text-xs">LIVE</Badge>}
        <span>{currentStream.quality}</span>
        <span>•</span>
        <span>{currentStream.container.toUpperCase()}</span>
        <span>•</span>
        <span>{currentStream.hasAudio ? '🔊' : '🔇'}</span>
        <span>{currentStream.hasVideo ? '🎬' : ''}</span>
        {isHlsStream && currentHlsLevel >= 0 && hlsLevels[currentHlsLevel] && (
          <>
            <span>•</span>
            <span>{hlsLevels[currentHlsLevel].height}p</span>
          </>
        )}
        {isDashStream && currentDashQuality >= 0 && dashQualities[currentDashQuality] && (
          <>
            <span>•</span>
            <span>{dashQualities[currentDashQuality].height}p</span>
          </>
        )}
      </div>
    </div>
  );
};

export default YtdlpPlayer;
