import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Play } from 'lucide-react';
import Header from '@/components/tube/Header';
import VideoGrid from '@/components/tube/VideoGrid';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrending } from '@/lib/invidious';
import { Button } from '@/components/ui/button';

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    setError('');
    try {
      const videos = await getTrending();
      setTrendingVideos(videos.slice(0, 8));
    } catch (err) {
      console.error('Failed to load trending:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tube/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center max-w-3xl mx-auto slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Play className="w-4 h-4" fill="currentColor" />
                Wista - {language === 'ja' ? '動画を検索・視聴' : 'Search and Watch Videos'}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Wista</span>
                {language === 'ja' ? 'で動画を' : ' - Discover Your'}{' '}
                <span className="text-primary">{language === 'ja' ? '発見' : 'Favorites'}</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {language === 'ja' ? 'Wistaでトレンド動画を探索し、履歴やお気に入りを管理' : 'Explore trending videos with Wista and manage your history and favorites'}
              </p>
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('search')}
                    className="w-full bg-card border-2 border-border rounded-full pl-16 pr-6 py-5 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-all shadow-lg"
                  />
                  <Button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
                    {t('search').replace('...', '')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Trending Section */}
        <section className="container mx-auto px-4 mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{t('trending')}</h2>
          </div>
          {error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadTrending}>{t('retry')}</Button>
            </div>
          ) : (
            <VideoGrid videos={trendingVideos} loading={loading} />
          )}
        </section>
      </main>
    </div>
  );
};

export default HomePage;
