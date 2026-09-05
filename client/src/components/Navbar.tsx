import React from 'react';
import { Activity, LogOut, Sliders, ShieldCheck, Zap } from 'lucide-react';
import { UserSession } from '../types';

interface Props {
  session: UserSession | null;
  onLogout: () => void;
  onOpenWatchlistManager: () => void;
  watchlistCount: number;
}

export const Navbar: React.FC<Props> = ({
  session,
  onLogout,
  onOpenWatchlistManager,
  watchlistCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-white">MarketPulse</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 font-bold border border-blue-800/50">
                MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Smart Indian Stock Watchlist
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {session?.isDemo && (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-amber-950/50 border border-amber-800/50 text-amber-300 rounded-full text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Demo Mode</span>
            </div>
          )}

          {session && (
            <>
              <button
                onClick={onOpenWatchlistManager}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white rounded-xl text-xs sm:text-sm font-semibold transition border border-slate-700/60 flex items-center space-x-2 shadow-sm"
              >
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Watchlist ({watchlistCount})</span>
              </button>

              <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

              <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="max-w-[140px] truncate">{session.email}</span>
              </div>

              <button
                onClick={onLogout}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
