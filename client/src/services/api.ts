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
  getDashboard: (userId: string) => request<DashboardData>('/dashboard', userId),
  markSeen: (userId: string) => request<{ message: string; dashboard: DashboardData }>('/dashboard/mark-seen', userId, { method: 'POST' }),
  getAvailableStocks: () => request<StockCatalogItem[]>('/stocks'),
  addStock: async (userId: string, symbol: string) => {
    const cleanSymbol = symbol.toUpperCase().trim();

    let supaSuccess = false;
    if (isSupabaseConfigured && supabase && userId !== 'demo-user') {
      try {
        const companyName = cleanSymbol.replace('.NS', '');
        
        let activeUserId = userId;
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          activeUserId = userData.user.id;
        }

        const { error } = await supabase.from('watchlist_stocks').insert({
          user_id: activeUserId,
          stock_symbol: cleanSymbol,
          stock_name: companyName,
        });

        if (!error || error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
          supaSuccess = true;
        } else {
          console.warn('Supabase insert warning:', error);
        }
      } catch (supaErr) {
        console.warn('Direct Supabase insert notice:', supaErr);
      }
    }

    try {
      await request<{ message: string }>('/watchlist', userId, {
        method: 'POST',
        body: JSON.stringify({ symbol: cleanSymbol }),
      });
      supaSuccess = true;
    } catch (apiErr) {
      console.warn('Express backend add stock endpoint notice:', apiErr);
      if (!supaSuccess && userId !== 'demo-user') {
        throw new Error('Failed to add stock to watchlist. Please check Supabase RLS policy or backend server status.');
      }
    }

    return { message: `Added ${cleanSymbol} to watchlist` };
  },
  removeStock: async (userId: string, symbol: string) => {
    const cleanSymbol = symbol.toUpperCase().trim();

    let supaSuccess = false;
    if (isSupabaseConfigured && supabase && userId !== 'demo-user') {
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
      } catch (supaErr) {
        console.warn('Direct Supabase delete notice:', supaErr);
      }
    }

    try {
      await request<{ message: string }>(`/watchlist/${cleanSymbol}`, userId, {
        method: 'DELETE',
      });
      supaSuccess = true;
    } catch (apiErr) {
      console.warn('Express backend remove stock endpoint notice:', apiErr);
      if (!supaSuccess && userId !== 'demo-user') {
        throw new Error('Failed to remove stock from watchlist.');
      }
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



