import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Share2, Radio, Music, Film, MonitorPlay, Cookie, GraduationCap, Terminal, RectangleHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import Header from '@/components/tube/Header';
import VideoGrid from '@/components/tube/VideoGrid';
import Comments from '@/components/tube/Comments';
import InvidiousPlayer from '@/components/tube/InvidiousPlayer';
import NoCookiePlayer from '@/components/tube/NoCookiePlayer';
import EduPlayer from '@/components/tube/EduPlayer';
import YtdlpPlayer from '@/components/tube/YtdlpPlayer';
import { useLanguage } from '@/contexts/LanguageContext';
import { getVideoDetails, getThumbnailUrl, formatViewCount, searchVideos } from '@/lib/invidious';
import { addToHistory, addToFavorites, removeFromFavorites, isFavorite } from '@/lib/storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { usePlayerFallback, PlayerType } from '@/hooks/usePlayerFallback';
import { Badge } from '@/components/ui/badge';
import { buildNoCookieEmbedUrl } from '@/lib/eduParams';

const WatchPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<any>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [embedReady, setEmbedReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [error, setError] = useState('');
  const [isFav, setIsFav] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const { t } = useLanguage();
  
  // Auto-fallback player hook
  // デフォルトで edu を使用（即座に埋め込み再生開始）
  const {
    currentPlayer,
    failedPlayers,
    isAutoFallback,
    allPlayersFailed,
    handlePlayerError,
    handlePlayerSuccess,
    switchPlayer,
    resetAllPlayers,
  } = usePlayerFallback('edu');

  // Error handlers for each player
  const handleYtdlpError = useCallback(() => {
    handlePlayerError('ytdlp', 'Stream fetch failed');
  }, [handlePlayerError]);

  const handleInvidiousError = useCallback(() => {
    handlePlayerError('invidious', 'Stream fetch failed');
  }, [handlePlayerError]);

  const handleNoCookieError = useCallback(() => {
    handlePlayerError('nocookie', 'Embed load failed');
  }, [handlePlayerError]);

  const handleEduError = useCallback(() => {
    handlePlayerError('edu', 'Embed load failed');
  }, [handlePlayerError]);

  // Success handlers
  const handleYtdlpSuccess = useCallback(() => {
    handlePlayerSuccess('ytdlp');
  }, [handlePlayerSuccess]);

  const handleInvidiousSuccess = useCallback(() => {
    handlePlayerSuccess('invidious');
  }, [handlePlayerSuccess]);

  const handleNoCookieSuccess = useCallback(() => {
    handlePlayerSuccess('nocookie');
  }, [handlePlayerSuccess]);

  const handleEduSuccess = useCallback(() => {
    handlePlayerSuccess('edu');
    setEmbedReady(true);
  }, [handlePlayerSuccess]);

  useEffect(() => {
    if (videoId) {
      // 即座にページを表示（埋め込みプレイヤーはvideoIdだけで動作する）
      setEmbedReady(false);
      setStreamReady(false);
      setIsFav(isFavorite(videoId));
      // バックグラウンドで動画詳細を取得
      loadVideoInBackground();
    }
  }, [videoId]);

  // バックグラウンドで動画詳細を取得（UIはブロックしない）
  const loadVideoInBackground = async () => {
    if (!videoId) return;
    setError('');
    
    // Create a fallback video object immediately so the player can work
    const fallbackVideo = {
      videoId,
      title: `Video: ${videoId}`,
      author: 'Unknown',
      authorId: '',
      description: '',
      viewCount: 0,
      lengthSeconds: 0,
      published: Date.now(),
      publishedText: '',
      videoThumbnails: [
        { url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, width: 1280, height: 720, quality: 'maxres' },
        { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, width: 480, height: 360, quality: 'high' },
      ],
      adaptiveFormats: [],
      formatStreams: [],
    };
    
    // 即座にフォールバック動画を設定（プレイヤーはすぐ表示される）
    setVideo(fallbackVideo);
    
    try {
      const details = await getVideoDetails(videoId);
      setVideo(details);
      setStreamReady(true);
      addToHistory({
        videoId,
        title: details.title,
        author: details.author,
        thumbnail: getThumbnailUrl(details.videoThumbnails),
        timestamp: Date.now(),
        duration: details.lengthSeconds,
      });
      try {
        const related = await searchVideos(details.title.split(' ').slice(0, 3).join(' '));
        setRelatedVideos(related.filter(v => v.videoId !== videoId).slice(0, 10));
      } catch {}
    } catch (err) {
      console.error('Failed to load video details, using fallback:', err);
      // Use fallback video data - player will still work
      addToHistory({
        videoId,
        title: fallbackVideo.title,
        author: fallbackVideo.author,
        thumbnail: fallbackVideo.videoThumbnails[0]?.url || '',
        timestamp: Date.now(),
        duration: 0,
      });
      // Don't set error - the player can still work
    }
  };

  const toggleFavorite = () => {
    if (!video || !videoId) return;
    if (isFav) {
      removeFromFavorites(videoId);
    } else {
      addToFavorites({
        videoId,
        title: video.title,
        author: video.author,
        thumbnail: getThumbnailUrl(video.videoThumbnails),
        timestamp: Date.now(),
        duration: video.lengthSeconds,
      });
    }
    setIsFav(!isFav);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: video?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (error && !video) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12 container mx-auto px-4 text-center">
          <p className="text-muted-foreground mb-4">{error || t('error')}</p>
          <Button onClick={loadVideoInBackground}>{t('retry')}</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 container mx-auto px-4">
        <div className={`grid gap-8 ${isTheaterMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          <div className={`space-y-6 ${isTheaterMode ? 'max-w-6xl mx-auto w-full' : 'lg:col-span-2'}`}>
            {/* Auto-fallback notification */}
            {isAutoFallback && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                <span className="text-yellow-600 dark:text-yellow-400">
                  {t('autoSwitchedPlayer') || '自動的に別のプレイヤーに切り替えました'}
                </span>
                {failedPlayers.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {failedPlayers.join(', ')} {t('failed') || '失敗'}
                  </Badge>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={resetAllPlayers}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t('retry') || 'リトライ'}
                </Button>
              </div>
            )}

            {/* All players failed notification */}
            {allPlayersFailed && (
              <div className="flex flex-col items-center gap-4 p-6 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-center text-destructive">
                  {t('allPlayersFailed') || 'すべてのプレイヤーが失敗しました'}
                </p>
                <Button onClick={resetAllPlayers}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t('tryAgain') || 'もう一度試す'}
                </Button>
              </div>
            )}

            {/* Theater Mode Toggle & Player Type Selector */}
            <div className="flex items-center justify-between gap-4">
              <Tabs value={currentPlayer} onValueChange={(v) => switchPlayer(v as PlayerType)} className="flex-1">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger 
                    value="edu" 
                    className={`flex items-center gap-1 text-xs ${failedPlayers.includes('edu') ? 'opacity-50' : ''}`}
                  >
                    <GraduationCap className="w-3 h-3" />
                    <span className="hidden sm:inline">{t('eduEmbed')}</span>
                    <span className="sm:hidden">Edu</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ytdlp" 
                    className={`flex items-center gap-1 text-xs ${failedPlayers.includes('ytdlp') ? 'opacity-50' : ''}`}
                  >
                    <Terminal className="w-3 h-3" />
                    <span className="hidden sm:inline">{t('ytdlpStream')}</span>
                    <span className="sm:hidden">ytdlp</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="invidious" 
                    className={`flex items-center gap-1 text-xs ${failedPlayers.includes('invidious') ? 'opacity-50' : ''}`}
                  >
                    <MonitorPlay className="w-3 h-3" />
                    <span className="hidden sm:inline">{t('invidiousStream')}</span>
                    <span className="sm:hidden">Inv</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="nocookie" 
                    className={`flex items-center gap-1 text-xs ${failedPlayers.includes('nocookie') ? 'opacity-50' : ''}`}
                  >
                    <Cookie className="w-3 h-3" />
                    <span className="hidden sm:inline">{t('noCookieEmbed')}</span>
                    <span className="sm:hidden">NC</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant={isTheaterMode ? 'default' : 'outline'}
                size="icon"
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                title={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
              >
                <RectangleHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Player - only show if not all players failed */}
            {!allPlayersFailed && (
              <>
                {currentPlayer === 'edu' && (
                  <EduPlayer 
                    videoId={videoId!} 
                    onError={handleEduError}
                    onSuccess={handleEduSuccess}
                  />
                )}
                {currentPlayer === 'ytdlp' && (
                  <YtdlpPlayer 
                    videoId={videoId!} 
                    isTheaterMode={isTheaterMode}
                    onTheaterModeToggle={() => setIsTheaterMode(!isTheaterMode)}
                    onError={handleYtdlpError}
                    onSuccess={handleYtdlpSuccess}
                  />
                )}
                {currentPlayer === 'invidious' && (
                  <InvidiousPlayer 
                    videoId={videoId!} 
                    onError={handleInvidiousError}
                    onSuccess={handleInvidiousSuccess}
                  />
                )}
                {currentPlayer === 'nocookie' && (
                  <NoCookiePlayer 
                    videoId={videoId!} 
                    onError={handleNoCookieError}
                    onSuccess={handleNoCookieSuccess}
                  />
                )}
              </>
            )}

            {/* Video Info */}
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">{video?.title || `Video: ${videoId}`}</h1>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{video?.author || 'Loading...'}</p>
                  <p className="text-sm text-muted-foreground">
                    {video?.viewCount ? `${formatViewCount(video.viewCount)} ${t('views')}` : ''} 
                    {video?.publishedText ? ` • ${video.publishedText}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isFav ? 'default' : 'secondary'}
                    onClick={toggleFavorite}
                    className="flex items-center gap-2"
                  >
                    <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                    {isFav ? t('removeFromFavorites') : t('addToFavorites')}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Other Player Links */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {video?.hlsUrl && (
                  <Button variant="outline" asChild>
                    <a href={`/tube/hls/${videoId}`}>
                      <Radio className="w-4 h-4 mr-2" />
                      {t('hls')}
                    </a>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <a href={`/tube/audio/${videoId}`}>
                    <Music className="w-4 h-4 mr-2" />
                    {t('audio')}
                  </a>
                </Button>
              </div>

              {/* Description */}
              {video?.description && (
                <div className="bg-muted rounded-xl p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                    {video.description}
                  </p>
                </div>
              )}

              {/* Comments */}
              <Comments videoId={videoId!} />
            </div>
          </div>

          {/* Sidebar - Related Videos */}
          {!isTheaterMode && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{t('home')}</h2>
              <VideoGrid videos={relatedVideos} compact />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WatchPage;
