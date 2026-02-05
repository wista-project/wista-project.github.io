import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Film, ArrowLeft, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getVideoDetails } from '@/lib/invidious';

const EmbedPlayerPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (videoId) {
      loadVideo();
    }
  }, [videoId]);

  const loadVideo = async () => {
    if (!videoId) return;
    setLoading(true);
    setError('');
    try {
      const details = await getVideoDetails(videoId);
      setVideo(details);
    } catch (err) {
      console.error('Failed to load video:', err);
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const embedCode = `<iframe width="560" height="315" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 border-b border-border">
        <div className="container mx-auto flex items-center gap-4">
          <Link
            to={videoId ? `/tube/watch/${videoId}` : '/home'}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            <span className="font-medium">埋め込みプレイヤー</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button onClick={loadVideo} className="btn-primary">
              {t('retry')}
            </button>
          </div>
        ) : (
          <>
            {/* Embedded Player */}
            <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Video Info */}
            {video && (
              <div>
                <h1 className="text-xl font-bold">{video.title}</h1>
                <p className="text-muted-foreground">{video.author}</p>
              </div>
            )}

            {/* Embed Code */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">埋め込みコード</h2>
                <button
                  onClick={copyEmbedCode}
                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      コピー
                    </>
                  )}
                </button>
              </div>
              <code className="block p-3 bg-muted rounded-lg text-sm text-muted-foreground overflow-x-auto">
                {embedCode}
              </code>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default EmbedPlayerPage;
