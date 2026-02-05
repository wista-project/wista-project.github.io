import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import Header from '@/components/tube/Header';
import VideoGrid from '@/components/tube/VideoGrid';
import { useLanguage } from '@/contexts/LanguageContext';
import { searchVideos } from '@/lib/invidious';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t, language } = useLanguage();

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await searchVideos(query);
      setVideos(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 container mx-auto px-4">
        {/* Search Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-primary/10">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-primary font-medium">Wista Search</p>
            <h1 className="text-2xl font-bold">
              {query ? `"${query}" ${language === 'ja' ? 'の検索結果' : 'results'}` : t('search')}
            </h1>
            {videos.length > 0 && (
              <p className="text-muted-foreground">
                {videos.length} {language === 'ja' ? '件の動画が見つかりました' : 'videos found'}
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button onClick={performSearch} className="btn-primary">
              {t('retry')}
            </button>
          </div>
        ) : videos.length === 0 && !loading ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">{t('noResults')}</p>
          </div>
        ) : (
          <VideoGrid videos={videos} loading={loading} />
        )}
      </main>
    </div>
  );
};

export default SearchPage;
