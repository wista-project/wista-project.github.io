import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ArrowLeft, Puzzle, Target, Dices, Grid3X3, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const games = [
  { id: 'puzzle', name: 'Puzzle', icon: Puzzle, description: 'パズルゲーム' },
  { id: 'shooter', name: 'Target Practice', icon: Target, description: 'ターゲット練習' },
  { id: 'dice', name: 'Dice Roller', icon: Dices, description: 'サイコロゲーム' },
  { id: 'memory', name: 'Memory Game', icon: Grid3X3, description: '神経衰弱' },
  { id: 'reaction', name: 'Reaction Time', icon: Zap, description: '反射神経テスト' },
];

const GamesPage: React.FC = () => {
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
            <Gamepad2 className="w-5 h-5 text-primary" />
            <span className="font-bold text-xl">{t('games')}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Link
              key={game.id}
              to={`/games/${game.id}`}
              className="glass-card rounded-xl p-6 hover:border-primary/50 transition-all group"
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <game.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-1">{game.name}</h3>
              <p className="text-sm text-muted-foreground">{game.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center text-muted-foreground">
          <p>さらにゲームを追加予定...</p>
        </div>
      </main>
    </div>
  );
};

export default GamesPage;
