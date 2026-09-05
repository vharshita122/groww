import YahooFinanceModule from 'yahoo-finance2';
import { MarketDataProvider } from './MarketDataProvider';
import { StockInfo, HistoricalPoint } from '../types';

const YahooFinanceClass = (YahooFinanceModule as any).default || YahooFinanceModule;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

// Predefined catalog of popular Indian stocks
const DEFAULT_CATALOG: StockInfo[] = [
  { symbol: 'RELIANCE.NS', companyName: 'Reliance Industries', sector: 'Energy', basePrice: 0 },
  { symbol: 'TCS.NS', companyName: 'Tata Consultancy', sector: 'IT', basePrice: 0 },
  { symbol: 'HDFCBANK.NS', companyName: 'HDFC Bank', sector: 'Banking', basePrice: 0 },
  { symbol: 'ICICIBANK.NS', companyName: 'ICICI Bank', sector: 'Banking', basePrice: 0 },
  { symbol: 'INFY.NS', companyName: 'Infosys', sector: 'IT', basePrice: 0 },
  { symbol: 'SBIN.NS', companyName: 'State Bank of India', sector: 'Banking', basePrice: 0 },
  { symbol: 'BHARTIARTL.NS', companyName: 'Bharti Airtel', sector: 'Telecom', basePrice: 0 },
  { symbol: 'ITC.NS', companyName: 'ITC', sector: 'FMCG', basePrice: 0 },
  { symbol: 'LT.NS', companyName: 'Larsen & Toubro', sector: 'Infrastructure', basePrice: 0 },
  { symbol: 'BPCL.NS', companyName: 'Bharat PetroleumCorp', sector: 'Energy', basePrice: 0 },
  { symbol: 'ONGC.NS', companyName: 'ONGC', sector: 'Energy', basePrice: 0 },
  { symbol: 'ZOMATO.NS', companyName: 'Zomato', sector: 'Consumer Services', basePrice: 0 },
  { symbol: 'TATASTEEL.NS', companyName: 'Tata Steel', sector: 'Metals', basePrice: 0 },
  { symbol: 'SCI.NS', companyName: 'Shipping Corpn.India', sector: 'Shipping', basePrice: 0 },
  { symbol: 'SARDAEN.NS', companyName: 'Sarda Energy & Min.', sector: 'Metals', basePrice: 0 },
  { symbol: 'ANANTRAJ.NS', companyName: 'Anant Raj', sector: 'Real Estate', basePrice: 0 },
  { symbol: 'RPOWER.NS', companyName: 'Reliance Power', sector: 'Energy', basePrice: 0 },
  { symbol: 'AAPL', companyName: 'Apple Inc', sector: 'Technology', basePrice: 0 },
];

export class YahooFinanceMarketDataProvider implements MarketDataProvider {
  async getAvailableStocks(): Promise<StockInfo[]> {
    return DEFAULT_CATALOG;
  }

  async getLatestPrices(symbols?: string[]): Promise<Record<string, number>> {
    const symbolsToFetch = symbols && symbols.length > 0 ? symbols : DEFAULT_CATALOG.map(s => s.symbol);
    const results: Record<string, number> = {};
    
    if (symbolsToFetch.length === 0) return results;

    try {
      const quotes = await yahooFinance.quote(symbolsToFetch) as any;
      const quoteArray = Array.isArray(quotes) ? quotes : [quotes];
      
      for (const quote of quoteArray) {
        if (quote && quote.symbol && quote.regularMarketPrice !== undefined) {
          results[quote.symbol] = quote.regularMarketPrice;
        }
      }
    } catch (error) {
      console.error('Error fetching prices from Yahoo Finance:', error);
    }
    
    return results;
  }

  async getPriceHistory(symbol: string, fromTimestamp: string, toTimestamp: string): Promise<HistoricalPoint[]> {
    try {
      const queryOptions: any = {
        period1: fromTimestamp,
        period2: toTimestamp,
        interval: '1d',
      };
      const result = await yahooFinance.historical(symbol, queryOptions) as any[];
      if (!Array.isArray(result)) return [];
      
      return result.map((point: any) => ({
        symbol,
        price: point.close || point.adjClose || 0,
        timestamp: point.date ? new Date(point.date).toISOString() : new Date().toISOString(),
      }));
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error);
      return [];
    }
  }

  async getDetailedQuotes(symbols: string[]) {
    try {
      if (!symbols || symbols.length === 0) return [];
      const quotes = await yahooFinance.quote(symbols) as any;
      return Array.isArray(quotes) ? quotes : [quotes];
    } catch (error) {
      console.error('Error fetching detailed quotes:', error);
      return [];
    }
  }
}

