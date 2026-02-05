import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, Home, TrendingUp, History, Heart, Settings, Wrench, Gamepad2, LogOut, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { languages, Language } from '@/lib/i18n';
import { logout } from '@/lib/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tube/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/home', icon: Home, label: t('home') },
    { to: '/tube/trending', icon: TrendingUp, label: t('trending') },
    { to: '/tube/history', icon: History, label: t('history') },
    { to: '/tube/favorites', icon: Heart, label: t('favorites') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">W</span>
          </div>
          <span className="font-bold text-xl hidden sm:block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Wista</span>
        </Link>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search')}
              className="search-input pr-12"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link flex items-center gap-2 ${isActive(item.to) ? 'active' : ''}`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right Menu */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`cursor-pointer ${language === lang.code ? 'text-primary' : ''}`}
                >
                  {lang.nativeName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tools & Games Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border w-48">
              <DropdownMenuItem asChild>
                <Link to="/tools" className="flex items-center gap-2 cursor-pointer">
                  <Wrench className="w-4 h-4" />
                  {t('tools')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/games" className="flex items-center gap-2 cursor-pointer">
                  <Gamepad2 className="w-4 h-4" />
                  {t('games')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/tube/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" />
                  {t('settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive">
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search')}
              className="search-input pr-12 text-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="lg:hidden border-t border-border px-4 py-3 fade-in">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.to) ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
