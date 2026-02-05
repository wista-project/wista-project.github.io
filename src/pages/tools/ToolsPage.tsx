import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, ArrowLeft, Calculator, FileText, Image, Code, Clock, QrCode } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const tools = [
  { id: 'calculator', name: 'Calculator', icon: Calculator, description: '基本的な計算機' },
  { id: 'notes', name: 'Notes', icon: FileText, description: 'メモ帳' },
  { id: 'image-converter', name: 'Image Converter', icon: Image, description: '画像変換ツール' },
  { id: 'code-editor', name: 'Code Editor', icon: Code, description: 'シンプルなコードエディタ' },
  { id: 'timer', name: 'Timer', icon: Clock, description: 'タイマー & ストップウォッチ' },
  { id: 'qr-generator', name: 'QR Generator', icon: QrCode, description: 'QRコード生成' },
];

const ToolsPage: React.FC = () => {
  const { t } = useLanguage();

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
            <Wrench className="w-5 h-5 text-primary" />
            <span className="font-bold text-xl">{t('tools')}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              to={`/tools/${tool.id}`}
              className="glass-card rounded-xl p-6 hover:border-primary/50 transition-all group"
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <tool.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center text-muted-foreground">
          <p>さらにツールを追加予定...</p>
        </div>
      </main>
    </div>
  );
};

export default ToolsPage;
