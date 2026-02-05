import { useState, useCallback, useRef, useEffect } from 'react';

export type PlayerType = 'edu' | 'ytdlp' | 'invidious' | 'nocookie';

// 優先順位順のプレイヤーリスト
// edu を最初に表示（即座に再生開始）、その後バックグラウンドでストリーム取得
const PLAYER_ORDER: PlayerType[] = ['edu', 'ytdlp', 'invidious', 'nocookie'];

// エラーの最大リトライ回数
const MAX_RETRIES = 2;

interface FallbackState {
  currentPlayer: PlayerType;
  failedPlayers: Set<PlayerType>;
  retryCount: Map<PlayerType, number>;
  isAutoFallback: boolean;
  lastError?: string;
}

export const usePlayerFallback = (initialPlayer: PlayerType = 'ytdlp') => {
  const [state, setState] = useState<FallbackState>({
    currentPlayer: initialPlayer,
    failedPlayers: new Set(),
    retryCount: new Map(),
    isAutoFallback: false,
  });

  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 次の利用可能なプレイヤーを取得
  const getNextPlayer = useCallback((failedPlayers: Set<PlayerType>): PlayerType | null => {
    for (const player of PLAYER_ORDER) {
      if (!failedPlayers.has(player)) {
        return player;
      }
    }
    return null;
  }, []);

  // プレイヤーエラー時のハンドラー
  const handlePlayerError = useCallback((player: PlayerType, errorMessage?: string) => {
    console.log(`[PlayerFallback] ${player} failed:`, errorMessage);

    setState(prev => {
      const newRetryCount = new Map(prev.retryCount);
      const currentRetries = newRetryCount.get(player) || 0;
      
      // リトライ回数をチェック
      if (currentRetries < MAX_RETRIES) {
        newRetryCount.set(player, currentRetries + 1);
        console.log(`[PlayerFallback] ${player} retry ${currentRetries + 1}/${MAX_RETRIES}`);
        return {
          ...prev,
          retryCount: newRetryCount,
          lastError: errorMessage,
        };
      }

      // リトライ上限に達した場合、次のプレイヤーにフォールバック
      const newFailedPlayers = new Set(prev.failedPlayers);
      newFailedPlayers.add(player);
      
      const nextPlayer = getNextPlayer(newFailedPlayers);
      
      if (nextPlayer) {
        console.log(`[PlayerFallback] Switching from ${player} to ${nextPlayer}`);
        return {
          ...prev,
          currentPlayer: nextPlayer,
          failedPlayers: newFailedPlayers,
          retryCount: newRetryCount,
          isAutoFallback: true,
          lastError: errorMessage,
        };
      }

      // すべてのプレイヤーが失敗
      console.log('[PlayerFallback] All players failed');
      return {
        ...prev,
        failedPlayers: newFailedPlayers,
        retryCount: newRetryCount,
        lastError: errorMessage,
      };
    });
  }, [getNextPlayer]);

  // プレイヤーの成功を報告（リトライカウントをリセット）
  const handlePlayerSuccess = useCallback((player: PlayerType) => {
    setState(prev => {
      const newRetryCount = new Map(prev.retryCount);
      newRetryCount.delete(player);
      return {
        ...prev,
        retryCount: newRetryCount,
        isAutoFallback: false,
      };
    });
  }, []);

  // 手動でプレイヤーを切り替え
  const switchPlayer = useCallback((player: PlayerType) => {
    setState(prev => ({
      ...prev,
      currentPlayer: player,
      isAutoFallback: false,
    }));
  }, []);

  // すべてのプレイヤーの状態をリセット
  const resetAllPlayers = useCallback(() => {
    setState({
      currentPlayer: initialPlayer,
      failedPlayers: new Set(),
      retryCount: new Map(),
      isAutoFallback: false,
    });
  }, [initialPlayer]);

  // 特定のプレイヤーの状態をリセット
  const resetPlayer = useCallback((player: PlayerType) => {
    setState(prev => {
      const newFailedPlayers = new Set(prev.failedPlayers);
      const newRetryCount = new Map(prev.retryCount);
      newFailedPlayers.delete(player);
      newRetryCount.delete(player);
      return {
        ...prev,
        failedPlayers: newFailedPlayers,
        retryCount: newRetryCount,
      };
    });
  }, []);

  // タイムアウト付きのエラーハンドラー（デバウンス）
  const debouncedError = useCallback((player: PlayerType, errorMessage?: string, delayMs = 500) => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
    }
    fallbackTimeoutRef.current = setTimeout(() => {
      handlePlayerError(player, errorMessage);
    }, delayMs);
  }, [handlePlayerError]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentPlayer: state.currentPlayer,
    failedPlayers: Array.from(state.failedPlayers),
    isAutoFallback: state.isAutoFallback,
    lastError: state.lastError,
    allPlayersFailed: state.failedPlayers.size === PLAYER_ORDER.length,
    handlePlayerError,
    handlePlayerSuccess,
    switchPlayer,
    resetAllPlayers,
    resetPlayer,
    debouncedError,
  };
};
