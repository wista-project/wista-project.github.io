import React from 'react';
import { History, Trash2 } from 'lucide-react';
import Header from '@/components/tube/Header';
import VideoCard from '@/components/tube/VideoCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { getHistory, clearHistory, HistoryItem } from '@/lib/storage';

const HistoryPage: React.FC = () => {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const { t, language } = useLanguage();

  React.useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <History className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-primary font-medium">Wista</p>
              <h1 className="text-2xl font-bold">{t('history')}</h1>
            <p className="text-muted-foreground">
              {history.length} {language === 'ja' ? '件の視聴履歴' : 'items'}
            </p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('clearHistory')}
            </button>
          )}
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">{t('noHistory')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <VideoCard
                key={`${item.videoId}-${item.timestamp}`}
                videoId={item.videoId}
                title={item.title}
                author={item.author}
                lengthSeconds={item.duration}
                thumbnails={[{ url: item.thumbnail, width: 320, height: 180, quality: 'medium' }]}
                compact
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
