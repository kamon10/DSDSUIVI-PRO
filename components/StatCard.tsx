
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold ${isWarning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
          {stats.percentage.toFixed(2)}%
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-slate-800">{stats.realized.toLocaleString()}</span>
        <span className="text-slate-400 text-sm">/ {stats.objective.toLocaleString()}</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6">
        <div 
          className="h-2.5 rounded-full transition-all duration-1000" 
          style={{ width: `${Math.min(stats.percentage, 100)}%`, backgroundColor: color }}
        ></div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-medium">Fixe</p>
          <p className="text-sm font-semibold text-slate-700">{stats.fixed.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-medium">Mobile</p>
          <p className="text-sm font-semibold text-slate-700">{stats.mobile.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};
