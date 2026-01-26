
import React, { useState, useMemo } from 'react';
import { DashboardData, SiteRecord } from '../types';
import { Trophy, TrendingDown, Globe, MapPin, Mail, Phone, X, User, CheckCircle2, AlertTriangle, XCircle, BarChart, ExternalLink } from 'lucide-react';
import { SITES_DATA } from '../constants';

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
      
      {/* MODAL DE DÉTAILS RÉGIONAUX (LA BULLE) */}
      {selectedRegion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedRegionName(null)}></div>
          
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            {/* Header Modal */}
            <div className="bg-slate-900 p-8 lg:p-10 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/40">
                  <MapPin size={32} />
                </div>
                <div>
                  <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter">{selectedRegion.originalName}</h3>
                  <div className="flex items-center gap-3 mt-1 opacity-60">
                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedRegion.sites.length} Structures rattachées</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRegionName(null)}
                className="w-12 h-12 bg-white/10 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all group"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Corps Modal - Liste des Sites */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 bg-slate-50">
              <div className="grid grid-cols-1 gap-4">
                {selectedRegion.sites.map((site, sIdx) => {
                  const achievement = site.objMensuel > 0 ? (site.totalMois / site.objMensuel) * 100 : 0;
                  const getStatusColor = (p: number) => {
                    if (p >= 100) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
                    if (p >= 70) return 'text-orange-500 bg-orange-50 border-orange-100';
                    return 'text-red-500 bg-red-50 border-red-100';
                  };
                  const StatusIcon = achievement >= 100 ? CheckCircle2 : achievement >= 70 ? AlertTriangle : XCircle;

                  return (
                    <div key={sIdx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        {/* Info Site & Performance */}
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{site.name}</h4>
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase mt-2 ${getStatusColor(achievement)}`}>
                                <StatusIcon size={12} />
                                {achievement.toFixed(1)}% de l'objectif mensuel
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-slate-900">{site.totalMois.toLocaleString()}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Poches ce mois</p>
                            </div>
                          </div>
                          
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${achievement >= 100 ? 'bg-emerald-500' : achievement >= 70 ? 'bg-orange-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(achievement, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Fiche Responsable */}
                        <div className="lg:w-1/3 bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                              <User size={18} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Responsable Site</p>
                              <p className="text-[11px] font-black text-slate-700 uppercase leading-tight">{site.manager || "Non assigné"}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {site.phone && (
                              <a href={`tel:${site.phone}`} className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors">
                                <Phone size={14} />
                                <span className="text-[10px] font-black uppercase">Appeler</span>
                              </a>
                            )}
                            {site.email && (
                              <a href={`mailto:${site.email}`} className="flex-1 h-10 bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 transition-colors">
                                <Mail size={14} />
                                <span className="text-[10px] font-black uppercase">Email</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
              <button 
                onClick={() => setSelectedRegionName(null)}
                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
              >
                Fermer les détails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERFORMANCE ANNUELLE PAR RÉGION (ORANGE/RED THEME) */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="flex items-center gap-5 mb-10">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Globe size={28} />
          </div>
          <div>
            <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Objectifs Annuels par Région</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Cliquez sur une région pour voir les détails des sites</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regionPerformance.map((reg, idx) => {
            const isSelected = selectedRegionName === reg.originalName;
            return (
              <button 
                key={idx} 
                onClick={() => setSelectedRegionName(reg.originalName)}
                className={`text-left rounded-[2.25rem] p-8 border-2 transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden group ${
                  isSelected ? 'bg-slate-900 border-slate-900 shadow-2xl scale-[1.05] z-10' : 'bg-slate-50 border-slate-100 hover:border-orange-200 hover:bg-white'
                }`}
              >
                <div className="flex justify-between items-center mb-6">
                  <span className={`font-black text-base uppercase truncate pr-4 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {reg.displayName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${isSelected ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'}`}>
                      {reg.annualPercentage.toFixed(1)}%
                    </span>
                    {!isSelected && <ExternalLink size={14} className="text-slate-300 group-hover:text-orange-400 transition-colors" />}
                  </div>
                </div>
                
                <div className={`w-full h-2.5 rounded-full overflow-hidden mb-6 ${isSelected ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full transition-all duration-1000 ${isSelected ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${Math.min(reg.annualPercentage, 100)}%` }} 
                  />
                </div>
                
                <div className="flex justify-between items-end">
                  <div>
                    <p className={`text-[9px] font-bold uppercase mb-1 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>Réalisé Annuel</p>
                    <p className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-slate-700'}`}>{reg.annualRealized.toLocaleString()}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                    <BarChart size={18} className={isSelected ? 'text-orange-400' : 'text-slate-300'} />
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
