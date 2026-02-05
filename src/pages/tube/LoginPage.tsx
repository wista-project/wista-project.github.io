import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { setAuthenticated } from '@/lib/storage';

const PASSWORD = 'wista-pass'; // Simple password protection

const LoginPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate a small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === PASSWORD) {
      setAuthenticated(true);
      navigate('/home');
    } else {
      setError(t('incorrectPassword'));
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects - Purple gradient with animated orbs */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-primary/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />

      <div className="relative w-full max-w-md slide-up">
        {/* Logo - Icon + Text */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-accent to-primary mb-6 pulse-glow shadow-2xl">
            <Play className="w-12 h-12 text-primary-foreground fill-current" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Wista
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">{t('enterToAccess')}</p>
        </div>

        {/* Login Form - Glass morphism */}
        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 space-y-6">
          <div className="space-y-3">
            <label htmlFor="password" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t('password')}
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enterPassword')}
                className="w-full bg-secondary/50 border-2 border-border/50 rounded-2xl pl-12 pr-12 py-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-secondary/70 focus:outline-none transition-all backdrop-blur-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm text-center fade-in bg-destructive/10 rounded-xl py-3 px-4 border border-destructive/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg py-4 rounded-2xl"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                {t('login')}
              </>
            )}
          </button>

          {/* Decorative element */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="h-1 w-1 rounded-full bg-primary/50" />
            <div className="h-1 w-2 rounded-full bg-primary/70" />
            <div className="h-1 w-1 rounded-full bg-primary/50" />
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
