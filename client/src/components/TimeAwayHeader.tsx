import React from 'react';
import { Clock, CheckCheck, RefreshCw, Calendar, Sparkles } from 'lucide-react';

interface Props {
  daysAway: number;
  lastCheckTime: string;
  onMarkSeen: () => void;
  onRefresh: () => void;
  isMarkingSeen: boolean;
  totalNeedsAttention: number;
  totalWatchlistCount?: number;
}

export const TimeAwayHeader: React.FC<Props> = ({
  daysAway,
  lastCheckTime,
  onMarkSeen,
  onRefresh,
  isMarkingSeen,
  totalNeedsAttention,
  totalWatchlistCount = 0,
}) => {
  const formattedDate = lastCheckTime
    ? new Date(lastCheckTime).toLocaleString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  const isEmpty = totalWatchlistCount === 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-2xl mb-8">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-950/80 border border-blue-800/60 text-blue-300 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Since You Last Checked</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            {isEmpty ? (
              <span>Welcome to MarketPulse</span>
            ) : (
              <>
                You were away for{' '}
                <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  {daysAway} {daysAway === 1 ? 'day' : 'days'}
                </span>
              </>
            )}
          </h1>

          <p className="text-sm md:text-base text-slate-300 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {isEmpty ? (
                'Search and add stocks to build your personal watchlist.'
              ) : (
                <>
                  Baseline set on <strong className="text-slate-100">{formattedDate}</strong>. Here is what shifted and what you can safely ignore.
                </>
              )}
            </span>
          </p>

          {totalNeedsAttention > 0 && (
            <div className="pt-1 flex items-center space-x-2 text-xs font-medium text-rose-400">
              <Sparkles className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>{totalNeedsAttention} {totalNeedsAttention === 1 ? 'stock requires' : 'stocks require'} your immediate attention.</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={onRefresh}
            className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition border border-slate-700/60 flex items-center space-x-2 shadow-sm"
            title="Fetch updated market data"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span>Refresh</span>
          </button>

          {!isEmpty && (
            <button
              onClick={onMarkSeen}
              disabled={isMarkingSeen}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-lg shadow-blue-600/25 flex items-center space-x-2 disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{isMarkingSeen ? 'Updating Baseline...' : 'Mark All as Seen'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

