import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, ArrowLeft, Globe, Monitor, Download, Activity, ListOrdered, Image } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { languages, Language } from '@/lib/i18n';
import { getPreferredQuality, setPreferredQuality, getThumbnailSource, setThumbnailSource, ThumbnailSource } from '@/lib/storage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ApiStatsDashboard from '@/components/tube/ApiStatsDashboard';
import ApiPrioritySettings from '@/components/tube/ApiPrioritySettings';

const QUALITY_OPTIONS = ['Auto', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p'];

const SettingsPage: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [quality, setQuality] = React.useState(getPreferredQuality());
   const [thumbnailSource, setThumbnailSourceState] = React.useState<ThumbnailSource>(getThumbnailSource());

  const handleQualityChange = (value: string) => {
    setQuality(value);
    setPreferredQuality(value);
  };
 
   const handleThumbnailSourceChange = (value: ThumbnailSource) => {
     setThumbnailSourceState(value);
     setThumbnailSource(value);
   };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            to="/home"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <span className="font-bold text-xl">Wista {t('settings')}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Language */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">{t('language')}</h2>
            </div>
            <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
              <SelectTrigger className="w-full bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">{t('quality')}</h2>
            </div>
            <Select value={quality} onValueChange={handleQualityChange}>
              <SelectTrigger className="w-full bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {QUALITY_OPTIONS.map((q) => (
                  <SelectItem key={q} value={q}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              {language === 'ja' ? 'デフォルトの動画品質を選択してください' : 'Select default video quality'}
            </p>
          </div>

           {/* Thumbnail Source */}
           <div className="glass-card rounded-xl p-6">
             <div className="flex items-center gap-3 mb-4">
               <Image className="w-5 h-5 text-primary" />
               <h2 className="font-bold text-lg">
                 {language === 'ja' ? 'サムネイルソース' : 'Thumbnail Source'}
               </h2>
             </div>
             <Select value={thumbnailSource} onValueChange={(val) => handleThumbnailSourceChange(val as ThumbnailSource)}>
               <SelectTrigger className="w-full bg-secondary border-border">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent className="bg-card border-border">
                 <SelectItem value="i.ytimg.com">i.ytimg.com (推奨)</SelectItem>
                 <SelectItem value="img.youtube.com">img.youtube.com</SelectItem>
               </SelectContent>
             </Select>
             <p className="text-sm text-muted-foreground mt-2">
               {language === 'ja' 
                 ? 'YouTubeサムネイル画像の取得元を選択します。'
                 : 'Select the source for YouTube thumbnails.'}
             </p>
           </div>
 
           {/* Download Settings */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">{t('download')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'ja' 
                ? '動画のダウンロードは視聴ページから利用できます。ダウンロードボタンをクリックすると、選択した品質で動画がダウンロードされます。'
                : 'Video downloads are available from the watch page. Click the download button to download the video in your selected quality.'}
            </p>
          </div>

          {/* API Priority Settings */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <ListOrdered className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">
                {language === 'ja' ? 'API優先順位' : 'API Priority'}
              </h2>
            </div>
            <ApiPrioritySettings />
          </div>

          {/* API Stats Dashboard */}
          <div className="glass-card rounded-xl p-6">
            <ApiStatsDashboard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
