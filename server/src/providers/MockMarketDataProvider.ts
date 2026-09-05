import { MarketDataProvider } from './MarketDataProvider';
import { StockInfo, HistoricalPoint } from '../types';

export const MOCK_STOCKS: StockInfo[] = [
  { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd', sector: 'Energy & Retail', basePrice: 2850.0 },
  { symbol: 'TCS', companyName: 'Tata Consultancy Services Ltd', sector: 'Information Technology', basePrice: 3920.0 },
  { symbol: 'INFY', companyName: 'Infosys Ltd', sector: 'Information Technology', basePrice: 1540.0 },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank Ltd', sector: 'Banking & Financials', basePrice: 1440.0 },
  { symbol: 'ICICIBANK', companyName: 'ICICI Bank Ltd', sector: 'Banking & Financials', basePrice: 1080.0 },
  { symbol: 'SBIN', companyName: 'State Bank of India', sector: 'Banking & Financials', basePrice: 760.0 },
  { symbol: 'ITC', companyName: 'ITC Ltd', sector: 'FMCG', basePrice: 430.0 },
  { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Ltd', sector: 'Telecommunications', basePrice: 1220.0 },
  { symbol: 'LT', companyName: 'Larsen & Toubro Ltd', sector: 'Engineering & Construction', basePrice: 3650.0 },
  { symbol: 'HINDUNILVR', companyName: 'Hindustan Unilever Ltd', sector: 'FMCG', basePrice: 2380.0 },
];

/**
 * Deterministic Mock Market Data Provider for Indian Stocks.
 * Simulates current prices and historical price points with natural realistic swings.
 */
export class MockMarketDataProvider implements MarketDataProvider {
  // Deterministic price adjustments relative to baseline for demonstration
  private currentPriceMultipliers: Record<string, number> = {
    RELIANCE: 1.062,    // +6.2% -> Needs Attention 🔴
    INFY: 0.946,        // -5.4% -> Needs Attention 🔴
    TCS: 1.034,         // +3.4% -> Worth Watching 🟡
    HDFCBANK: 0.972,    // -2.8% -> Worth Watching 🟡
    ICICIBANK: 1.025,   // +2.5% -> Worth Watching 🟡
    SBIN: 1.006,        // +0.6% -> Quiet 🟢
    ITC: 1.002,         // +0.2% -> Quiet 🟢
    BHARTIARTL: 1.058,  // +5.8% -> Needs Attention 🔴
    LT: 0.991,          // -0.9% -> Quiet 🟢
    HINDUNILVR: 0.995,  // -0.5% -> Quiet 🟢
  };

  async getAvailableStocks(): Promise<StockInfo[]> {
    return MOCK_STOCKS;
  }

  async getLatestPrices(symbols?: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const targetStocks = symbols && symbols.length > 0
      ? MOCK_STOCKS.filter(s => symbols.includes(s.symbol))
      : MOCK_STOCKS;

    for (const stock of targetStocks) {
      const mult = this.currentPriceMultipliers[stock.symbol] || 1.0;
      prices[stock.symbol] = Number((stock.basePrice * mult).toFixed(2));
    }

    return prices;
  }

  async getPriceHistory(symbol: string, fromTimestamp: string, toTimestamp: string): Promise<HistoricalPoint[]> {
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol);
    if (!stock) return [];

    const fromDate = new Date(fromTimestamp);
    const toDate = new Date(toTimestamp);
    const now = toDate.getTime();
    const start = fromDate.getTime();
    
    // Ensure we generate 3 to 5 realistic milestone dates between fromDate and toDate
    const points: HistoricalPoint[] = [];
    const totalMs = Math.max(now - start, 86400000 * 3); // At least 3 days span
    const steps = 4;

    const currentMult = this.currentPriceMultipliers[symbol] || 1.0;
    const base = stock.basePrice;

    // Define milestone descriptions depending on symbol trend
    const eventPool: Record<string, string[]> = {
      RELIANCE: [
        'Q3 Earnings announcement exceeded analyst revenue estimates by 8%',
        'Jio Telecom tariff hike announcement fueled strong buy volume',
        'New green energy plant commissioning update released',
        'Stock surged past psychological resistance level'
      ],
      INFY: [
        'U.S. tech client budget revisions prompted caution in IT sector',
        'Lowered FY revenue growth guidance sent stock dipping',
        'Management reassures investors during post-earning conference call',
        'Consolidation around key support level'
      ],
      TCS: [
        'Large $500M UK banking contract win announced',
        'Mild profit booking across Indian IT index',
        'Dividend declaration boosted investor sentiment'
      ],
      HDFCBANK: [
        'RBI deposit growth compliance commentary',
        'Quarterly net interest margin (NIM) report released',
        'Institutional rebalancing caused minor price adjustment'
      ],
      BHARTIARTL: [
        'ARPU (Average Revenue Per User) increased to ₹210',
        '5G spectrum rollout expansion update in major metros',
        'Institutional surge pushes stock to 52-week high'
      ]
    };

    for (let i = 0; i <= steps; i++) {
      const stepRatio = i / steps;
      const pointTime = new Date(start + stepRatio * totalMs).toISOString();

      // Interpolate price from 1.0 (base price at start) to currentMult (at end) with slight noise
      let stepMult = 1.0 + (currentMult - 1.0) * stepRatio;
      if (i > 0 && i < steps) {
        // add slight mid-way swing for realism
        const swing = (i % 2 === 1 ? 0.012 : -0.015);
        stepMult += swing;
      }

      const price = Number((base * stepMult).toFixed(2));
      const pool = eventPool[symbol] || [
        `Mid-week market liquidity shift affecting ${stock.sector}`,
        `Institutional volume block trade recorded`,
        `Consolidation in line with Nifty 50 benchmark`
      ];

      const eventDescription = (i > 0 && i < steps)
        ? pool[(i - 1) % pool.length]
        : (i === steps && Math.abs(currentMult - 1.0) >= 0.02 ? pool[0] : undefined);

      points.push({
        symbol,
        price,
        timestamp: pointTime,
        eventDescription
      });
    }

    return points;
  }
}
