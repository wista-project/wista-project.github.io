import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  EDU_SOURCES, 
  EduSource,
  fetchParameterFromSource, 
  buildEduEmbedUrl, 
  buildNoCookieEmbedUrl,
  convertToSeconds 
} from '@/lib/eduParams';
import { RefreshCw, Play, Repeat, Settings2, ExternalLink } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EduPlayerProps { 
  videoId: string;
  listId?: string;
  onError?: () => void;
  onSuccess?: () => void;
}

const EduPlayer: React.FC<EduPlayerProps> = ({ videoId, listId, onError, onSuccess }) => {
  const { t } = useLanguage();
  const [selectedSourceId, setSelectedSourceId] = useState<string>(() => {
    return localStorage.getItem('eduPlayerSource') || 'nocookie';
  });
  const [parameter, setParameter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  
  // Playback options
  const [autoplay, setAutoplay] = useState(true);
  const [loop, setLoop] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedSource = EDU_SOURCES.find(s => s.id === selectedSourceId) || EDU_SOURCES[0];

  // Fetch parameter when source changes
  useEffect(() => {
    const fetchParam = async () => {
      if (selectedSource.category === 'nocookie') {
        setParameter('');
        return;
      }
      
      setLoading(true);
      try {
        const param = await fetchParameterFromSource(selectedSource);
        setParameter(param);
      } catch (error) {
        console.error('Failed to fetch parameter:', error);
        setParameter('');
      } finally {
        setLoading(false);
      }
    };

    fetchParam();
  }, [selectedSource]);

  // Save selected source to localStorage
  useEffect(() => {
    localStorage.setItem('eduPlayerSource', selectedSourceId);
  }, [selectedSourceId]);

  // Build embed URL
  const getEmbedUrl = useCallback(() => {
    const options = {
      autoplay,
      loop,
      start: convertToSeconds(startTime) ?? undefined,
      end: convertToSeconds(endTime) ?? undefined,
      listId,
    };

    if (selectedSource.category === 'nocookie') {
      return buildNoCookieEmbedUrl(videoId, options);
    }

    return buildEduEmbedUrl(videoId, parameter, options);
  }, [videoId, selectedSource, parameter, autoplay, loop, startTime, endTime, listId]);

  const handleReload = useCallback(() => setIframeKey((prev) => prev + 1), []);
  
  const handlePlay = useCallback(() => {
    setLoop(false);
    setIframeKey((prev) => prev + 1);
  }, []);

  const handleLoopPlay = useCallback(() => {
    setLoop(true);
    setIframeKey((prev) => prev + 1);
  }, []);

  const educationSources = EDU_SOURCES.filter(s => s.category === 'education');
  const nocookieSources = EDU_SOURCES.filter(s => s.category === 'nocookie');

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mr-2" />
            {t('loading')}
          </div>
        ) : (
          <iframe 
            key={iframeKey} 
            src={getEmbedUrl()} 
            className="w-full h-full" 
            allowFullScreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => onSuccess?.()}
          />
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Source Selector */}
          <div className="space-y-2">
            <Label>{t('selectSource') || '再生方法を選択'}</Label>
            <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="再生方法を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>埋め込み再生</SelectLabel>
                  {nocookieSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Education埋め込み</SelectLabel>
                  {educationSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Play Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePlay} className="flex-1 min-w-[120px]">
              <Play className="h-4 w-4 mr-1" />
              {t('play') || '再生'}
            </Button>
            <Button onClick={handleLoopPlay} variant="secondary" className="flex-1 min-w-[120px]">
              <Repeat className="h-4 w-4 mr-1" />
              {t('loopPlay') || 'ループ再生'}
            </Button>
            <Button variant="outline" onClick={handleReload}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  {t('advancedOptions') || '詳細オプション'}
                </span>
                <span className="text-muted-foreground text-xs">
                  {showAdvanced ? '▲' : '▼'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Time Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">{t('startPosition') || '開始位置'}</Label>
                  <Input
                    id="startTime"
                    placeholder="例: 1:30, 90"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">{t('endPosition') || '終了位置'}</Label>
                  <Input
                    id="endTime"
                    placeholder="例: 2:00, 120"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoplay"
                    checked={autoplay}
                    onCheckedChange={setAutoplay}
                  />
                  <Label htmlFor="autoplay">{t('autoplay') || '自動再生'}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="loop"
                    checked={loop}
                    onCheckedChange={setLoop}
                  />
                  <Label htmlFor="loop">{t('loop') || 'ループ'}</Label>
                </div>
              </div>

              {/* Current Parameter Info */}
              {selectedSource.category === 'education' && (
                <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  <p className="font-medium mb-1">{t('currentParameter') || '現在のパラメーター'}:</p>
                  <p className="break-all font-mono">
                    {parameter ? parameter.substring(0, 100) + (parameter.length > 100 ? '...' : '') : '(なし)'}
                  </p>
                  {selectedSource.url && (
                    <a 
                      href={selectedSource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      ソースを見る
                    </a>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Current Source Badge */}
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {selectedSource.category === 'education' ? '🎓' : '🔒'} {selectedSource.name}
            </span>
            {loop && <span className="text-primary">🔁 ループ中</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EduPlayer;
