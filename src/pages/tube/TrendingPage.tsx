import React, { useState, useEffect } from 'react';
import { TrendingUp, Globe } from 'lucide-react';
import Header from '@/components/tube/Header';
import VideoGrid from '@/components/tube/VideoGrid';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrending } from '@/lib/invidious';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const REGIONS = [
  { code: 'JP', name: '日本' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'FR', name: 'France' },
];

const TrendingPage: React.FC = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [region, setRegion] = useState('JP');
  const { t, language } = useLanguage();

  useEffect(() => {
    loadTrending();
  }, [region]);

  const loadTrending = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await getTrending(region);
      setVideos(results);
    } catch (err) {
      console.error('Failed to load trending:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-primary font-medium">Wista Trending</p>
              <h1 className="text-2xl font-bold">{t('trending')}</h1>
              <p className="text-muted-foreground">
                {language === 'ja' ? 'Wistaで人気の動画をチェック' : 'Check out popular videos on Wista'}
              </p>
            </div>
          </div>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <Globe className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {REGIONS.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadTrending}>{t('retry')}</Button>
          </div>
        ) : (
          <VideoGrid videos={videos} loading={loading} />
        )}
      </main>
    </div>
  );
};

export default TrendingPage;
