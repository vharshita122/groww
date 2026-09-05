import React, { useEffect, useState } from 'react';
import { ArrowLeft, Maximize, ExternalLink, Sparkles, Newspaper, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { WatchlistStockData, StockNewsResponse } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Props {
  stock: WatchlistStockData;
  onClose: () => void;
}

export const StockDetailPage: React.FC<Props> = ({ stock, onClose }) => {
  const [history, setHistory] = useState<{ timestamp: string, price: number }[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [range, setRange] = useState('1D'); // '1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'All'
  
  const [newsData, setNewsData] = useState<StockNewsResponse | null>(null);
  const [loadingNews, setLoadingNews] = useState(true);

  const isPositive = stock.percentChange1D >= 0;
  const isUnavailable = stock.currentPrice === 0;
  const color = isUnavailable ? '#94a3b8' : isPositive ? '#00D09C' : '#EB5B3C';

  // Fetch real price history chart data
  useEffect(() => {
    if (isUnavailable) {
      setLoadingChart(false);
      return;
    }
    
    let isMounted = true;
    const fetchHistory = async () => {
      setLoadingChart(true);
      try {
        const res = await api.getStockHistory(stock.symbol, range);
        if (isMounted) setHistory(res.history);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        if (isMounted) setLoadingChart(false);
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [stock.symbol, range, isUnavailable]);

  // Fetch real stock news from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchNews = async () => {
      setLoadingNews(true);
      try {
        const data = await api.getStockNews(stock.symbol);
        if (isMounted) setNewsData(data);
      } catch (err) {
        console.error('Failed to fetch news for detail page:', err);
      } finally {
        if (isMounted) setLoadingNews(false);
      }
    };
    fetchNews();
    return () => { isMounted = false; };
  }, [stock.symbol]);

  const pctFormatted = isUnavailable ? 'N/A' : `${isPositive ? '+' : ''}${stock.percentChange1D.toFixed(2)}%`;
  const absShift = isUnavailable ? '0.00' : Math.abs(stock.change1D).toFixed(2);
  const shiftText = isUnavailable ? 'Unavailable' : `${isPositive ? '+' : '-'}${absShift} (${pctFormatted}) ${range}`;

  const formatPubDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-bg flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6 border-b border-brand-border/60">
        <div className="flex items-center space-x-4">
          <button onClick={onClose} className="p-2 -ml-2 text-white hover:bg-brand-surface rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
               <div className="w-6 h-6 rounded-full bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-[10px] font-bold text-brand-green shadow-lg">
                 {stock.symbol.substring(0, 1)}
               </div>
               <h2 className="text-sm font-bold text-brand-textMuted">{stock.symbol.replace('.NS', '')} • NSE</h2>
            </div>
            <h1 className="text-lg font-bold text-white mt-1 leading-none">{stock.companyName}</h1>
          </div>
        </div>
      </div>

      {/* Main Scrollable View */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Price Area */}
        <div className="px-5 pt-6 pb-2">
          <h1 className="text-4xl font-black text-white tracking-tight">
            {isUnavailable ? 'Price Unavailable' : `₹${stock.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </h1>
          {!isUnavailable && (
            <div className="flex items-center space-x-2 mt-2">
              <span className={`text-sm font-semibold ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}>
                {shiftText}
              </span>
            </div>
          )}
        </div>

        {/* Chart Area */}
        <div className="h-64 w-full mt-4 relative">
          {loadingChart ? (
            <LoadingSpinner message="Loading live chart..." />
          ) : isUnavailable ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Chart data unavailable
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={['auto', 'auto']} hide />
                <XAxis dataKey="timestamp" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#2b2b2b', borderRadius: '8px' }}
                  itemStyle={{ color: '#f1f1f1', fontWeight: 'bold' }}
                  labelFormatter={() => ''}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Price']}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke={color} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorGradient)" 
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <button className="absolute bottom-4 right-4 p-2 bg-brand-surface/80 rounded-full border border-brand-border text-brand-textMuted hover:text-white transition">
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* Time Range Selectors */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-brand-border">
          {['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'All'].map(t => (
            <button 
              key={t}
              onClick={() => setRange(t)}
              className={`text-xs font-bold ${range === t ? 'text-brand-green' : 'text-brand-textMuted hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Dynamic Content Sections */}
        <div className="p-5 space-y-6">
          {/* Since Last Seen Baseline Snapshot */}
          <div className="p-4 bg-brand-surface/90 rounded-xl border border-brand-border">
            <h3 className="text-white font-bold text-sm mb-2 flex items-center justify-between">
              <span>Since You Last Checked</span>
              {stock.hasBaseline && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 font-semibold uppercase">
                  Session Baseline
                </span>
              )}
            </h3>
            {stock.hasBaseline ? (
              <div className="text-sm text-brand-textMuted space-y-1">
                <p>Snapshot Price: <span className="text-white font-semibold">₹{stock.lastSeenPrice ? stock.lastSeenPrice.toFixed(2) : '—'}</span></p>
                <p>Saved: <span className="text-slate-400">{stock.lastSeenAt ? new Date(stock.lastSeenAt).toLocaleString('en-IN') : 'N/A'}</span></p>
                <p className="pt-1">
                  Change: {' '}
                  <span className={`font-bold ${stock.sinceLastSeenPercent >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                    {stock.sinceLastSeenChange >= 0 ? '+' : ''}{stock.sinceLastSeenChange.toFixed(2)} ({stock.sinceLastSeenPercent >= 0 ? '+' : ''}{stock.sinceLastSeenPercent.toFixed(2)}%)
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-brand-textMuted leading-relaxed">
                No previous session snapshot recorded.<br/>
                <span className="text-[11px] text-slate-400">Your snapshot baseline is saved automatically when you leave a session.</span>
              </p>
            )}
          </div>

          {/* Real Stock News & Evidence Section */}
          <div className="space-y-4">
            <div className="border-b border-brand-border/60 pb-3">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Live Stock News & Catalysts
              </h3>
            </div>

            {loadingNews ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Fetching real stock news...
              </div>
            ) : !newsData || newsData.articles.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-sm">
                No recent news articles found for this stock.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Evidence "Why" Banner */}
                {newsData.whySummary && newsData.whySummary !== 'No confirmed reason found.' && (
                  <div className="p-3.5 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-semibold leading-relaxed flex items-start space-x-2.5">
                    <Sparkles className="w-4 h-4 text-brand-green flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[10px] uppercase text-emerald-400 tracking-wider mb-0.5">Why Is It Moving?</span>
                      <span>{newsData.whySummary}</span>
                    </div>
                  </div>
                )}

                {/* Real Headlines List */}
                <div className="space-y-3">
                  {newsData.articles.map(article => (
                    <a
                      key={article.id}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block p-4 rounded-xl bg-[#12141b] border border-brand-border hover:border-brand-green/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-brand-green transition leading-snug">
                          {article.title}
                        </h4>
                        <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-brand-green flex-shrink-0 mt-0.5 transition" />
                      </div>
                      {article.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {article.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                        <span className="font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {article.source}
                        </span>
                        <span className="flex items-center space-x-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatPubDate(article.publishedAt)}</span>
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-4 border-t border-brand-border bg-brand-bg flex space-x-3 fixed bottom-0 left-0 right-0 z-20">
        <button className="flex-1 h-12 bg-brand-red hover:bg-red-500 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg transition">
          Sell
        </button>
        <button className="flex-1 h-12 bg-brand-green hover:bg-emerald-500 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg transition">
          Buy
        </button>
      </div>
    </div>
  );
};
