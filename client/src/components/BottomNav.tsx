import React from 'react';
import { LineChart, LayoutGrid, PieChart, Wallet } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-slate-900/50 flex justify-around items-center h-[68px] px-2 z-50">
      <NavItem icon={<LineChart className="w-5 h-5" />} label="Stocks" active />
    </div>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <button className={`flex flex-col items-center justify-center space-y-1.5 min-w-[64px] ${active ? 'text-blue-500' : 'text-slate-500 hover:text-slate-400'}`}>
    {icon}
    <span className="text-[10px] font-semibold tracking-wide">{label}</span>
  </button>
);
