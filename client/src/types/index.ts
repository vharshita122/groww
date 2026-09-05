export interface StockCatalogItem {
  symbol: string;
  companyName: string;
  sector: string;
  basePrice: number;
  currentPrice: number;
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


export interface DashboardData {
  totalWatchlistCount: number;
  stocks: WatchlistStockData[];
}

export interface WatchlistStockItem {
  symbol: string;
  companyName: string;
  addedAt: string;
}

export interface UserSession {
  id: string;
  email: string;
  isDemo: boolean;
}

export interface StockNewsArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  description: string;
}

export interface StockNewsResponse {
  symbol: string;
  companyName: string;
  whySummary: string;
  microTags?: string[];
  articles: StockNewsArticle[];
}

