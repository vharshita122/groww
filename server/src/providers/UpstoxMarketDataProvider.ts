import { MarketDataProvider } from './MarketDataProvider';
import { StockInfo, HistoricalPoint } from '../types';

interface UpstoxInstrument {
  symbol: string;
  companyName: string;
  sector: string;
  upstoxKey: string;
  yahooTicker: string;
}

export const INDIAN_STOCKS_CATALOG: UpstoxInstrument[] = [
  { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd', sector: 'Energy & Retail', upstoxKey: 'NSE_EQ|INE002A01018', yahooTicker: 'RELIANCE.NS' },
  { symbol: 'TCS', companyName: 'Tata Consultancy Services Ltd', sector: 'Information Technology', upstoxKey: 'NSE_EQ|INE467B01029', yahooTicker: 'TCS.NS' },
  { symbol: 'INFY', companyName: 'Infosys Ltd', sector: 'Information Technology', upstoxKey: 'NSE_EQ|INE009A01021', yahooTicker: 'INFY.NS' },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank Ltd', sector: 'Banking & Financials', upstoxKey: 'NSE_EQ|INE040A01034', yahooTicker: 'HDFCBANK.NS' },
  { symbol: 'ICICIBANK', companyName: 'ICICI Bank Ltd', sector: 'Banking & Financials', upstoxKey: 'NSE_EQ|INE090A01021', yahooTicker: 'ICICIBANK.NS' },
  { symbol: 'SBIN', companyName: 'State Bank of India', sector: 'Banking & Financials', upstoxKey: 'NSE_EQ|INE062A01020', yahooTicker: 'SBIN.NS' },
  { symbol: 'ITC', companyName: 'ITC Ltd', sector: 'FMCG', upstoxKey: 'NSE_EQ|INE154A01025', yahooTicker: 'ITC.NS' },
  { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Ltd', sector: 'Telecommunications', upstoxKey: 'NSE_EQ|INE397D01024', yahooTicker: 'BHARTIARTL.NS' },
  { symbol: 'LT', companyName: 'Larsen & Toubro Ltd', sector: 'Engineering & Construction', upstoxKey: 'NSE_EQ|INE018A01030', yahooTicker: 'LT.NS' },
  { symbol: 'HINDUNILVR', companyName: 'Hindustan Unilever Ltd', sector: 'FMCG', upstoxKey: 'NSE_EQ|INE030A01027', yahooTicker: 'HINDUNILVR.NS' },
];

/**
 * Market Data Provider integrating Upstox Developer API (v2/v3)
 * for real-time NSE market quotes, LTP, and historical candles.
 */
export class UpstoxMarketDataProvider implements MarketDataProvider {
  private get upstoxAccessToken(): string {
    return process.env.UPSTOX_ACCESS_TOKEN || '';
  }

  async getAvailableStocks(): Promise<StockInfo[]> {
    return INDIAN_STOCKS_CATALOG.map(s => ({
      symbol: s.symbol,
      companyName: s.companyName,
      sector: s.sector,
      basePrice: 0, // No base price hardcoded
    }));
  }

  /**
   * Fetches real-time Last Traded Price (LTP) from Upstox API v2 / v3.
   * If UPSTOX_ACCESS_TOKEN is omitted, fetches live quotes from open NSE ticker feeds.
   */
  async getLatestPrices(symbols?: string[]): Promise<Record<string, number>> {
    const targetStocks = symbols && symbols.length > 0
      ? INDIAN_STOCKS_CATALOG.filter(s => symbols.includes(s.symbol))
      : INDIAN_STOCKS_CATALOG;

    if (targetStocks.length === 0) return {};

    const prices: Record<string, number> = {};

    // 1. If Upstox Access Token is configured, call Upstox API v2 / v3
    if (this.upstoxAccessToken) {
      try {
        const keysParam = targetStocks.map(s => encodeURIComponent(s.upstoxKey)).join(',');
        const url = `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${keysParam}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.upstoxAccessToken}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            for (const stock of targetStocks) {
              // Upstox response keys look like "NSE_EQ:RELIANCE" or by instrument token
              const quoteData = json.data[stock.upstoxKey] || json.data[`NSE_EQ:${stock.symbol}`];
              if (quoteData && typeof quoteData.last_price === 'number') {
                prices[stock.symbol] = Number(quoteData.last_price.toFixed(2));
              }
            }
            if (Object.keys(prices).length > 0) {
              return prices;
            }
          }
        } else {
          console.warn('Upstox API quote response not OK:', res.status, await res.text().catch(() => ''));
        }
      } catch (err) {
        console.error('Error fetching from Upstox API:', err);
      }
    }

    // 2. Live Market Fallback (Open Indian market ticker feeds)
    await Promise.all(
      targetStocks.map(async stock => {
        try {
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.yahooTicker}?interval=1m&range=1d`;
          const res = await fetch(yahooUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });

          if (res.ok) {
            const data = await res.json();
            const meta = data?.chart?.result?.[0]?.meta;
            const regularMarketPrice = meta?.regularMarketPrice || meta?.chartPreviousClose;
            if (typeof regularMarketPrice === 'number' && regularMarketPrice > 0) {
              prices[stock.symbol] = Number(regularMarketPrice.toFixed(2));
            }
          }
        } catch (err) {
          console.warn(`Live quote fetch notice for ${stock.symbol}:`, err);
        }
      })
    );

    return prices;
  }

  /**
   * Fetches real historical price candles between two timestamps.
   */
  async getPriceHistory(
    symbol: string,
    fromTimestamp: string,
    toTimestamp: string
  ): Promise<HistoricalPoint[]> {
    const stock = INDIAN_STOCKS_CATALOG.find(s => s.symbol === symbol);
    if (!stock) return [];

    const fromDate = new Date(fromTimestamp);
    const toDate = new Date(toTimestamp);
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    const points: HistoricalPoint[] = [];

    // 1. If Upstox Access Token is configured, fetch historical candles from Upstox
    if (this.upstoxAccessToken) {
      try {
        const encodedKey = encodeURIComponent(stock.upstoxKey);
        const url = `https://api.upstox.com/v2/historical-candle/${encodedKey}/day/${toStr}/${fromStr}`;

        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.upstoxAccessToken}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data?.candles)) {
            // Candles structure: [timestamp, open, high, low, close, volume, open_interest]
            const candles = json.data.candles;
            for (const c of candles.slice().reverse()) {
              const candleTime = c[0];
              const closePrice = Number(c[4]);

              points.push({
                symbol,
                price: Number(closePrice.toFixed(2)),
                timestamp: new Date(candleTime).toISOString(),
                eventDescription: `Real market close price recorded on ${new Date(candleTime).toLocaleDateString('en-IN')}`,
              });
            }
            if (points.length > 0) return points;
          }
        }
      } catch (err) {
        console.error('Error fetching historical candles from Upstox:', err);
      }
    }

    // 2. Live Market Fallback (Historical chart from open feeds)
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.yahooTicker}?interval=1d&range=1mo`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });

      if (res.ok) {
        const json = await res.json();
        const result = json?.chart?.result?.[0];
        const timestamps = result?.timestamp || [];
        const quotes = result?.indicators?.quote?.[0]?.close || [];

        for (let i = 0; i < timestamps.length; i++) {
          const t = timestamps[i] * 1000;
          const p = quotes[i];

          if (t >= fromDate.getTime() && t <= toDate.getTime() && typeof p === 'number' && p > 0) {
            points.push({
              symbol,
              price: Number(p.toFixed(2)),
              timestamp: new Date(t).toISOString(),
              eventDescription: `Market close on ${new Date(t).toLocaleDateString('en-IN')}`,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Historical fetch notice for ${symbol}:`, err);
    }

    return points;
  }
}
