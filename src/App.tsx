import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import LoginPage from "@/pages/tube/LoginPage";
import HomePage from "@/pages/tube/HomePage";
import SearchPage from "@/pages/tube/SearchPage";
import TrendingPage from "@/pages/tube/TrendingPage";
import HistoryPage from "@/pages/tube/HistoryPage";
import FavoritesPage from "@/pages/tube/FavoritesPage";
import WatchPage from "@/pages/tube/WatchPage";
import HLSPlayerPage from "@/pages/tube/HLSPlayerPage";
import AudioPlayerPage from "@/pages/tube/AudioPlayerPage";
import SettingsPage from "@/pages/tube/SettingsPage";
import ToolsPage from "@/pages/tools/ToolsPage";
import GamesPage from "@/pages/games/GamesPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<HomePage />} />
              
              {/* Tube Routes */}
              <Route path="/tube/search" element={<SearchPage />} />
              <Route path="/tube/trending" element={<TrendingPage />} />
              <Route path="/trending" element={<Navigate to="/tube/trending" replace />} />
              <Route path="/tube/history" element={<HistoryPage />} />
              <Route path="/history" element={<Navigate to="/tube/history" replace />} />
              <Route path="/tube/favorites" element={<FavoritesPage />} />
              <Route path="/favorites" element={<Navigate to="/tube/favorites" replace />} />
              <Route path="/tube/watch/:videoId" element={<WatchPage />} />
              <Route path="/watch/:videoId" element={<WatchPage />} />
              <Route path="/tube/hls/:videoId" element={<HLSPlayerPage />} />
              <Route path="/tube/audio/:videoId" element={<AudioPlayerPage />} />
              <Route path="/tube/settings" element={<SettingsPage />} />
              <Route path="/settings" element={<Navigate to="/tube/settings" replace />} />
              
              {/* Tools & Games */}
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/tools/:toolId" element={<ToolsPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/games/:gameId" element={<GamesPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
