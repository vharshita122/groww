import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Newspaper, Sparkles, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { StockNewsResponse } from '../types';
import { api } from '../services/api';

interface Props {
  symbol: string | null;
  companyName?: string;
  onClose: () => void;
}

export const StockNewsModal: React.FC<Props> = ({ symbol, companyName, onClose }) => {
  const [data, setData] = useState<StockNewsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    fetchNews();
  }, [symbol]);

  const fetchNews = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStockNews(symbol);
      setData(res);
    } catch (err: any) {
      console.error('Error in StockNewsModal:', err);
      setError(err.message || 'Failed to load stock news');
    } finally {
      setLoading(false);
    }
  };

  if (!symbol) return null;

  const displaySymbol = symbol.replace('.NS', '');
  const displayCompany = companyName || data?.companyName || displaySymbol;

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

      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#0d0e12] border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/80 bg-[#12141a]/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-green/15 border border-brand-green/30 flex items-center justify-center text-brand-green">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">{displaySymbol}</h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Live News
                </span>
              </div>
              <p className="text-xs text-brand-textMuted">{displayCompany}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-3 border-brand-green border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-400">Fetching latest stock news & evidence...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-xl bg-red-950/30 border border-red-900/50 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm text-red-300 font-medium">{error}</p>
              <button
                onClick={fetchNews}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-900/40 hover:bg-red-800/50 text-red-200 text-xs font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <>
              {/* "Why?" Evidence Section */}
              <div className="rounded-xl border border-brand-border bg-[#141720] p-4 space-y-3 shadow-sm">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Sparkles className="w-4 h-4 text-brand-green" />
                  <span>Why Is It Moving?</span>
                </div>

                {data?.whySummary && data.whySummary !== 'No confirmed reason found.' ? (
                  <div className="p-3 rounded-lg bg-brand-green/10 border border-brand-green/30 text-brand-green text-sm font-medium leading-relaxed">
                    {data.whySummary}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-400 text-sm italic">
                    No confirmed reason found.
                    <span className="block text-[11px] not-italic text-slate-500 mt-0.5">
                      No verified financial catalyst or reason was explicitly confirmed in recent news.
                    </span>
                  </div>
                )}
              </div>

              {/* Latest Real News Articles */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Recent Headlines ({data?.articles.length || 0})
                </h3>

                {(!data?.articles || data.articles.length === 0) ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No recent news articles found for this stock.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.articles.map((article) => (
                      <a
                        key={article.id}
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block p-4 rounded-xl bg-[#12141b] border border-brand-border hover:border-brand-green/40 hover:bg-[#161922] transition duration-200"
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
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-brand-border/80 bg-[#101218] flex items-center justify-between text-[11px] text-slate-400">
          <span>Real-time news API feed via server</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
