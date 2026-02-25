
import React from 'react';
import { DonationStats } from '../types';

interface StatCardProps {
  title: string;
  subtitle: string;
  stats: DonationStats;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, subtitle, stats, color }) => {
  const isWarning = stats.percentage < 60;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col transition-all hover-lift interactive">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
          <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">{subtitle}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isWarning ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {stats.percentage.toFixed(1)}%
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-[950] text-slate-900 tracking-tighter">{stats.realized.toLocaleString()}</span>
        <span className="text-slate-300 text-xs font-black uppercase tracking-widest">/ {stats.objective.toLocaleString()}</span>
      </div>

      <div className="w-full bg-slate-50 rounded-full h-2 mb-8 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)" 
          style={{ width: `${Math.min(stats.percentage, 100)}%`, backgroundColor: color }}
        ></div>
      </div>

      <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
        <div className="flex flex-col gap-1">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Fixe</p>
          <p className="text-lg font-black text-slate-900 tracking-tight">{stats.fixed.toLocaleString()}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Mobile</p>
          <p className="text-lg font-black text-slate-900 tracking-tight">{stats.mobile.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};
