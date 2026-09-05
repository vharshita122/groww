import { Router, Request, Response } from 'express';
import { MarketDataProvider } from '../providers/MarketDataProvider';
import { UserStoreService } from '../services/store';
import { DashboardService } from '../services/dashboardService';
import { NewsService } from '../services/newsService';

export function createApiRouter(marketProvider: MarketDataProvider): Router {
  const router = Router();

  // Helper middleware to extract user id and auth Bearer token
  const getUserId = (req: Request): string => {
    const userIdHeader = req.headers['x-user-id'];
    if (typeof userIdHeader === 'string' && userIdHeader.trim()) {
      return userIdHeader.trim();
    }
    return 'demo-user';
  };

  const getAuthToken = (req: Request): string | undefined => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  };

  // 1. Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'MarketPulse API',
      provider: marketProvider.constructor.name,
      timestamp: new Date().toISOString(),
    });
  });

  // 1b. Get live market indices (NIFTY 50, SENSEX)
  router.get('/market-indices', async (req: Request, res: Response) => {
    try {
      const symbols = ['^NSEI', '^BSESN'];
      let quotes: any[] = [];
      if (typeof (marketProvider as any).getDetailedQuotes === 'function') {
        quotes = await (marketProvider as any).getDetailedQuotes(symbols);
      }

      const nifty = quotes.find(q => q.symbol === '^NSEI') || {};
      const sensex = quotes.find(q => q.symbol === '^BSESN') || {};

      res.json([
        {
          symbol: '^NSEI',
          name: 'NIFTY 50',
          price: nifty.regularMarketPrice || nifty.price || 0,
          change: Number((nifty.regularMarketChange || 0).toFixed(2)),
          percentChange: Number((nifty.regularMarketChangePercent || 0).toFixed(2)),
        },
        {
          symbol: '^BSESN',
          name: 'SENSEX',
          price: sensex.regularMarketPrice || sensex.price || 0,
          change: Number((sensex.regularMarketChange || 0).toFixed(2)),
          percentChange: Number((sensex.regularMarketChangePercent || 0).toFixed(2)),
        }
      ]);
    } catch (err: any) {
      console.error('Error fetching market indices:', err);
      res.status(500).json({ error: 'Failed to fetch market indices', message: err.message });
    }
  });



  // 2. Get available stocks catalog
  router.get('/stocks', async (req: Request, res: Response) => {
    try {
      const stocks = await marketProvider.getAvailableStocks();
      const prices = await marketProvider.getLatestPrices();
      
      const result = stocks.map(stock => ({
        ...stock,
        currentPrice: prices[stock.symbol] || stock.basePrice,
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch available stocks', message: err.message });
    }
  });

  // 2b. Fetch real-time stock news & evidence summary
  router.get('/stocks/:symbol/news', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const catalog = await marketProvider.getAvailableStocks();
      const stock = catalog.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
      const companyName = stock ? stock.companyName : symbol.replace('.NS', '');

      const newsData = await NewsService.fetchStockNews(symbol, companyName);
      res.json(newsData);
    } catch (err: any) {
      console.error(`Error fetching news for ${req.params.symbol}:`, err);
      res.status(500).json({ error: 'Failed to fetch stock news', message: err.message });
    }
  });

  // 3. Get main dashboard (Since You Last Checked)
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const authToken = getAuthToken(req);
      const dashboardData = await DashboardService.getDashboardSummary(userId, marketProvider, authToken);
      res.json(dashboardData);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      res.status(500).json({ error: 'Failed to generate dashboard', message: err.message });
    }
  });

  // 4. Save session snapshot (Mark all current prices as last seen baseline on session leave/end)
  const handleSaveSession = async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const authToken = getAuthToken(req);
      const watchlist = await UserStoreService.getUserWatchlist(userId, authToken);
      const symbols = watchlist.map(w => w.symbol);

      if (symbols.length > 0) {
        const latestPrices = await marketProvider.getLatestPrices(symbols);
        await UserStoreService.markSeen(userId, latestPrices, authToken);
      }

      res.json({
        message: 'Session snapshot saved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error saving session snapshot:', err);
      res.status(500).json({ error: 'Failed to save session snapshot', message: err.message });
    }
  };

  router.post('/dashboard/mark-seen', handleSaveSession);
  router.post('/dashboard/save-session', handleSaveSession);

  // 4b. Live SSE Stream for real-time market quotes (Continuous LTP updates)

  router.get('/live-stream', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const userId = getUserId(req);
    const authToken = getAuthToken(req);

    let isAlive = true;
    req.on('close', () => {
      isAlive = false;
    });

    const sendPrices = async () => {
      if (!isAlive) return;
      try {
        const watchlist = await UserStoreService.getUserWatchlist(userId, authToken);
        const symbols = watchlist.map(w => w.symbol);
        const prices = symbols.length > 0 ? await marketProvider.getLatestPrices(symbols) : {};

        let indices: any[] = [];
        if (typeof (marketProvider as any).getDetailedQuotes === 'function') {
          const idxQuotes = await (marketProvider as any).getDetailedQuotes(['^NSEI', '^BSESN']);
          const nifty = idxQuotes.find((q: any) => q.symbol === '^NSEI') || {};
          const sensex = idxQuotes.find((q: any) => q.symbol === '^BSESN') || {};
          indices = [
            {
              symbol: '^NSEI',
              name: 'NIFTY 50',
              price: nifty.regularMarketPrice || nifty.price || 0,
              change: Number((nifty.regularMarketChange || 0).toFixed(2)),
              percentChange: Number((nifty.regularMarketChangePercent || 0).toFixed(2)),
            },
            {
              symbol: '^BSESN',
              name: 'SENSEX',
              price: sensex.regularMarketPrice || sensex.price || 0,
              change: Number((sensex.regularMarketChange || 0).toFixed(2)),
              percentChange: Number((sensex.regularMarketChangePercent || 0).toFixed(2)),
            }
          ];
        }

        res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString(), prices, indices })}\n\n`);
      } catch (err) {
        console.error('Error in SSE live stream:', err);
      }
    };


    await sendPrices();

    const interval = setInterval(async () => {
      if (!isAlive) {
        clearInterval(interval);
        return;
      }
      await sendPrices();
    }, 3000);
  });





  // 6. Get user watchlist
  router.get('/watchlist', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const authToken = getAuthToken(req);
      const watchlist = await UserStoreService.getUserWatchlist(userId, authToken);
      res.json(watchlist);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch watchlist', message: err.message });
    }
  });

  // 7. Add stock to watchlist
  router.post('/watchlist', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const authToken = getAuthToken(req);
      const { symbol } = req.body;

      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ error: 'Valid stock symbol is required' });
      }

      const cleanSymbol = symbol.toUpperCase().trim();
      const stocks = await marketProvider.getAvailableStocks();
      const stock = stocks.find(s => s.symbol === cleanSymbol);

      if (!stock) {
        return res.status(404).json({ error: `Stock symbol ${cleanSymbol} not found in catalog` });
      }

      const prices = await marketProvider.getLatestPrices([cleanSymbol]);
      const currentPrice = prices[cleanSymbol] || stock.basePrice;

      await UserStoreService.addStockToWatchlist(userId, cleanSymbol, stock.companyName, currentPrice, authToken);

      res.status(201).json({
        message: `Added ${cleanSymbol} to watchlist`,
        stock: { symbol: cleanSymbol, companyName: stock.companyName, currentPrice },
      });
    } catch (err: any) {
      console.error('Error in POST /api/watchlist:', err);
      res.status(500).json({ error: 'Failed to add stock to watchlist', message: err.message });
    }
  });

  // 8. Remove stock from watchlist
  router.delete('/watchlist/:symbol', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const authToken = getAuthToken(req);
      const { symbol } = req.params;
      const cleanSymbol = symbol.toUpperCase().trim();

      await UserStoreService.removeStockFromWatchlist(userId, cleanSymbol, authToken);
      res.json({ message: `Removed ${cleanSymbol} from watchlist` });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove stock', message: err.message });
    }
  });

  // 9. Get Stock History
  router.get('/stocks/:symbol/history', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { range } = req.query; // '1D', '1W', '1M', '6M', '1Y', '5Y', 'All'
      const cleanSymbol = symbol.toUpperCase().trim();
      
      const toDate = new Date();
      const fromDate = new Date();
      
      if (range === '1W') fromDate.setDate(toDate.getDate() - 7);
      else if (range === '1M') fromDate.setMonth(toDate.getMonth() - 1);
      else if (range === '3M') fromDate.setMonth(toDate.getMonth() - 3);
      else if (range === '6M') fromDate.setMonth(toDate.getMonth() - 6);
      else if (range === '1Y') fromDate.setFullYear(toDate.getFullYear() - 1);
      else if (range === '5Y') fromDate.setFullYear(toDate.getFullYear() - 5);
      else if (range === 'All') fromDate.setFullYear(toDate.getFullYear() - 10);
      else fromDate.setDate(toDate.getDate() - 1); // default 1D
      
      const history = await marketProvider.getPriceHistory(cleanSymbol, fromDate.toISOString(), toDate.toISOString());
      res.json({ history });
    } catch (err: any) {
      console.error('Error fetching history:', err);
      res.status(500).json({ error: 'Failed to fetch history', message: err.message });
    }
  });

  return router;
}

