import { MarketDataProvider } from './MarketDataProvider';
import { IndianApiMarketDataProvider } from './IndianApiMarketDataProvider';
import { UpstoxMarketDataProvider } from './UpstoxMarketDataProvider';
import { PassiveMarketDataProvider } from './PassiveMarketDataProvider';
import { YahooFinanceMarketDataProvider } from './YahooFinanceMarketDataProvider';

export class MarketDataProviderFactory {
  static createProvider(): MarketDataProvider {
    const providerType = (process.env.MARKET_DATA_PROVIDER || 'indianapi').toLowerCase();
    const indianApiKey = process.env.INDIAN_API_KEY;
    const upstoxToken = process.env.UPSTOX_ACCESS_TOKEN;

    if (indianApiKey || providerType === 'indianapi') {
      console.log('Using IndianApiMarketDataProvider (Real NSE Stock Market Quotes via IndianAPI)');
      return new IndianApiMarketDataProvider();
    }

    if (providerType === 'upstox' && upstoxToken && upstoxToken !== 'your-upstox-access-token') {
      console.log('Using UpstoxMarketDataProvider (Real NSE Market Quotes)');
      return new UpstoxMarketDataProvider();
    }

    if (providerType === 'passive') {
      console.log('Using PassiveMarketDataProvider (Safe Fallback)');
      return new PassiveMarketDataProvider();
    }

    console.log('Using YahooFinanceMarketDataProvider (Real Data)');
    return new YahooFinanceMarketDataProvider();
  }
}
