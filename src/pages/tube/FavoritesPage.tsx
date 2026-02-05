import React from 'react';
import { Heart } from 'lucide-react';
import Header from '@/components/tube/Header';
import VideoCard from '@/components/tube/VideoCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFavorites, FavoriteItem } from '@/lib/storage';

const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);
  const { t, language } = useLanguage();

  React.useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-primary/10">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-primary font-medium">Wista</p>
            <h1 className="text-2xl font-bold">{t('favorites')}</h1>
            <p className="text-muted-foreground">
              {favorites.length} {language === 'ja' ? '件のお気に入り' : 'favorites'}
            </p>
          </div>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">{t('noFavorites')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((item) => (
              <VideoCard
                key={item.videoId}
                videoId={item.videoId}
                title={item.title}
                author={item.author}
                lengthSeconds={item.duration}
                thumbnails={[{ url: item.thumbnail, width: 320, height: 180, quality: 'medium' }]}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default FavoritesPage;
