import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<Props> = ({ message, onRetry }) => (
  <div className="p-6 bg-red-950/40 border border-red-800/50 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-red-200">
    <div className="flex items-center space-x-3">
      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
      <div>
        <h4 className="font-semibold text-red-100">Unable to update dashboard</h4>
        <p className="text-sm text-red-300/80">{message}</p>
      </div>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-900/60 hover:bg-red-800/80 text-white rounded-lg text-sm font-medium transition flex items-center space-x-2 shrink-0"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    )}
  </div>
);
