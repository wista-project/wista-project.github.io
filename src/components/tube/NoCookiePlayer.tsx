import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildNoCookieEmbedUrl } from '@/lib/eduParams';
import { RefreshCw } from 'lucide-react';

interface NoCookiePlayerProps {
  videoId: string;
  onError?: () => void;
  onSuccess?: () => void;
}

const NoCookiePlayer: React.FC<NoCookiePlayerProps> = ({ videoId, onError, onSuccess }) => {
  const { t } = useLanguage();
  const [iframeKey, setIframeKey] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const handleReload = useCallback(() => {
    setIframeKey((prev) => prev + 1);
    setHasLoaded(false);
  }, []);
  
  const handleIframeLoad = useCallback(() => {
    setHasLoaded(true);
    onSuccess?.();
  }, [onSuccess]);

  return (
    <div className="space-y-4">
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <iframe 
          key={iframeKey} 
          src={buildNoCookieEmbedUrl(videoId)} 
          className="w-full h-full" 
          allowFullScreen 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={handleIframeLoad}
        />
      </div>
      <Button variant="outline" onClick={handleReload}><RefreshCw className="h-4 w-4 mr-1" />{t('reloadVideo')}</Button>
    </div>
  );
};

export default NoCookiePlayer;
