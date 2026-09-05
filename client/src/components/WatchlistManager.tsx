import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, Sliders } from 'lucide-react';
import { StockCatalogItem, WatchlistStockData } from '../types';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  activeStocks: WatchlistStockData[];
  onWatchlistChanged: () => void;
}

export const WatchlistManager: React.FC<Props> = ({
  isOpen,
  onClose,
  userId,
  activeStocks,
  onWatchlistChanged,
}) => {
  const [catalog, setCatalog] = useState<StockCatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSymbols = new Set(activeStocks.map(s => s.symbol));

  useEffect(() => {
    if (isOpen) {
      api.getAvailableStocks()
        .then(data => setCatalog(data))
        .catch(err => setError(err.message));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCatalog = catalog.filter(
    item =>
      item.symbol.toLowerCase().includes(search.toLowerCase()) ||
      item.companyName.toLowerCase().includes(search.toLowerCase()) ||
      item.sector.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (symbol: string) => {
    setLoadingSymbol(symbol);
    setError(null);
    try {
      await api.addStock(userId, symbol);
      await onWatchlistChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSymbol(null);
    }
  };

  const handleRemove = async (symbol: string) => {
    setLoadingSymbol(symbol);
    setError(null);
    try {
      await api.removeStock(userId, symbol);
      await onWatchlistChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSymbol(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-brand-bg rounded-3xl border border-brand-border shadow-2xl p-6 md:p-8 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-brand-surface border border-brand-border text-brand-blue">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Watchlist Management</h2>
              <p className="text-xs text-brand-textMuted font-medium">
                Add or remove stocks from your Indian market portfolio catalog
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-brand-textMuted hover:text-white rounded-xl hover:bg-brand-surface transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative my-4">
          <Search className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbol (e.g. RELIANCE, TCS, INFY, Banking...)"
            className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue transition"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/60 text-red-300 rounded-xl text-xs mb-3">
            {error}
          </div>
        )}

        {/* Catalog list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredCatalog.map(stock => {
            const isAdded = activeSymbols.has(stock.symbol);
            const isLoading = loadingSymbol === stock.symbol;

            return (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-brand-surface/60 border border-brand-border hover:border-brand-textMuted transition"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-white">{stock.symbol}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-surface border border-brand-border text-brand-textMuted font-medium">
                      {stock.sector}
                    </span>
                  </div>
                  <p className="text-xs text-brand-textMuted font-medium mt-0.5">{stock.companyName}</p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-brand-textMuted">Current</p>
                    <p className="text-sm font-bold text-white">₹{stock.currentPrice.toLocaleString('en-IN')}</p>
                  </div>

                  {isAdded ? (
                    <button
                      onClick={() => handleRemove(stock.symbol)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-brand-surface hover:bg-red-950 text-brand-text hover:text-brand-red border border-brand-border hover:border-brand-red rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAdd(stock.symbol)}
                      disabled={isLoading}
                      className="px-3.5 py-1.5 bg-brand-green hover:bg-emerald-500 text-brand-bg rounded-xl text-xs font-semibold transition flex items-center space-x-1 shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-brand-border mt-4 flex items-center justify-between text-xs text-brand-textMuted">
          <span>Active in Watchlist: <strong>{activeStocks.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-surface hover:bg-brand-border text-white font-semibold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
