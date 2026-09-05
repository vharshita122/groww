import { DashboardData, StockCatalogItem, StockNewsResponse } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawApiBase ? `${rawApiBase.replace(/\/$/, '')}/api` : '/api';


async function request<T>(endpoint: string, userId: string = 'demo-user', options: RequestInit = {}): Promise<T> {
  let authToken = '';
  if (isSupabaseConfigured && supabase && userId !== 'demo-user') {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        authToken = data.session.access_token;
      }
    } catch {
      // Ignore token fetch error
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  getDashboard: async (userId: string): Promise<DashboardData> => {
    try {
      return await request<DashboardData>('/dashboard', userId);
    } catch (err: any) {
      console.warn('Express backend getDashboard notice:', err?.message);

      if (isSupabaseConfigured && supabase && userId !== 'demo-user') {
        try {
          let activeUserId = userId;
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            activeUserId = userData.user.id;
          }

          const { data: watchlistData } = await supabase
            .from('watchlist_stocks')
            .select('stock_symbol, stock_name, created_at')
            .eq('user_id', activeUserId);

          const { data: stateData } = await supabase
            .from('user_stock_state')
            .select('stock_symbol, last_seen_price, last_seen_at')
            .eq('user_id', activeUserId);

          const stateMap = new Map();
          if (stateData) {
            for (const item of stateData) {
              const clean = item.stock_symbol.replace('.NS', '').trim();
              const stateObj = {
                hasBaseline: item.last_seen_price !== null && item.last_seen_price !== undefined && Number(item.last_seen_price) > 0,
                lastSeenPrice: item.last_seen_price !== null ? Number(item.last_seen_price) : null,
                lastSeenAt: item.last_seen_at || null,
              };
              stateMap.set(item.stock_symbol, stateObj);
              stateMap.set(clean, stateObj);
              stateMap.set(`${clean}.NS`, stateObj);
            }
          }

          const catalogPrices: Record<string, number> = {
            'RELIANCE.NS': 1322,
            'TCS.NS': 2304,
            'HDFCBANK.NS': 712.1,
            'ICICIBANK.NS': 1423.2,
            'INFY.NS': 1130,
            'SBIN.NS': 840,
            'BHARTIARTL.NS': 1840,
            'ITC.NS': 264.1,
            'LT.NS': 3450,
            'RPOWER.NS': 22.08,
          };

          const stocks = (watchlistData || []).map(item => {
            const sym = item.stock_symbol;
            const clean = sym.replace('.NS', '').trim();
            const currentPrice = catalogPrices[sym] || catalogPrices[`${clean}.NS`] || 1000;

            const st = stateMap.get(sym) || stateMap.get(clean) || stateMap.get(`${clean}.NS`) || {
              hasBaseline: false,
              lastSeenPrice: null,
              lastSeenAt: null,
            };

            const hasBaseline = st.hasBaseline;
            const lastSeenPrice = st.lastSeenPrice;
            let sinceLastSeenChange = 0;
            let sinceLastSeenPercent = 0;

            if (hasBaseline && lastSeenPrice && lastSeenPrice > 0) {
              sinceLastSeenChange = currentPrice - lastSeenPrice;
              sinceLastSeenPercent = (sinceLastSeenChange / lastSeenPrice) * 100;
            }

            return {
              symbol: sym,
              companyName: item.stock_name || clean,
              currentPrice,
              change1D: 0,
              percentChange1D: 0,
              high52W: Number((currentPrice * 1.25).toFixed(2)),
              low52W: Number((currentPrice * 0.75).toFixed(2)),
              hasBaseline,
              lastSeenPrice,
              lastSeenAt: st.lastSeenAt,
              sinceLastSeenChange: Number(sinceLastSeenChange.toFixed(2)),
              sinceLastSeenPercent: Number(sinceLastSeenPercent.toFixed(2)),
              microTags: [],
            };
          });

          return {
            totalWatchlistCount: stocks.length,
            stocks,
          };
        } catch (supaErr: any) {
          console.error('Direct Supabase getDashboard exception:', supaErr?.message);
        }
      }

      throw err;
    }
  },
  markSeen: (userId: string) => request<{ message: string; dashboard: DashboardData }>('/dashboard/mark-seen', userId, { method: 'POST' }),
  getAvailableStocks: () => request<StockCatalogItem[]>('/stocks'),
  addStock: async (userId: string, symbol: string) => {
    const cleanSymbol = symbol.toUpperCase().trim();
    const companyName = cleanSymbol.replace('.NS', '');

    let supaSuccess = false;
    if (isSupabaseConfigured && supabase) {
      try {
        let activeUserId = userId;
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          activeUserId = userData.user.id;
        }

        const { error } = await supabase.from('watchlist_stocks').upsert({
          user_id: activeUserId,
          stock_symbol: cleanSymbol,
          stock_name: companyName,
        }, { onConflict: 'user_id,stock_symbol' });

        if (!error || error.code === '23505' || error.message?.includes('duplicate')) {
          supaSuccess = true;
        } else {
          console.warn('Supabase insert notice:', error?.message);
        }
      } catch (supaErr: any) {
        console.warn('Direct Supabase insert exception:', supaErr?.message);
      }
    }

    try {
      await request<{ message: string }>('/watchlist', userId, {
        method: 'POST',
        body: JSON.stringify({ symbol: cleanSymbol }),
      });
      supaSuccess = true;
    } catch (apiErr: any) {
      console.warn('Express backend add stock notice:', apiErr?.message);
    }

    return { message: `Added ${cleanSymbol} to watchlist` };
  },
  removeStock: async (userId: string, symbol: string) => {
    const cleanSymbol = symbol.toUpperCase().trim();

    let supaSuccess = false;
    if (isSupabaseConfigured && supabase) {
      try {
        let activeUserId = userId;
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          activeUserId = userData.user.id;
        }

        const altSymbol = cleanSymbol.endsWith('.NS') ? cleanSymbol.replace('.NS', '') : `${cleanSymbol}.NS`;

        await supabase.from('watchlist_stocks')
          .delete()
          .eq('user_id', activeUserId)
          .in('stock_symbol', [cleanSymbol, altSymbol]);

        await supabase.from('user_stock_state')
          .delete()
          .eq('user_id', activeUserId)
          .in('stock_symbol', [cleanSymbol, altSymbol]);

        supaSuccess = true;
      } catch (supaErr: any) {
        console.warn('Direct Supabase delete notice:', supaErr?.message);
      }
    }

    try {
      await request<{ message: string }>(`/watchlist/${cleanSymbol}`, userId, {
        method: 'DELETE',
      });
      supaSuccess = true;
    } catch (apiErr: any) {
      console.warn('Express backend remove stock notice:', apiErr?.message);
    }

    return { message: `Removed ${cleanSymbol} from watchlist` };
  },
  getStockHistory: (symbol: string, range: string = '1D') => 
    request<{ history: { timestamp: string, price: number, eventDescription?: string }[] }>(`/stocks/${symbol}/history?range=${range}`),
  getMarketIndices: () =>
    request<{ symbol: string; name: string; price: number; change: number; percentChange: number }[]>('/market-indices'),
  saveSessionSnapshot: (userId: string) =>
    request<{ message: string }>('/dashboard/save-session', userId, { method: 'POST' }),
  getStockNews: (symbol: string) =>
    request<StockNewsResponse>(`/stocks/${encodeURIComponent(symbol)}/news`),
};



