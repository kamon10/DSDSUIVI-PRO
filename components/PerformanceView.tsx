
import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { Trophy, TrendingDown, Target, Building2, Truck, Globe, ChevronDown, ChevronUp, MapPin, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { SITES_DATA } from '../constants';

interface PerformanceViewProps {
  data: DashboardData;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ data }) => {
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);

  // Aplatir tous les sites pour le classement global
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
      annualRealized: totalMois, // En Janvier, réalisé annuel = réalisé mensuel
      annualObjective: regionAnnualObj,
      annualPercentage: regionAnnualObj > 0 ? (totalMois / regionAnnualObj) * 100 : 0,
      sites: r.sites
    };
  }), [data.regions]);

  const selectedRegion = useMemo(() => 
    regionPerformance.find(r => r.originalName === selectedRegionName)
  , [selectedRegionName, regionPerformance]);

  const handleRegionClick = (name: string) => {
    setSelectedRegionName(selectedRegionName === name ? null : name);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* SECTION: PERFORMANCE ANNUELLE PAR RÉGION */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Globe size={28} />
            </div>
            <div>
              <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Objectifs Annuels par Région</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cibles {data.year} • Cliquez pour voir le détail des sites</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regionPerformance.map((reg, idx) => {
            const isSelected = selectedRegionName === reg.originalName;
            return (
              <button 
                key={idx} 
                onClick={() => handleRegionClick(reg.originalName)}
                className={`text-left rounded-[2.25rem] p-8 border-2 transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden group ${
                  isSelected ? 'bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white shadow-sm'
                }`}
              >
                {isSelected && (
                   <div className="absolute top-0 right-0 p-4">
                     <ChevronUp size={24} className="text-white/50" />
                   </div>
                )}
                {!isSelected && (
                   <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <ChevronDown size={20} className="text-indigo-400" />
                   </div>
                )}

                <div className="flex justify-between items-center mb-6">
                  <span className={`font-black text-base uppercase truncate pr-4 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {reg.displayName}
                  </span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    {reg.annualPercentage.toFixed(1)}%
                  </span>
                </div>
                
                <div className={`w-full h-2.5 rounded-full overflow-hidden mb-6 ${isSelected ? 'bg-white/10 shadow-inner' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full transition-all duration-1000 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} 
                    style={{ width: `${Math.min(reg.annualPercentage, 100)}%` }} 
                  />
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className={`text-[9px] font-bold uppercase mb-1 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>Réalisé</p>
                    <p className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-slate-700'}`}>{reg.annualRealized.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[9px] font-bold uppercase mb-1 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>Objectif</p>
                    <p className={`text-sm font-bold ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>{reg.annualObjective.toLocaleString()}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* AFFICHAGE DÉTAILLÉ DES SITES POUR LA RÉGION SÉLECTIONNÉE */}
        {selectedRegion && (
          <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-top-6 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter">Détail des Sites : {selectedRegion.displayName}</h4>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{selectedRegion.sites.length} sites opérationnels</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRegionName(null)}
                className="text-[10px] font-black uppercase text-white/50 hover:text-white transition-colors flex items-center gap-2"
              >
                Fermer <ChevronUp size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {selectedRegion.sites.map((site, sIdx) => {
                const achievement = site.objMensuel > 0 ? (site.totalMois / site.objMensuel) * 100 : 0;
                const gap = site.objMensuel - site.totalMois;
                
                const getStatus = (p: number) => {
                  if (p >= 95) return { label: 'Elite', color: 'text-green-400', bg: 'bg-green-400/10', icon: <CheckCircle2 size={12} /> };
                  if (p >= 75) return { label: 'Conforme', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: <Target size={12} /> };
                  return { label: 'Critique', color: 'text-red-400', bg: 'bg-red-400/10', icon: <AlertTriangle size={12} /> };
                };
                const status = getStatus(achievement);

                return (
                  <div key={sIdx} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h5 className="font-black text-sm text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{site.name}</h5>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${status.bg} ${status.color}`}>
                            {status.icon} {status.label}
                          </div>
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Code: {SITES_DATA.find(sd => sd.name === site.name)?.code || '---'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-white">{achievement.toFixed(1)}%</p>
                        <p className="text-[9px] font-bold text-white/30 uppercase">Atteinte Mensuelle</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
                      <div>
                        <p className="text-[8px] font-black text-white/40 uppercase mb-1">Cumul</p>
                        <p className="text-sm font-black text-white">{site.totalMois.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-white/40 uppercase mb-1">Cible</p>
                        <p className="text-sm font-black text-white/60">{site.objMensuel.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-white/40 uppercase mb-1">Reste</p>
                        <p className={`text-sm font-black ${gap <= 0 ? 'text-green-400' : 'text-red-400/80'}`}>
                          {gap <= 0 ? 'OK' : gap.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* SECTION: CLASSEMENT ÉLITE & ALERTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* TOP 5 SITES */}
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-center gap-5 mb-10 relative z-10">
            <div className="w-14 h-14 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Trophy size={28} />
            </div>
            <div>
              <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Elite Performance</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Les 5 meilleurs taux d'atteinte mensuels</p>
            </div>
          </div>
          
          <div className="space-y-4 relative z-10">
            {topSites.map((site, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-lg hover:scale-[1.02] group/item">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-slate-300 group-hover/item:text-yellow-600 group-hover/item:border-yellow-100 transition-colors">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 uppercase tracking-tight leading-tight">{site.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{site.region}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-green-600">{site.achievement.toFixed(1)}%</p>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase">{site.totalMois} POCHeS</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM 5 SITES */}
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex items-center gap-5 mb-10 relative z-10">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
              <TrendingDown size={28} />
            </div>
            <div>
              <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Alertes de Flux</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sites nécessitant un renforcement</p>
            </div>
          </div>
          
          <div className="space-y-4 relative z-10">
            {bottomSites.map((site, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-lg hover:scale-[1.02] group/item">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-slate-300 group-hover/item:text-red-600 group-hover/item:border-red-100 transition-colors">
                    {allSites.length - i}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 uppercase tracking-tight leading-tight">{site.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{site.region}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-red-500">{site.achievement.toFixed(1)}%</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Objectif: {site.objMensuel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
