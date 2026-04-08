
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
    <div className="card-professional p-8 flex flex-col bg-white/80 backdrop-blur-sm group">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-[10px] font-display font-black text-slate-400 uppercase tracking-[0.25em] mb-1">{title}</h3>
          <p className="text-[10px] font-display font-bold text-slate-300 uppercase tracking-widest">{subtitle}</p>
        </div>
        <div className={`px-4 py-1.5 rounded-xl text-[11px] font-display font-black uppercase tracking-widest shadow-sm ${isWarning ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
          {stats.percentage.toFixed(1)}%
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-5xl font-display font-black text-slate-950 tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500">{stats.realized.toLocaleString()}</span>
        <span className="text-slate-400 text-[11px] font-display font-black uppercase tracking-[0.2em] opacity-50">/ {stats.objective.toLocaleString()}</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-3 mb-10 overflow-hidden shadow-inner">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.1)]" 
          style={{ width: `${Math.min(stats.percentage, 100)}%`, backgroundColor: color }}
        ></div>
      </div>

      <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-slate-400 uppercase font-display font-black tracking-[0.2em]">Fixe</p>
          <p className="text-2xl font-display font-black text-slate-950 tracking-tight">{stats.fixed.toLocaleString()}</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-slate-400 uppercase font-display font-black tracking-[0.2em]">Mobile</p>
          <p className="text-2xl font-display font-black text-slate-950 tracking-tight">{stats.mobile.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};
