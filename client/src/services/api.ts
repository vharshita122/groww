import { DashboardData, StockCatalogItem, StockNewsResponse } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const API_BASE = '/api';


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

    // 1. Call Express API endpoint
    let res: { message: string } | null = null;
    try {
      res = await request<{ message: string }>('/watchlist', userId, {
        method: 'POST',
        body: JSON.stringify({ symbol: cleanSymbol }),
      });
    } catch (apiErr) {
      console.warn('Express backend add stock endpoint notice:', apiErr);
    }

    // 2. Direct Supabase insert fallback in browser (where auth context is active)
    if (isSupabaseConfigured && supabase && userId !== 'demo-user') {
      try {
        const stocks = await request<StockCatalogItem[]>('/stocks').catch(() => []);
        const stock = stocks.find(s => s.symbol === cleanSymbol);
        const companyName = stock ? stock.companyName : cleanSymbol;

        await supabase.from('watchlist_stocks').upsert({
          user_id: userId,
          stock_symbol: cleanSymbol,
          stock_name: companyName,
        }, { onConflict: 'user_id,stock_symbol' });
      } catch (supaErr) {
        console.error('Direct Supabase insert error:', supaErr);
      }
    }

    return res || { message: `Added ${cleanSymbol} to watchlist` };
  },
  removeStock: async (userId: string, symbol: string) => {
    const cleanSymbol = symbol.toUpperCase().trim();

    let res: { message: string } | null = null;
    try {
      res = await request<{ message: string }>(`/watchlist/${cleanSymbol}`, userId, {
        method: 'DELETE',
      });
    } catch (apiErr) {
      console.warn('Express backend remove stock endpoint notice:', apiErr);
    }

    if (isSupabaseConfigured && supabase && userId !== 'demo-user') {
      try {
        await supabase.from('watchlist_stocks').delete().match({ user_id: userId, stock_symbol: cleanSymbol });
        await supabase.from('user_stock_state').delete().match({ user_id: userId, stock_symbol: cleanSymbol });
      } catch (supaErr) {
        console.error('Direct Supabase delete error:', supaErr);
      }
    }

    return res || { message: `Removed ${cleanSymbol} from watchlist` };
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



