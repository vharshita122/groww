import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserStockState, WatchlistStockItem } from '../types';

// Check if Supabase environment variables are present
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Returns an authenticated Supabase client for DB operations.
 * If SUPABASE_SERVICE_ROLE_KEY is set, uses service role key to bypass RLS for server API.
 * Otherwise, if authToken is provided, creates a client with the user's Bearer JWT so RLS passes.
 */
export function getSupabaseClient(authToken?: string): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(supabaseUrl, serviceKey);
  }

  if (authToken) {
    return createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    });
  }

  return createClient(supabaseUrl, supabaseKey);
}

// In-Memory Store only for unauthenticated "demo-user"
interface UserDataStore {
  watchlist: Map<string, WatchlistStockItem>; // symbol -> WatchlistStockItem
  stockStates: Map<string, UserStockState>;   // symbol -> UserStockState
  lastCheckTime: string;
}

const demoUserStores = new Map<string, UserDataStore>();

function getOrCreateDemoStore(userId: string): UserDataStore {
  if (!demoUserStores.has(userId)) {
    demoUserStores.set(userId, {
      watchlist: new Map(),
      stockStates: new Map(),
      lastCheckTime: new Date().toISOString(),
    });
  }
  return demoUserStores.get(userId)!;
}

export class UserStoreService {
  /**
   * Retrieves watchlist for a given user.
   */
  static async getUserWatchlist(userId: string, authToken?: string): Promise<WatchlistStockItem[]> {
    const supabase = getSupabaseClient(authToken);

    if (supabase && userId !== 'demo-user') {
      try {
        const { data, error } = await supabase
          .from('watchlist_stocks')
          .select('stock_symbol, stock_name, created_at')
          .eq('user_id', userId);

        if (error) {
          console.error('Supabase fetch watchlist error:', error);
          return [];
        }

        if (data) {
          return data.map(item => ({
            symbol: item.stock_symbol,
            companyName: item.stock_name,
            addedAt: item.created_at,
          }));
        }
      } catch (err) {
        console.error('Supabase fetch watchlist exception:', err);
        return [];
      }
    }

    // Demo Mode store
    const store = getOrCreateDemoStore(userId);
    return Array.from(store.watchlist.values());
  }

  /**
   * Retrieves user stock states (last seen prices & timestamps).
   */
  static async getUserStockStates(userId: string, authToken?: string): Promise<Map<string, UserStockState>> {
    const statesMap = new Map<string, UserStockState>();
    const supabase = getSupabaseClient(authToken);

    if (supabase && userId !== 'demo-user') {
      try {
        const { data, error } = await supabase
          .from('user_stock_state')
          .select('stock_symbol, last_seen_price, last_seen_at')
          .eq('user_id', userId);

        if (!error && data) {
          for (const item of data) {
            const rawSymbol = item.stock_symbol;
            const cleanSymbol = rawSymbol.replace('.NS', '').trim();
            const nsSymbol = `${cleanSymbol}.NS`;
            const price = item.last_seen_price !== null && item.last_seen_price !== undefined ? Number(item.last_seen_price) : null;
            const stateObj: UserStockState = {
              symbol: rawSymbol,
              lastSeenPrice: price && price > 0 ? price : null,
              lastSeenAt: item.last_seen_at || null,
            };

            // Don't overwrite an existing non-null baseline with a null one
            for (const symKey of [rawSymbol, cleanSymbol, nsSymbol]) {
              const existing = statesMap.get(symKey);
              if (!existing || (!existing.lastSeenPrice && stateObj.lastSeenPrice)) {
                statesMap.set(symKey, stateObj);
              }
            }
          }
        }
        return statesMap;
      } catch (err) {
        console.error('Supabase fetch stock state exception:', err);
        return statesMap;
      }
    }

    // Demo Mode store
    const store = getOrCreateDemoStore(userId);
    return store.stockStates;
  }

