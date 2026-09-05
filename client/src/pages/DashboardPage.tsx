import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, SortAsc } from 'lucide-react';
import { BrokerHeader } from '../components/BrokerHeader';
import { BottomNav } from '../components/BottomNav';
import { StockListItem } from '../components/StockListItem';
import { StockDetailPage } from './StockDetailPage';
import { StockNewsModal } from '../components/StockNewsModal';
import { WatchlistManager } from '../components/WatchlistManager';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { UserSession, DashboardData, WatchlistStockData } from '../types';
import { api, getFallbackStockData } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface Props {
  session: UserSession;
  onLogout: () => void;
}

type SortMode = '1D' | '52W_HIGH' | '52W_LOW' | 'SINCE_LAST_SEEN';

export const DashboardPage: React.FC<Props> = ({ session, onLogout }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);
  
  const [sortMode, setSortMode] = useState<SortMode>('1D');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [newsStock, setNewsStock] = useState<{ symbol: string; companyName: string } | null>(null);

  const sessionBaselinesRef = React.useRef<Map<string, { hasBaseline: boolean; lastSeenPrice: number | null; lastSeenAt: string | null }>>(new Map());
  const isBaselineInitializedRef = React.useRef(false);

  // Load dashboard data


  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboard(session.id, session.email);
      
      // Initialize and lock session baselines once at start of session
      if (!isBaselineInitializedRef.current && data.stocks.length > 0) {
        const map = new Map();
        for (const s of data.stocks) {
          map.set(s.symbol, {
            hasBaseline: s.hasBaseline,
            lastSeenPrice: s.lastSeenPrice,
            lastSeenAt: s.lastSeenAt,
          });
        }
        sessionBaselinesRef.current = map;
        isBaselineInitializedRef.current = true;
      }

      // Ensure stocks use locked session baselines
      const lockedStocks = data.stocks.map(stock => {
        const baseline = sessionBaselinesRef.current.get(stock.symbol) || {
          hasBaseline: stock.hasBaseline,
          lastSeenPrice: stock.lastSeenPrice,
          lastSeenAt: stock.lastSeenAt,
        };

        const hasBaseline = baseline.hasBaseline;
        const lastSeenPrice = baseline.lastSeenPrice;
        const lastSeenAt = baseline.lastSeenAt;

        let sinceLastSeenChange = 0;
        let sinceLastSeenPercent = 0;

        if (hasBaseline && lastSeenPrice && lastSeenPrice > 0) {
          sinceLastSeenChange = stock.currentPrice - lastSeenPrice;
          sinceLastSeenPercent = ((stock.currentPrice - lastSeenPrice) / lastSeenPrice) * 100;
        }

        return {
          ...stock,
          hasBaseline,
          lastSeenPrice,
          lastSeenAt,
          sinceLastSeenChange: Number(sinceLastSeenChange.toFixed(2)),
          sinceLastSeenPercent: Number(sinceLastSeenPercent.toFixed(2)),
        };
      });

      setDashboardData({ ...data, stocks: lockedStocks });
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [session.id, session.email]);

  useEffect(() => {
    loadDashboard();

    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, supaSession: any) => {
        if (supaSession?.user) {
          loadDashboard();
        }
      });
      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, [loadDashboard]);

  // Connect to SSE Live Stream for continuous LTP updates without overwriting session baseline
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
      const sseUrl = rawApiBase ? `${rawApiBase.replace(/\/$/, '')}/api/live-stream` : `/api/live-stream`;
      es = new EventSource(sseUrl);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.prices) {
            setDashboardData(prev => {
              if (!prev) return prev;
              const newStocks = prev.stocks.map(stock => {
                const livePrice = data.prices[stock.symbol];
                if (typeof livePrice === 'number' && livePrice > 0) {
                  const currentPrice = livePrice;
                  const baseline = sessionBaselinesRef.current.get(stock.symbol);
                  const hasBaseline = baseline ? baseline.hasBaseline : false;
                  const lastSeenPrice = baseline ? baseline.lastSeenPrice : null;
                  const lastSeenAt = baseline ? baseline.lastSeenAt : null;

                  let sinceLastSeenChange = 0;
                  let sinceLastSeenPercent = 0;

                  if (hasBaseline && lastSeenPrice && lastSeenPrice > 0) {
                    sinceLastSeenChange = currentPrice - lastSeenPrice;
                    sinceLastSeenPercent = ((currentPrice - lastSeenPrice) / lastSeenPrice) * 100;
                  }

                  return {
                    ...stock,
                    currentPrice,
                    hasBaseline,
                    lastSeenPrice,
                    lastSeenAt,
                    sinceLastSeenChange: Number(sinceLastSeenChange.toFixed(2)),
                    sinceLastSeenPercent: Number(sinceLastSeenPercent.toFixed(2)),
                  };
                }
                return stock;
              });
              return { ...prev, stocks: newStocks };
            });
          }
        } catch {
          // ignore stream parse errors
        }
      };
    } catch (err) {
      console.warn('SSE live stream notice:', err);
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  // Save watchlist snapshot only when user leaves/ends viewing session
  useEffect(() => {
    const handleLeaveSession = () => {
      api.saveSessionSnapshot(session.id).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleLeaveSession();
      }
    };

    window.addEventListener('beforeunload', handleLeaveSession);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleLeaveSession);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [session.id]);

  const cycleSortMode = () => {
    setSortMode(prev => {
      if (prev === '1D') return '52W_HIGH';
      if (prev === '52W_HIGH') return '52W_LOW';
      if (prev === '52W_LOW') return 'SINCE_LAST_SEEN';
      return '1D';
    });
  };

  const getSortLabel = (mode: SortMode) => {
    switch (mode) {
      case '1D': return 'Mkt price / 1D';
      case '52W_HIGH': return '52W High';
      case '52W_LOW': return '52W Low';
      case 'SINCE_LAST_SEEN': return 'Since Last Seen';
    }
  };

  const allActiveStocks = useMemo(() => {
    if (!dashboardData) return [];
    const stocks = [...dashboardData.stocks];
    
    // Sort logic
    stocks.sort((a, b) => {
      if (sortMode === '1D') {
        return Math.abs(b.percentChange1D) - Math.abs(a.percentChange1D);
      } else if (sortMode === '52W_HIGH') {
        const aDist = a.high52W > 0 ? (a.currentPrice / a.high52W) : 0;
        const bDist = b.high52W > 0 ? (b.currentPrice / b.high52W) : 0;
        return bDist - aDist; // Closest to 52W High
      } else if (sortMode === '52W_LOW') {
        const aDist = a.low52W > 0 ? (a.currentPrice / a.low52W) : 0;
        const bDist = b.low52W > 0 ? (b.currentPrice / b.low52W) : 0;
        return aDist - bDist; // Closest to 52W Low
      } else if (sortMode === 'SINCE_LAST_SEEN') {
        if (a.hasBaseline && b.hasBaseline) {
          return b.sinceLastSeenPercent - a.sinceLastSeenPercent; // Highest positive change to lowest
        }
        if (a.hasBaseline) return -1;
        if (b.hasBaseline) return 1;
        return 0;
      }
      return 0;
    });
    
    return stocks;
  }, [dashboardData, sortMode]);


    
  const selectedStock = allActiveStocks.find(s => s.symbol === selectedStockSymbol) || null;

  const handleAddStockOptimistic = useCallback(async (stockItem: any) => {
    const sym = stockItem.symbol;
    const clean = sym.replace('.NS', '').trim();

    setDashboardData(prev => {
      const existingStocks = prev ? prev.stocks : [];
      if (existingStocks.some(s => s.symbol === sym || s.symbol.replace('.NS', '').trim() === clean)) {
        return prev;
      }

      const fallback = getFallbackStockData(sym);
      const price = stockItem.currentPrice || fallback.currentPrice || 1000;
      const change1D = typeof stockItem.change1D === 'number' ? stockItem.change1D : fallback.change1D;
      const percentChange1D = typeof stockItem.percentChange1D === 'number' ? stockItem.percentChange1D : fallback.percentChange1D;

      const newStock: any = {
        symbol: sym,
        companyName: stockItem.companyName || fallback.companyName || clean,
        currentPrice: price,
        change1D,
        percentChange1D,
        high52W: Number((price * 1.25).toFixed(2)),
        low52W: Number((price * 0.75).toFixed(2)),
        hasBaseline: false,
        lastSeenPrice: null,
        lastSeenAt: null,
        sinceLastSeenChange: 0,
        sinceLastSeenPercent: 0,
        microTags: [],
      };

      const updatedStocks = [...existingStocks, newStock];
      return {
        ...prev,
        totalWatchlistCount: updatedStocks.length,
        stocks: updatedStocks,
      };
    });

    try {
      await api.addStock(session.id, sym, session.email);
    } catch (err) {
      console.warn('Async addStock notice:', err);
    }
  }, [session.id, session.email]);

  const handleRemoveStockOptimistic = useCallback(async (symbol: string) => {
    const clean = symbol.replace('.NS', '').trim();

    setDashboardData(prev => {
      if (!prev) return prev;
      const updatedStocks = prev.stocks.filter(s => s.symbol !== symbol && s.symbol.replace('.NS', '').trim() !== clean);
      return {
        ...prev,
        totalWatchlistCount: updatedStocks.length,
        stocks: updatedStocks,
      };
    });

    try {
      await api.removeStock(session.id, symbol, session.email);
    } catch (err) {
      console.warn('Async removeStock notice:', err);
    }
  }, [session.id, session.email]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      <BrokerHeader 
        session={session} 
        onLogout={onLogout} 
        watchlistCount={dashboardData?.totalWatchlistCount || 0}
      />

      <main className="flex-1 w-full mx-auto pb-24">
        {loading ? (
          <div className="pt-20">
             <LoadingSpinner message="Loading Watchlist..." />
          </div>
        ) : error ? (
          <div className="p-4"><ErrorMessage message={error} onRetry={loadDashboard} /></div>
        ) : dashboardData ? (
          <>
            {/* Watchlist Header Row */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
              <div className="text-sm font-semibold text-slate-300">
                {dashboardData.totalWatchlistCount} stocks
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsWatchlistOpen(true)}
                  className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700 transition"
                  title="Add or remove stocks"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Sort & Demo Controls Row */}
            <div className="relative flex items-center justify-between px-4 py-2 border-b border-brand-border z-30 flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button 
                    onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                    className="flex items-center space-x-1.5 text-xs text-brand-textMuted hover:text-white font-semibold transition py-1 px-2 rounded-lg hover:bg-slate-800"
                  >
                    <SortAsc className="w-3.5 h-3.5" />
                    <span>Sort</span>
                  </button>

                  {/* Sort Dropdown Menu */}
                  {isSortMenuOpen && (
                    <div className="absolute left-0 mt-1 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-50 animate-fadeIn">
                      {(['1D', '52W_HIGH', '52W_LOW', 'SINCE_LAST_SEEN'] as SortMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => {
                            setSortMode(mode);
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-between ${
                            sortMode === mode ? 'bg-brand-surface text-brand-green' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{getSortLabel(mode)}</span>
                          {sortMode === mode && <span className="text-brand-green font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={cycleSortMode} 
                className="flex items-center space-x-1 text-xs text-brand-textMuted font-semibold hover:text-white transition py-1 px-2 rounded-lg hover:bg-slate-800"
                title="Click to cycle sort modes"
              >
                <span className="text-brand-green font-bold">&lt;&gt;</span>
                <span>{getSortLabel(sortMode)}</span>
              </button>
            </div>



            {dashboardData.totalWatchlistCount === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center mb-4 text-slate-600">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Watchlist is Empty</h3>
                <p className="text-brand-textMuted text-sm mb-6">Start building your portfolio tracking by adding stocks.</p>
                <button
                  onClick={() => setIsWatchlistOpen(true)}
                  className="px-6 py-3 bg-brand-green hover:bg-emerald-500 text-brand-bg rounded-xl text-sm font-bold transition shadow-lg"
                >
                  Add Stocks
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {allActiveStocks.map(stock => (
                  <StockListItem 
                    key={stock.symbol} 
                    stock={stock}
                    sortMode={sortMode}
                    onClick={(sym) => setSelectedStockSymbol(sym)}
                    onRemove={handleRemoveStockOptimistic}
                    onOpenNews={(stk) => setNewsStock({ symbol: stk.symbol, companyName: stk.companyName })}
                  />
                ))}
              </div>
            )}
          </>
        ) : null}
      </main>

      
      <BottomNav />

      {/* Detail Page Overlay */}
      {selectedStockSymbol && selectedStock && (
        <StockDetailPage 
          stock={selectedStock} 
          onClose={() => setSelectedStockSymbol(null)} 
        />
      )}

      {/* Stock News Modal */}
      {newsStock && (
        <StockNewsModal
          symbol={newsStock.symbol}
          companyName={newsStock.companyName}
          onClose={() => setNewsStock(null)}
        />
      )}

      {/* Watchlist Manager Modal */}
      <WatchlistManager
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        userId={session.id}
        activeStocks={allActiveStocks as any}
        onWatchlistChanged={loadDashboard}
        onAddStock={handleAddStockOptimistic}
        onRemoveStock={handleRemoveStockOptimistic}
      />
    </div>
  );
};
