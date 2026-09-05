import { MarketDataProvider } from '../providers/MarketDataProvider';
import { UserStoreService } from './store';
import { DashboardResponse, WatchlistStockData } from '../types';
import { NewsService } from './newsService';

export class DashboardService {
  /**
   * Generates the "Since You Last Checked" categorized dashboard summary.
   */
  static async getDashboardSummary(
    userId: string,
    marketProvider: MarketDataProvider,
    authToken?: string
  ): Promise<DashboardResponse> {
    const watchlist = await UserStoreService.getUserWatchlist(userId, authToken);
    const stockStates = await UserStoreService.getUserStockStates(userId, authToken);
    const symbols = watchlist.map(w => w.symbol);

    let quotes: any[] = [];
    if (typeof (marketProvider as any).getDetailedQuotes === 'function') {
      quotes = await (marketProvider as any).getDetailedQuotes(symbols);
    } else {
      const prices = await marketProvider.getLatestPrices(symbols);
      quotes = symbols.map(sym => ({ symbol: sym, regularMarketPrice: prices[sym] || 0 }));
    }

    const stocks: WatchlistStockData[] = [];

    for (const item of watchlist) {
      const symbol = item.symbol;
      const cleanSymbol = symbol.replace('.NS', '').trim();
      const nsSymbol = `${cleanSymbol}.NS`;

      const state = stockStates.get(symbol) || stockStates.get(cleanSymbol) || stockStates.get(nsSymbol);
      const quote = quotes.find(q => q.symbol === symbol || q.symbol === cleanSymbol || q.symbol === nsSymbol) || {};
      
      const currentPrice = quote.regularMarketPrice || quote.price || 0;
      const change1D = quote.regularMarketChange || 0;
      const percentChange1D = quote.regularMarketChangePercent || 0;
      const high52W = quote.fiftyTwoWeekHigh || 0;
      const low52W = quote.fiftyTwoWeekLow || 0;

      const hasBaseline = Boolean(state && state.lastSeenPrice !== null && state.lastSeenPrice > 0);
      const lastSeenPrice = hasBaseline ? (state!.lastSeenPrice as number) : null;
      const lastSeenAt = hasBaseline ? state!.lastSeenAt : null;

      let sinceLastSeenChange = 0;
      let sinceLastSeenPercent = 0;

      if (hasBaseline && lastSeenPrice && lastSeenPrice > 0) {
        sinceLastSeenChange = currentPrice - lastSeenPrice;
        sinceLastSeenPercent = (sinceLastSeenChange / lastSeenPrice) * 100;
      } else if (currentPrice > 0) {
        // First observation with no previous stored price: store current price as baseline for future checks
        UserStoreService.markSeen(userId, { [symbol]: currentPrice }, authToken).catch(err => {
          console.error(`Failed to auto-initialize baseline for ${symbol}:`, err);
        });
      }

      console.log(`[Since Last Seen Debug] symbol: ${symbol} | previousPrice: ${lastSeenPrice !== null ? lastSeenPrice : 'N/A'} | currentPrice: ${currentPrice} | change: ${sinceLastSeenChange >= 0 ? '+' : ''}${sinceLastSeenChange.toFixed(2)} | changePercent: ${sinceLastSeenPercent >= 0 ? '+' : ''}${sinceLastSeenPercent.toFixed(2)}%`);

      const microTags = NewsService.generateMicroTags({
        symbol,
        companyName: item.companyName,
        currentPrice,
        high52W,
        low52W,
        percentChange1D
      });

      stocks.push({
        symbol,
        companyName: item.companyName,
        currentPrice,
        change1D: Number(change1D.toFixed(2)),
        percentChange1D: Number(percentChange1D.toFixed(2)),
        high52W: Number(high52W.toFixed(2)),
        low52W: Number(low52W.toFixed(2)),
        hasBaseline,
        lastSeenPrice: lastSeenPrice !== null ? Number(lastSeenPrice.toFixed(2)) : null,
        lastSeenAt,
        sinceLastSeenChange: Number(sinceLastSeenChange.toFixed(2)),
        sinceLastSeenPercent: Number(sinceLastSeenPercent.toFixed(2)),
        microTags
      });
    }


    return {
      totalWatchlistCount: watchlist.length,
      stocks,
    };
  }

}