  /**
   * Gets the overall last check time for user (oldest baseline timestamp).
   */
  static async getUserLastCheckTime(userId: string, authToken?: string): Promise<string> {
    const statesMap = await this.getUserStockStates(userId, authToken);
    if (statesMap.size === 0) {
      return new Date().toISOString();
    }

    let oldest = new Date().toISOString();
    for (const state of statesMap.values()) {
      if (state.lastSeenAt && new Date(state.lastSeenAt) < new Date(oldest)) {
        oldest = state.lastSeenAt;
      }
    }
    return oldest;
  }

  /**
   * Adds a stock to user's watchlist in Supabase under auth.uid().
   * Does NOT set last_seen_price so the stock has no baseline until session is saved.
   */
  static async addStockToWatchlist(
    userId: string,
    symbol: string,
    companyName: string,
    currentPrice: number,
    authToken?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const supabase = getSupabaseClient(authToken);

    if (supabase && userId !== 'demo-user') {
      try {
        // Upsert into watchlist_stocks
        const { error: watchlistErr } = await supabase
          .from('watchlist_stocks')
          .upsert(
            { user_id: userId, stock_symbol: symbol, stock_name: companyName },
            { onConflict: 'user_id,stock_symbol' }
          );

        if (watchlistErr) {
          console.error('Error inserting into watchlist_stocks:', watchlistErr);
          throw new Error(watchlistErr.message);
        }
        return;
      } catch (err: any) {
        console.error('Failed to add stock to Supabase watchlist:', err);
        throw err;
      }
    }

    // Demo Mode
    const store = getOrCreateDemoStore(userId);
    store.watchlist.set(symbol, { symbol, companyName, addedAt: now });
    store.stockStates.set(symbol, { symbol, lastSeenPrice: null, lastSeenAt: null });
  }


  /**
   * Removes a stock from user's watchlist in Supabase.
   */
  static async removeStockFromWatchlist(userId: string, symbol: string, authToken?: string): Promise<void> {
    const supabase = getSupabaseClient(authToken);

    if (supabase && userId !== 'demo-user') {
      try {
        await supabase
          .from('watchlist_stocks')
          .delete()
          .match({ user_id: userId, stock_symbol: symbol });

        await supabase
          .from('user_stock_state')
          .delete()
          .match({ user_id: userId, stock_symbol: symbol });
        return;
      } catch (err) {
        console.error('Supabase delete stock error:', err);
        throw err;
      }
    }

    // Demo Mode
    const store = getOrCreateDemoStore(userId);
    store.watchlist.delete(symbol);
    store.stockStates.delete(symbol);
  }

  /**
   * Updates last seen price & timestamp for watchlist stocks (Mark as Seen).
   */
  static async markSeen(userId: string, currentPrices: Record<string, number>, authToken?: string): Promise<void> {
    const now = new Date().toISOString();
    const supabase = getSupabaseClient(authToken);

    if (supabase && userId !== 'demo-user') {
      try {
        const records: any[] = [];
        for (const [symbol, price] of Object.entries(currentPrices)) {
          if (!price || price <= 0) continue;
          const cleanSymbol = symbol.replace('.NS', '').trim();
          const nsSymbol = `${cleanSymbol}.NS`;

          records.push({ user_id: userId, stock_symbol: symbol, last_seen_price: price, last_seen_at: now });
          records.push({ user_id: userId, stock_symbol: cleanSymbol, last_seen_price: price, last_seen_at: now });
          records.push({ user_id: userId, stock_symbol: nsSymbol, last_seen_price: price, last_seen_at: now });
        }

        if (records.length > 0) {
          await supabase
            .from('user_stock_state')
            .upsert(records, { onConflict: 'user_id,stock_symbol' });
        }
        return;
      } catch (err) {
        console.error('Supabase markSeen error:', err);
        throw err;
      }
    }

    // Demo Mode
    const store = getOrCreateDemoStore(userId);
    for (const [symbol, price] of Object.entries(currentPrices)) {
      if (store.watchlist.has(symbol)) {
        store.stockStates.set(symbol, {
          symbol,
          lastSeenPrice: price,
          lastSeenAt: now,
        });
      }
    }
    store.lastCheckTime = now;
  }
}

