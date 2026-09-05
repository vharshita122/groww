import { MarketDataProvider } from './MarketDataProvider';
import { StockInfo, HistoricalPoint } from '../types';
import { INDIAN_STOCKS_CATALOG } from './UpstoxMarketDataProvider';

/**
 * Passive Market Data Provider.
 * This provider acts as a safe fallback. It returns the available stocks but provides 0 for all prices
 * and empty history. The frontend should gracefully handle 0 prices as "Price Unavailable".
 */
export class PassiveMarketDataProvider implements MarketDataProvider {
  async getAvailableStocks(): Promise<StockInfo[]> {
    return INDIAN_STOCKS_CATALOG.map(s => ({
      symbol: s.symbol,
      companyName: s.companyName,
      sector: s.sector,
      basePrice: 0,
    }));
  }

  async getLatestPrices(symbols?: string[]): Promise<Record<string, number>> {
    const targetStocks = symbols && symbols.length > 0
      ? INDIAN_STOCKS_CATALOG.filter(s => symbols.includes(s.symbol))
      : INDIAN_STOCKS_CATALOG;

    if (targetStocks.length === 0) return {};

    const prices: Record<string, number> = {};
    for (const stock of targetStocks) {
      prices[stock.symbol] = 0; // Return 0 to indicate unavailable live data
    }

    return prices;
  }

  async getPriceHistory(
    symbol: string,
    fromTimestamp: string,
    toTimestamp: string
  ): Promise<HistoricalPoint[]> {
    return [];
  }
}
