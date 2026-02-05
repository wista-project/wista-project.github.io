import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Clock, RefreshCw, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApiStats, resetApiStats, ApiStatsData } from '@/lib/videoFetch';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const ApiStatsDashboard: React.FC = () => {
  const { language } = useLanguage();
  const [stats, setStats] = useState<ApiStatsData>(getApiStats());
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getApiStats());
      setLastUpdate(Date.now());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setStats(getApiStats());
    setLastUpdate(Date.now());
  };

  const handleReset = () => {
    resetApiStats();
    setStats(getApiStats());
    setLastUpdate(Date.now());
  };

  const getSuccessRate = (api: string): number => {
    const s = stats[api];
    if (!s) return 0;
    const total = s.successes + s.failures;
    return total > 0 ? Math.round((s.successes / total) * 100) : 0;
  };

  const getTotalRequests = (api: string): number => {
    const s = stats[api];
    return s ? s.successes + s.failures : 0;
  };

  const getLastSuccessText = (api: string): string => {
    const s = stats[api];
    if (!s || s.lastSuccess === 0) {
      return language === 'ja' ? '未取得' : 'Never';
    }
    const diff = Date.now() - s.lastSuccess;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) {
      return language === 'ja' ? `${seconds}秒前` : `${seconds}s ago`;
    }
    return language === 'ja' ? `${minutes}分前` : `${minutes}m ago`;
  };

  const getStatusColor = (rate: number): string => {
    if (rate >= 80) return 'text-emerald-500 dark:text-emerald-400';
    if (rate >= 50) return 'text-amber-500 dark:text-amber-400';
    return 'text-destructive';
  };

  const getProgressColor = (rate: number): string => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const getIconColor = (type: 'success' | 'error'): string => {
    return type === 'success' ? 'text-emerald-500' : 'text-destructive';
  };

  const apis = ['edu', 'invidious', 'piped'];
  const apiNames: Record<string, { en: string; ja: string }> = {
    edu: { en: 'Education API', ja: '教育API' },
    invidious: { en: 'Invidious', ja: 'Invidious' },
    piped: { en: 'Piped', ja: 'Piped' },
  };

  // Calculate overall stats
  const totalSuccesses = apis.reduce((acc, api) => acc + (stats[api]?.successes || 0), 0);
  const totalFailures = apis.reduce((acc, api) => acc + (stats[api]?.failures || 0), 0);
  const overallTotal = totalSuccesses + totalFailures;
  const overallRate = overallTotal > 0 ? Math.round((totalSuccesses / overallTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">
            {language === 'ja' ? 'API成功率ダッシュボード' : 'API Success Rate Dashboard'}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {language === 'ja' ? '更新' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            {language === 'ja' ? 'リセット' : 'Reset'}
          </Button>
        </div>
      </div>

      {/* Overall Stats Card */}
      <div className="bg-secondary/50 rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {language === 'ja' ? '全体の成功率' : 'Overall Success Rate'}
          </span>
          <span className={`text-2xl font-bold ${getStatusColor(overallRate)}`}>
            {overallRate}%
          </span>
        </div>
        <Progress 
          value={overallRate} 
          className="h-2"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle className={getIconColor('success')} style={{ width: 12, height: 12 }} />
            {totalSuccesses} {language === 'ja' ? '成功' : 'success'}
          </span>
          <span className="flex items-center gap-1">
            <XCircle className={getIconColor('error')} style={{ width: 12, height: 12 }} />
            {totalFailures} {language === 'ja' ? '失敗' : 'failed'}
          </span>
          <span>{overallTotal} {language === 'ja' ? 'リクエスト' : 'requests'}</span>
        </div>
      </div>

      {/* Individual API Stats */}
      <div className="space-y-3">
        {apis.map((api) => {
          const rate = getSuccessRate(api);
          const total = getTotalRequests(api);
          const s = stats[api];
          
          return (
            <div 
              key={api} 
              className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${getStatusColor(rate)}`} />
                  <span className="font-medium">
                    {apiNames[api][language]}
                  </span>
                </div>
                <span className={`text-xl font-bold ${getStatusColor(rate)}`}>
                  {rate}%
                </span>
              </div>
              
              <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-3">
                <div 
                  className={`absolute left-0 top-0 h-full transition-all duration-500 ${getProgressColor(rate)}`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle className={getIconColor('success')} style={{ width: 12, height: 12 }} />
                  <span>{s?.successes || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <XCircle className={getIconColor('error')} style={{ width: 12, height: 12 }} />
                  <span>{s?.failures || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{getLastSuccessText(api)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Order */}
      <div className="bg-secondary/30 rounded-lg p-4 border border-border">
        <div className="text-sm text-muted-foreground mb-2">
          {language === 'ja' ? '現在の優先順位' : 'Current Priority Order'}
        </div>
        <div className="flex flex-wrap gap-2">
          {apis
            .map(api => ({ api, rate: getSuccessRate(api) }))
            .sort((a, b) => b.rate - a.rate)
            .map((item, idx) => (
              <div 
                key={item.api}
                className="flex items-center gap-1 bg-card px-3 py-1 rounded-full text-sm border border-border"
              >
                <span className="text-muted-foreground">{idx + 1}.</span>
                <span>{apiNames[item.api][language]}</span>
                <span className={`text-xs ${getStatusColor(item.rate)}`}>
                  ({item.rate}%)
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Last Update */}
      <div className="text-xs text-center text-muted-foreground">
        {language === 'ja' ? '最終更新: ' : 'Last updated: '}
        {new Date(lastUpdate).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ApiStatsDashboard;
