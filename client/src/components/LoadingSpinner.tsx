import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  message?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ message = 'Analyzing market changes...' }) => (
  <div className="flex flex-col items-center justify-center py-20 space-y-4">
    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    <p className="text-slate-400 text-sm font-medium animate-pulse">{message}</p>
  </div>
);
