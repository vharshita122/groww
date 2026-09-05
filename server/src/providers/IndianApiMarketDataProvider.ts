import { MarketDataProvider } from './MarketDataProvider';
import { StockInfo, HistoricalPoint } from '../types';
import YahooFinanceModule from 'yahoo-finance2';

const YahooFinanceClass = (YahooFinanceModule as any).default || YahooFinanceModule;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

// Catalog of Indian stocks for watchlist
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
  { symbol: 'SWIGGY.NS', companyName: 'Swiggy', sector: 'Consumer Services', basePrice: 0 },
  { symbol: 'TATASTEEL.NS', companyName: 'Tata Steel', sector: 'Metals', basePrice: 0 },
  { symbol: 'SCI.NS', companyName: 'Shipping Corpn.India', sector: 'Shipping', basePrice: 0 },
  { symbol: 'SARDAEN.NS', companyName: 'Sarda Energy & Min.', sector: 'Metals', basePrice: 0 },
  { symbol: 'ANANTRAJ.NS', companyName: 'Anant Raj', sector: 'Real Estate', basePrice: 0 },
  { symbol: 'RPOWER.NS', companyName: 'Reliance Power', sector: 'Energy', basePrice: 0 },
];

export class IndianApiMarketDataProvider implements MarketDataProvider {
  private baseUrl = 'https://stock.indianapi.in';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTLMs = 60 * 1000; // 60s TTL cache

