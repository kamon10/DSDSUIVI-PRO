
import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { Trophy, TrendingDown, Target, Building2, Truck, Globe, ChevronDown, ChevronUp, MapPin, CheckCircle2, AlertTriangle, XCircle, ArrowRight, User, Mail, Phone } from 'lucide-react';
import { SITES_DATA, COLORS } from '../constants';

interface PerformanceViewProps {
  data: DashboardData;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ data }) => {
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);

  const allSites = useMemo(() => data.regions.flatMap(r => r.sites.map(s => ({
    ...s,
    region: r.name,
    achievement: s.objMensuel > 0 ? (s.totalMois / s.objMensuel) * 100 : 0
  }))), [data.regions]);

  const topSites = [...allSites].sort((a, b) => b.achievement - a.achievement).slice(0, 5);
  const bottomSites = [...allSites].sort((a, b) => a.achievement - b.achievement).slice(0, 5);

  const regionPerformance = useMemo(() => data.regions.map(r => {
    const totalMois = r.sites.reduce((acc, s) => acc + s.totalMois, 0);
    const regionAnnualObj = SITES_DATA
      .filter(s => s.region === r.name)
      .reduce((acc, s) => acc + s.annualObjective, 0);
    
    const regionMonthlyObj = Math.round(regionAnnualObj / 12);

    return {
      originalName: r.name,
      displayName: r.name.replace('PRES ', '').replace('DIRECTION ', 'DIR. '),
      achievement: regionMonthlyObj > 0 ? Math.round((totalMois / regionMonthlyObj) * 100) : 0,
      realized: totalMois,
      annualRealized: totalMois,
      annualObjective: regionAnnualObj,
      annualPercentage: regionAnnualObj > 0 ? (totalMois / regionAnnualObj) * 100 : 0,
      sites: r.sites
    };
  }), [data.regions]);

  const selectedRegion = useMemo(() => 
    regionPerformance.find(r => r.originalName === selectedRegionName)
  , [selectedRegionName, regionPerformance]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* PERFORMANCE ANNUELLE PAR RÉGION (ORANGE/RED THEME) */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="flex items-center gap-5 mb-10">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Globe size={28} />
          </div>
          <div>
            <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Objectifs Annuels par Région</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regionPerformance.map((reg, idx) => {
            const isSelected = selectedRegionName === reg.originalName;
            return (
              <button 
                key={idx} 
                onClick={() => setSelectedRegionName(isSelected ? null : reg.originalName)}
                className={`text-left rounded-[2.25rem] p-8 border-2 transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden group ${
                  isSelected ? 'bg-slate-900 border-slate-900 shadow-2xl' : 'bg-slate-50 border-slate-100 hover:border-orange-200 hover:bg-white'
                }`}
              >
                <div className="flex justify-between items-center mb-6">
                  <span className={`font-black text-base uppercase truncate pr-4 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {reg.displayName}
                  </span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${isSelected ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'}`}>
                    {reg.annualPercentage.toFixed(1)}%
                  </span>
                </div>
                
                <div className={`w-full h-2.5 rounded-full overflow-hidden mb-6 ${isSelected ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full transition-all duration-1000 ${isSelected ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${Math.min(reg.annualPercentage, 100)}%` }} 
                  />
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className={`text-[9px] font-bold uppercase mb-1 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>Réalisé</p>
                    <p className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-slate-700'}`}>{reg.annualRealized.toLocaleString()}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* CLASSEMENT ÉLITE & ALERTES (GREEN VS RED) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* TOP 5 SITES (GREEN) */}
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-center gap-5 mb-10 relative z-10">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Trophy size={28} />
            </div>
            <div>
              <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Elite Performance</h3>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Les 5 meilleurs taux Verts</p>
            </div>
          </div>
          
          <div className="space-y-4 relative z-10">
            {topSites.map((site, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all group/item">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-emerald-600">
                    {i + 1}
                  </div>
                  <p className="font-black text-slate-800 uppercase tracking-tight">{site.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600">{site.achievement.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM 5 SITES (RED) */}
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-center gap-5 mb-10 relative z-10">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
              <TrendingDown size={28} />
            </div>
            <div>
              <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Alertes de Flux</h3>
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-1">Sites en zone Rouge</p>
            </div>
          </div>
          
          <div className="space-y-4 relative z-10">
            {bottomSites.map((site, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all group/item">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-red-600">
                    !
                  </div>
                  <p className="font-black text-slate-800 uppercase tracking-tight">{site.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-red-500">{site.achievement.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
