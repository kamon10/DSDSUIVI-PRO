
import React from 'react';
import { DashboardData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Trophy, TrendingDown, Target, Building2, Truck, Globe, BarChart2 } from 'lucide-react';
import { SITES_DATA } from '../constants';

interface PerformanceViewProps {
  data: DashboardData;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ data }) => {
  // Aplatir tous les sites pour le classement
  const allSites = data.regions.flatMap(r => r.sites.map(s => ({
    ...s,
    region: r.name,
    achievement: s.objMensuel > 0 ? (s.totalMois / s.objMensuel) * 100 : 0
  })));

  const topSites = [...allSites].sort((a, b) => b.achievement - a.achievement).slice(0, 5);
  const bottomSites = [...allSites].sort((a, b) => a.achievement - b.achievement).slice(0, 5);

  const regionPerformance = data.regions.map(r => {
    const totalMois = r.sites.reduce((acc, s) => acc + s.totalMois, 0);
    // On récupère l'objectif annuel de la région via le référentiel SITES_DATA
    const regionAnnualObj = SITES_DATA
      .filter(s => s.region === r.name)
      .reduce((acc, s) => acc + s.annualObjective, 0);
    
    const regionMonthlyObj = Math.round(regionAnnualObj / 12);

    return {
      name: r.name.replace('PRES ', '').replace('DIRECTION ', 'DIR. '),
      achievement: regionMonthlyObj > 0 ? Math.round((totalMois / regionMonthlyObj) * 100) : 0,
      realized: totalMois,
      annualRealized: totalMois, // En Janvier, réalisé annuel = réalisé mensuel
      annualObjective: regionAnnualObj,
      annualPercentage: regionAnnualObj > 0 ? (totalMois / regionAnnualObj) * 100 : 0
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Globe size={24} /></div>
          <div>
            <h3 className="font-black text-xl uppercase tracking-tighter">Objectifs Annuels par Région</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Progression vers la cible de {data.year}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regionPerformance.map((reg, idx) => (
            <div key={idx} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="font-black text-slate-800 text-sm uppercase truncate pr-4">{reg.name}</span>
                <span className="text-xs font-black text-indigo-600">{reg.annualPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(reg.annualPercentage, 100)}%` }} />
              </div>
              <div className="flex justify-between items-end">
                <div><p className="text-[9px] font-bold text-slate-400 uppercase">Réalisé</p><p className="text-lg font-black text-slate-700">{reg.annualRealized.toLocaleString()}</p></div>
                <div className="text-right"><p className="text-[9px] font-bold text-slate-400 uppercase">Objectif</p><p className="text-sm font-bold text-slate-500">{reg.annualObjective.toLocaleString()}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl"><Trophy size={24} /></div>
            <div><h3 className="font-black text-xl uppercase tracking-tighter">Elite Performance</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Top 5 des meilleurs taux d'atteinte mensuels</p></div>
          </div>
          <div className="space-y-4">
            {topSites.map((site, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-black text-slate-300 w-6">#{i + 1}</span>
                  <div><p className="font-bold text-slate-800 leading-tight">{site.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{site.region}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-green-600">{site.achievement.toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{site.totalMois} poches</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><TrendingDown size={24} /></div>
            <div><h3 className="font-black text-xl uppercase tracking-tighter">Alertes de Flux</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sites nécessitant une attention</p></div>
          </div>
          <div className="space-y-4">
            {bottomSites.map((site, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-black text-slate-300 w-6">#{allSites.length - i}</span>
                  <div><p className="font-bold text-slate-800 leading-tight">{site.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{site.region}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-red-500">{site.achievement.toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Objectif Mensuel: {site.objMensuel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
