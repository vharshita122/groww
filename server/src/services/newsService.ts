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
  microTags: string[];
  articles: StockNewsArticle[];
}

function cleanText(html: string): string {
  if (!html) return '';
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssXml(xml: string, defaultSource = 'Financial News'): StockNewsArticle[] {
  const articles: StockNewsArticle[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (let i = 0; i < itemMatches.length; i++) {
    const itemXml = itemMatches[i];
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i) || itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);

    let title = titleMatch ? cleanText(titleMatch[1]) : '';
    let link = linkMatch ? cleanText(linkMatch[1]) : '';
    let pubDate = pubDateMatch ? cleanText(pubDateMatch[1]) : '';
    let source = sourceMatch ? cleanText(sourceMatch[1]) : defaultSource;
    let description = descMatch ? cleanText(descMatch[1]) : '';

    if (!source && title.includes(' - ')) {
      const parts = title.split(' - ');
      source = parts.pop()?.trim() || defaultSource;
      title = parts.join(' - ').trim();
    }

    if (title && !title.toLowerCase().includes('rss feed')) {
      articles.push({
        id: `${link || title}_${i}`,
        title,
        link: link || '#',
        source: source || 'Financial News',
        publishedAt: pubDate || new Date().toISOString(),
        description
      });
    }
  }

  return articles;
}

export class NewsService {
  static async fetchStockNews(symbol: string, companyNameInput?: string): Promise<StockNewsResponse> {
    const cleanSymbol = symbol.replace('.NS', '');
    const companyName = companyNameInput || cleanSymbol;
    let articles: StockNewsArticle[] = [];

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    };

    // Source 1: Yahoo Finance RSS feed
    const yUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
    try {
      const res = await fetch(yUrl, { headers });
      if (res.ok) {
        const xml = await res.text();
        articles = articles.concat(parseRssXml(xml, 'Yahoo Finance'));
      }
    } catch (e) {
      console.error(`Yahoo news fetch error for ${symbol}:`, e);
    }

    // Source 2: Google News RSS queries
    const queryTerms = [
      `${companyName} stock India`,
      `${cleanSymbol} share price India`,
      `${companyName}`
    ];

    for (const term of queryTerms) {
      if (articles.length >= 10) break;
      const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=en-IN&gl=IN&ceid=IN:en`;
      try {
        const res = await fetch(gUrl, { headers });
        if (res.ok) {
          const xml = await res.text();
          const parsed = parseRssXml(xml, 'Google News');
          articles = articles.concat(parsed);
        }
      } catch (e) {
        console.error(`Google news fetch error for ${term}:`, e);
      }
    }

    // Deduplicate articles by title similarity
    const seen = new Set<string>();
    const uniqueArticles: StockNewsArticle[] = [];

    for (const art of articles) {
      const key = art.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueArticles.push(art);
      }
    }

    // Format Evidence-backed "Why?" Summary
    let whySummary = 'No confirmed reason found.';

    // Catalysts regex targeting verifiable events reported in fetched news
    const catalystRegex = /(earnings|profit|loss|revenue|q1|q2|q3|q4|result|ebitda|margin|block deal|stake|acquisition|merger|order|contract|deal|dividend|upgrade|downgrade|target|brokerage|buy rating|sell rating|ceo|cfo|management|fda|approval|regulatory|sanction|surge|jump|rally|gain|fall|drop|slump|plunge|dip)/i;

    const catalystArticle = uniqueArticles.find(a => catalystRegex.test(a.title + ' ' + a.description));
    if (catalystArticle) {
      const cleanTitle = catalystArticle.title.replace(/\s+-\s+[^-]+$/, '');
      whySummary = `Evidence from ${catalystArticle.source}: "${cleanTitle}"`;
    }

    const microTags = NewsService.generateMicroTags({
      symbol,
      companyName,
      articles: uniqueArticles
    });

    return {
      symbol,
      companyName,
      whySummary,
      microTags,
      articles: uniqueArticles.slice(0, 10)
    };
  }

  static generateMicroTags(params: {
    symbol: string;
    companyName: string;
    currentPrice?: number;
    high52W?: number;
    low52W?: number;
    percentChange1D?: number;
    articles?: StockNewsArticle[];
  }): string[] {
    const tags: string[] = [];
    const price = params.currentPrice || 0;
    const high52 = params.high52W || 0;
    const low52 = params.low52W || 0;
    const pct = params.percentChange1D || 0;
    const text = (params.articles || []).map(a => a.title + ' ' + a.description).join(' ').toLowerCase();

    // 1. Specific News Catalysts
    if (/q1|q2|q3|q4|earnings|profit|revenue|results/i.test(text)) {
      if (/beat|surge|jump|strong|soar|higher/i.test(text)) {
        tags.push('#Q1_Earnings_Beat');
      } else {
        tags.push('#Earnings_Report');
      }
    }

    if (/block deal|stake sale|bulk deal/i.test(text)) {
      tags.push('#Block_Deal_Detected');
    }

    if (/rbi|policy|repo rate|fed|monetary/i.test(text)) {
      tags.push('#RBI_Policy_Impact');
    }

    if (/upgrade|target price|buy rating|overweight|bullish/i.test(text)) {
      tags.push('#Brokerage_Upgrade');
    }

    if (/order|contract|bagged|win/i.test(text)) {
      tags.push('#Order_Win');
    }

    if (/dividend|bonus|payout/i.test(text)) {
      tags.push('#Dividend_Announced');
    }

    if (/ceo|cfo|management|resigned|appointed|exit/i.test(text)) {
      tags.push('#Management_Change');
    }

    // 2. Technical Breakout & Movement Catalysts
    if (high52 > 0 && price >= high52 * 0.99) {
      tags.push('#52W_High_Breakout');
    } else if (low52 > 0 && price > 0 && price <= low52 * 1.01) {
      tags.push('#52W_Low_Breakout');
    }

    if (pct >= 2.5 && !tags.includes('#52W_High_Breakout')) {
      tags.push('#Surge_Alert');
    } else if (pct <= -2.5 && !tags.includes('#52W_Low_Breakout')) {
      tags.push('#Drop_Alert');
    }

    // Default fallbacks if no specific trigger
    if (tags.length === 0) {
      if (pct > 0) tags.push('#Steady_Gain');
      else if (pct < 0) tags.push('#Market_Consolidation');
      else tags.push('#Range_Bound');
    }

    return tags.slice(0, 2);
  }
}
