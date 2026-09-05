import { StockInfo, HistoricalPoint } from '../types';

export interface MarketDataProvider {
  /**
   * Retrieves list of available stocks supported by the market provider.
   */
  getAvailableStocks(): Promise<StockInfo[]>;

  /**
   * Retrieves latest current market prices for given symbols (or all available if omitted).
   */
  getLatestPrices(symbols?: string[]): Promise<Record<string, number>>;

  /**
   * Retrieves historical price points between two timestamps for timeline rewind.
   */
  getPriceHistory(symbol: string, fromTimestamp: string, toTimestamp: string): Promise<HistoricalPoint[]>;
}