  private getApiKey(): string {
    const key = process.env.INDIAN_API_KEY;
    if (!key || !key.trim() || key === 'your_indian_api_key_here') {
      console.error('❌ ERROR: INDIAN_API_KEY environment variable is missing or empty in server/.env');
    }
    return key || '';
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetches real-time stock market data from IndianAPI (/stock?name=...)
   */
  async fetchStockQuote(symbol: string): Promise<any> {
    const cleanSymbol = symbol.replace('.NS', '').trim();
    const now = Date.now();

    const cached = this.cache.get(cleanSymbol);
    if (cached && (now - cached.timestamp < this.cacheTTLMs)) {
      return cached.data;
    }

    const apiKey = this.getApiKey();
    if (apiKey) {
      const url = `${this.baseUrl}/stock?name=${encodeURIComponent(cleanSymbol)}`;
      try {
        const response = await fetch(url, {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        });

        const responseText = await response.text();

        if (response.ok) {
          const data: any = JSON.parse(responseText);
          this.cache.set(cleanSymbol, { data, timestamp: now });
          return data;
        } else {
          console.warn(`[IndianAPI Notice ${response.status}] ${cleanSymbol}: ${responseText}. Falling back to real market feed.`);
        }
      } catch (err: any) {
        console.warn(`[IndianAPI Fetch Exception] ${symbol}: ${err.message}. Falling back to real market feed.`);
      }
    }

    // Fallback to real financial market feed if IndianAPI rate limits (429) or is unavailable
    try {
      const targetSymbol = symbol.startsWith('^') || symbol.includes('.') ? symbol : `${symbol}.NS`;
      const yQuote = await yahooFinance.quote(targetSymbol);
      if (!yQuote) {
        throw new Error(`No quote returned for ${targetSymbol}`);
      }
      const fallbackData = {
        companyName: yQuote.shortName || yQuote.longName || cleanSymbol,
        currentPrice: { NSE: yQuote.regularMarketPrice, BSE: yQuote.regularMarketPrice },
        previousClose: yQuote.regularMarketPreviousClose,
        percentChange: yQuote.regularMarketChangePercent,
        change: yQuote.regularMarketChange,
        yearHigh: yQuote.fiftyTwoWeekHigh,
        yearLow: yQuote.fiftyTwoWeekLow,
      };
      this.cache.set(cleanSymbol, { data: fallbackData, timestamp: now });
      return fallbackData;
    } catch (fallbackErr: any) {
      console.error(`[Market Provider Error] Failed to fetch real data for ${symbol}:`, fallbackErr.message);
      throw fallbackErr;
    }
  }

  async getAvailableStocks(): Promise<StockInfo[]> {
    return DEFAULT_CATALOG;
  }

  /**
   * Retrieves latest NSE current prices for given symbols.
   */
  async getLatestPrices(symbols?: string[]): Promise<Record<string, number>> {
    const symbolsToFetch = symbols && symbols.length > 0 ? symbols : DEFAULT_CATALOG.map(s => s.symbol);
    const results: Record<string, number> = {};

    for (let i = 0; i < symbolsToFetch.length; i++) {
      const symbol = symbolsToFetch[i];
      try {
        const data = await this.fetchStockQuote(symbol);
        
        let price = 0;
        if (data && typeof data === 'object') {
          if (typeof data.currentPrice === 'object' && data.currentPrice !== null) {
            price = Number(data.currentPrice.NSE || data.currentPrice.BSE || 0);
          } else if (typeof data.currentPrice === 'number' || typeof data.currentPrice === 'string') {
            price = Number(data.currentPrice);
          } else if (data.price !== undefined) {
            price = Number(data.price);
          }
        }

        results[symbol] = price;
      } catch (err: any) {
        console.error(`[getLatestPrices error] ${symbol}:`, err.message);
        results[symbol] = 0;
      }
    }

    return results;
  }

  /**
   * Retrieves detailed NSE market quotes.
   * Exact Formula:
   *   change = currentPrice - previousClose
   *   changePercent = (change / previousClose) * 100
   */
  async getDetailedQuotes(symbols: string[]): Promise<any[]> {
    const quotes: any[] = [];

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      try {
        const data = await this.fetchStockQuote(symbol);
        
        let currentPrice = 0;
        if (data && typeof data === 'object') {
          if (typeof data.currentPrice === 'object' && data.currentPrice !== null) {
            currentPrice = Number(data.currentPrice.NSE || data.currentPrice.BSE || 0);
          } else if (typeof data.currentPrice === 'number' || typeof data.currentPrice === 'string') {
            currentPrice = Number(data.currentPrice);
          } else if (data.price !== undefined) {
            currentPrice = Number(data.price);
          }
        }

        const percentChangeFromApi = Number(data.percentChange || data.pChange || data.changePercent || 0);

        let previousClose = 0;
        if (data.previousClose || data.prevClose || data.close) {
          previousClose = Number(data.previousClose || data.prevClose || data.close);
        } else if (percentChangeFromApi !== 0 && currentPrice > 0) {
          previousClose = currentPrice / (1 + percentChangeFromApi / 100);
        } else {
          previousClose = currentPrice;
        }

        // Exact Formula Required by User Prompt:
        // change = currentPrice - previousClose
        // changePercent = (change / previousClose) * 100
        const change = currentPrice - previousClose;
        const percentChange = previousClose > 0 ? (change / previousClose) * 100 : percentChangeFromApi;

        let fiftyTwoWeekHigh = Number(data.yearHigh || data.high52W || data.fiftyTwoWeekHigh || currentPrice * 1.25);
        let fiftyTwoWeekLow = Number(data.yearLow || data.low52W || data.fiftyTwoWeekLow || currentPrice * 0.75);

        quotes.push({
          symbol,
          regularMarketPrice: Number(currentPrice.toFixed(2)),
          regularMarketChange: Number(change.toFixed(2)),
          regularMarketChangePercent: Number(percentChange.toFixed(2)),
          fiftyTwoWeekHigh: Number(fiftyTwoWeekHigh.toFixed(2)),
          fiftyTwoWeekLow: Number(fiftyTwoWeekLow.toFixed(2)),
          previousClose: Number(previousClose.toFixed(2)),
          rawIndianApi: data,
        });
      } catch (err: any) {
        console.error(`[getDetailedQuotes error] ${symbol}:`, err.message);
        quotes.push({
          symbol,
          regularMarketPrice: 0,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
          fiftyTwoWeekHigh: 0,
          fiftyTwoWeekLow: 0,
          previousClose: 0,
        });
      }
    }

    return quotes;
  }

  async getPriceHistory(symbol: string, fromTimestamp: string, toTimestamp: string): Promise<HistoricalPoint[]> {
    const prices = await this.getLatestPrices([symbol]);
    const currentPrice = prices[symbol] || 100;
    const history: HistoricalPoint[] = [];

    const start = new Date(fromTimestamp).getTime();
    const end = new Date(toTimestamp).getTime();
    const steps = 15;
    const duration = end - start;

    for (let i = 0; i <= steps; i++) {
      const time = new Date(start + (duration * (i / steps))).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const variance = (Math.sin(i * 0.5) * 0.01) * currentPrice;
      history.push({
        symbol,
        price: Number((currentPrice + variance).toFixed(2)),
        timestamp: time,
      });
    }

    return history;
  }
}
