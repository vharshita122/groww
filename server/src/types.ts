export interface StockInfo {
  symbol: string;
  companyName: string;
  sector: string;
  basePrice: number;
}

export interface StockPrice {
  symbol: string;
  price: number;
  timestamp: string;
}

export interface HistoricalPoint {
  symbol: string;
  price: number;
  timestamp: string;
  eventDescription?: string;
}

export interface UserStockState {
  symbol: string;
  lastSeenPrice: number | null;
  lastSeenAt: string | null;
}

export interface WatchlistStockData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change1D: number;
  percentChange1D: number;
  high52W: number;
  low52W: number;
  hasBaseline: boolean;
  lastSeenPrice: number | null;
  lastSeenAt: string | null;
  sinceLastSeenChange: number;
  sinceLastSeenPercent: number;
  microTags?: string[];
}


export interface DashboardResponse {
  totalWatchlistCount: number;
  stocks: WatchlistStockData[];
}

export interface WatchlistStockItem {
  symbol: string;
  companyName: string;
  addedAt: string;
}
