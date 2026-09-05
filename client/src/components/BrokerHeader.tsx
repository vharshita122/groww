import React, { useState, useEffect } from 'react';
import { Search, User } from 'lucide-react';
import { UserSession } from '../types';
import { api } from '../services/api';

interface IndexItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
}

interface Props {
  session: UserSession;
  onLogout: () => void;
  watchlistCount?: number;
}

export const BrokerHeader: React.FC<Props> = ({ session, onLogout, watchlistCount = 0 }) => {
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchIndices = async () => {
      try {
        const data = await api.getMarketIndices();
        if (mounted && Array.isArray(data) && data.length > 0) {
          setIndices(data);
        }
      } catch (err) {
        console.error('Failed to load indices:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchIndices();
    const interval = setInterval(fetchIndices, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);


  return (
    <div className="bg-[#0a0a0a] pt-4 pb-0 flex flex-col border-b border-slate-900/50 sticky top-0 z-40">
      {/* Top row: Logo + Search + Profile */}
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex items-center space-x-3">
          <img src="/groww-logo.svg" alt="Groww" className="w-9 h-9 shadow-lg" />
          <h1 className="text-xl font-bold text-white tracking-tight">Stocks</h1>
        </div>

        <div className="flex items-center space-x-4">
          <button className="text-slate-400 hover:text-white transition">
            <Search className="w-5 h-5" />
          </button>
          <div className="relative group">
            <button className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
              <User className="w-5 h-5 text-slate-400" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-3 border-b border-slate-800">
                <p className="text-sm font-semibold text-white truncate">{session.email.split('@')[0] || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{session.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-800/80 rounded-lg transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indices row */}
      <div className="flex items-center px-4 space-x-6 pb-4 overflow-x-auto hide-scrollbar min-h-[36px]">
        {loading && indices.length === 0 ? (
          <div className="flex items-center space-x-6 animate-pulse">
            <div className="h-4 w-28 bg-slate-800 rounded"></div>
            <div className="h-4 w-28 bg-slate-800 rounded"></div>
          </div>
        ) : (
          indices.map(idx => {
            const isPos = idx.change >= 0;
            const bgClass = isPos ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400';
            const sign = isPos ? '+' : '';
            return (
              <div key={idx.symbol} className="flex items-center space-x-2 whitespace-nowrap">
                <span className="text-xs font-semibold text-slate-400">{idx.name}</span>
                <span className="text-xs font-bold text-white">
                  {idx.price ? idx.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bgClass}`}>
                  {sign}{idx.change ? idx.change.toFixed(2) : '0.00'}
                </span>
              </div>
            );
          })
        )}
      </div>


      {/* Tabs Row */}
      <div className="flex items-center px-4 space-x-6 overflow-x-auto hide-scrollbar border-t border-slate-900/30 pt-2">
        <TabItem label="My Watchlist" active />
        {watchlistCount > 0 && <TabItem label={`${watchlistCount}`} />}
      </div>
    </div>
  );
};

const TabItem = ({ label, active = false }: { label: string, active?: boolean }) => (
  <button className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors relative ${active ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}>
    {label}
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full" />
    )}
  </button>
);

