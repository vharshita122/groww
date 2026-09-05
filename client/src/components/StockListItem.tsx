import React, { useMemo } from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { Trash2 } from 'lucide-react';
import { WatchlistStockData } from '../types';

interface Props {
  stock: WatchlistStockData;
  sortMode: string;
  onClick: (symbol: string) => void;
  onRemove?: (symbol: string) => void;
  onOpenNews?: (stock: WatchlistStockData) => void;
}

export const StockListItem: React.FC<Props> = ({ stock, sortMode, onClick, onRemove, onOpenNews }) => {
  let displayChange = stock.change1D;
  let displayPercent = stock.percentChange1D;

  if (sortMode === '52W_HIGH') {
    displayChange = stock.currentPrice - stock.high52W;
    displayPercent = stock.high52W > 0 ? (stock.currentPrice / stock.high52W - 1) * 100 : 0;
  } else if (sortMode === '52W_LOW') {
    displayChange = stock.currentPrice - stock.low52W;
    displayPercent = stock.low52W > 0 ? (stock.currentPrice / stock.low52W - 1) * 100 : 0;
  } else if (sortMode === 'SINCE_LAST_SEEN') {
    displayChange = stock.sinceLastSeenChange;
    displayPercent = stock.sinceLastSeenPercent;
  }

  const isNoBaseline = sortMode === 'SINCE_LAST_SEEN' && !stock.hasBaseline;
  const isPositive = displayPercent >= 0;
  const color = isNoBaseline ? '#94a3b8' : isPositive ? '#00D09C' : '#EB5B3C';
  const pctFormatted = `${isPositive ? '+' : ''}${displayPercent.toFixed(2)}%`;

  let shiftText = '';
  let shiftColor = isPositive ? 'text-brand-green' : 'text-brand-red';

  if (sortMode === '52W_HIGH') {
    const highStr = stock.high52W > 0 ? stock.high52W.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A';
    shiftText = `52H ₹${highStr} (${pctFormatted})`;
  } else if (sortMode === '52W_LOW') {
    const lowStr = stock.low52W > 0 ? stock.low52W.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'N/A';
    shiftText = `52L ₹${lowStr} (${pctFormatted})`;
  } else if (sortMode === 'SINCE_LAST_SEEN') {
    if (stock.hasBaseline) {
      const absChange = Math.abs(stock.sinceLastSeenChange).toFixed(2);
      const sign = stock.sinceLastSeenChange >= 0 ? '+' : '-';
      shiftText = `Seen: ${sign}${absChange} (${pctFormatted})`;
    } else {
      shiftText = `Seen: — (No previous data)`;
      shiftColor = 'text-slate-400';
    }
  } else {
    const absShift = Math.abs(displayChange).toFixed(2);
    shiftText = `${isPositive ? '+' : '-'}${absShift} (${pctFormatted})`;
  }

  // Dynamic sparkline curve calculation
  const sparklineData = useMemo(() => {
    const price = stock.currentPrice > 0 ? stock.currentPrice : 100;
    const change = stock.change1D;
    const openPrice = price - change;
    const isUp = change >= 0;
    const magnitude = Math.abs(change) > 0 ? Math.abs(change) : price * 0.008;

    return [
      { val: openPrice },
      { val: openPrice + (isUp ? magnitude * 0.25 : -magnitude * 0.25) },
      { val: openPrice + (isUp ? -magnitude * 0.15 : magnitude * 0.15) },
      { val: openPrice + (isUp ? magnitude * 0.70 : -magnitude * 0.70) },
      { val: openPrice + (isUp ? magnitude * 0.45 : -magnitude * 0.45) },
      { val: openPrice + (isUp ? magnitude * 0.85 : -magnitude * 0.85) },
      { val: price }
    ];
  }, [stock.currentPrice, stock.change1D]);

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(stock.symbol);
    }
  };

  const handleNewsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenNews) {
      onOpenNews(stock);
    }
  };

  return (
    <div 
      onClick={() => onClick(stock.symbol)}
      className="group flex items-center justify-between py-3.5 px-4 border-b border-brand-border hover:bg-brand-surface/70 active:bg-brand-surface transition cursor-pointer"
    >
      {/* Left: Stock Symbol & Company Name */}
      <div className="flex-1 min-w-0 pr-2">
        <h3 className="text-sm font-bold text-white truncate">{stock.symbol.replace('.NS', '')}</h3>
        <p className="text-[11px] text-brand-textMuted truncate mt-0.5">{stock.companyName}</p>
      </div>

      {/* Center: Dynamic Sparkline Mini Chart */}
      <div className="w-20 h-9 mx-2 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <YAxis domain={[(min: number) => min * 0.999, (max: number) => max * 1.001]} hide />
            <Line 
              type="monotone" 
              dataKey="val" 
              stroke={color} 
              strokeWidth={1.8} 
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Center-Right: Minimal Neutral Plain Text News Action */}
      {onOpenNews && (
        <div className="flex flex-col items-start justify-center ml-1.5 mr-3 flex-shrink-0">
          <button
            onClick={handleNewsClick}
            className="text-slate-400 hover:text-slate-200 transition text-[10px] font-normal underline underline-offset-2 decoration-slate-600 hover:decoration-slate-400"
            title={`View real news for ${stock.symbol}`}
          >
            News
          </button>
        </div>
      )}

      {/* Right: Price & Daily Change */}
      <div className="flex items-center space-x-3 text-right flex-shrink-0">
        <div>
          <div className="text-sm font-extrabold text-white tracking-tight">
            ₹{stock.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-[11px] font-bold mt-0.5 ${shiftColor}`}>
            {shiftText}
          </div>
        </div>

        {/* Remove Stock Action */}
        {onRemove && (
          <button
            onClick={handleRemoveClick}
            title={`Remove ${stock.symbol} from watchlist`}
            className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
