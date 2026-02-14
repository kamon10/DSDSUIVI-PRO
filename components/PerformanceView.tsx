
import React, { useState, useMemo, useEffect } from 'react';
/* Added User import */
import { DashboardData, DistributionRecord, User as UserType } from '../types';
import { Trophy, TrendingDown, Globe, MapPin, Mail, Phone, X, User, CheckCircle2, AlertTriangle, XCircle, BarChart, ExternalLink, Building2, Truck, Activity, Package, Zap, Filter, Calendar, Clock, Target } from 'lucide-react';

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const getPerfColor = (p: number) => {
  if (p >= 100) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  if (p >= 75) return 'text-orange-500 bg-orange-50 border-orange-100';
  return 'text-red-500 bg-red-50 border-red-100';
};

const getStatusIcon = (p: number) => {
  if (p >= 100) return CheckCircle2;
  if (p >= 75) return AlertTriangle;
  return XCircle;
};

/* Added user prop to resolve TS error in App.tsx */
export const PerformanceView: React.FC<{ data: DashboardData; sites: any[]; user?: UserType | null }> = ({ data, sites, user }) => {
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);
  
  // --- ÉTATS DES FILTRES TEMPORELS ---
  const [timeScale, setTimeScale] = useState<'day' | 'month' | 'year'>('month');
  const [selYear, setSelYear] = useState<string>("");
  const [selMonth, setSelMonth] = useState<string>("");
  const [selDate, setSelDate] = useState<string>("");

  // Initialisation des filtres basés sur l'historique
  useEffect(() => {
    if (data.dailyHistory.length > 0) {
      const latest = data.dailyHistory[0];
      const parts = latest.date.split('/');
      setSelYear(parts[2]);
      setSelMonth((parseInt(parts[1]) - 1).toString());
      setSelDate(latest.date);
    }
  }, [data.dailyHistory]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.dailyHistory.forEach(h => years.add(h.date.split('/')[2]));
    return Array.from(years).sort().reverse();
  }, [data.dailyHistory]);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    data.dailyHistory.forEach(h => {
      const parts = h.date.split('/');
      if (parts[2] === selYear) months.add(parseInt(parts[1]) - 1);
    });
    return Array.from(months).sort();
  }, [data.dailyHistory, selYear]);

  const availableDates = useMemo(() => {
    return data.dailyHistory
      .filter(h => {
        const parts = h.date.split('/');
        return parts[2] === selYear && (parseInt(parts[1]) - 1).toString() === selMonth;
      })
      .map(h => h.date);
  }, [data.dailyHistory, selYear, selMonth]);

  // --- LOGIQUE DONATIONS (Toujours Mensuelle pour la cohérence des objectifs) ---
  const allSitesDonations = useMemo(() => data.regions.flatMap(r => r.sites.map(s => ({
    ...s,
    region: r.name,
    achievement: s.objMensuel > 0 ? (s.totalMois / s.objMensuel) * 100 : 0
  }))), [data.regions]);

  const regionPerformanceDonations = useMemo(() => data.regions.map(r => {
    const totalMois = r.sites.reduce((acc, s) => acc + s.totalMois, 0);
    const regionAnnualObj = sites.filter(s => s.region === r.name).reduce((acc, s) => acc + s.annualObjective, 0);
    const regionMonthlyObj = Math.round(regionAnnualObj / 12);
    return {
      originalName: r.name,
      displayName: r.name.replace('PRES ', '').replace('DIRECTION ', 'DIR. '),
      achievement: regionMonthlyObj > 0 ? (totalMois / regionMonthlyObj) * 100 : 0,
      realized: totalMois,
      annualRealized: totalMois,
      annualObjective: regionAnnualObj,
      annualPercentage: regionAnnualObj > 0 ? (totalMois / regionAnnualObj) * 100 : 0,
      sites: r.sites
    };
  }), [data.regions, sites]);

  // --- LOGIQUE DISTRIBUTION AVEC FILTRES ---
  const distributionData = useMemo(() => {
    if (!data.distributions?.records) return { allSites: [], regions: [] };

    // Filtrage des records selon la période sélectionnée
    const filteredRecords = data.distributions.records.filter(r => {
      const parts = r.date.split('/');
      const y = parts[2];
      const m = (parseInt(parts[1]) - 1).toString();
      const d = r.date;
      
      if (timeScale === 'day') return d === selDate;
      if (timeScale === 'month') return y === selYear && m === selMonth;
      return y === selYear;
    });

    const siteMap = new Map<string, any>();
    const regionMap = new Map<string, any>();

    filteredRecords.forEach(r => {
      // Agrégation Site
      if (!siteMap.has(r.site)) {
        siteMap.set(r.site, { name: r.site, region: r.region, total: 0, rendu: 0, cgr: 0, plasma: 0, platelets: 0 });
      }
      const s = siteMap.get(r.site);
      s.total += r.quantite;
      s.rendu += r.rendu;
      const p = r.typeProduit.toUpperCase();
      if (p.includes("CGR")) s.cgr += r.quantite;
      else if (p.includes("PLASMA")) s.plasma += r.quantite;
      else s.platelets += r.quantite;

      // Agrégation Région
      if (!regionMap.has(r.region)) {
        regionMap.set(r.region, { originalName: r.region, total: 0, rendu: 0 });
      }
      const reg = regionMap.get(r.region);
      reg.total += r.quantite;
      reg.rendu += r.rendu;
    });

    const allSites = Array.from(siteMap.values()).map(s => ({
      ...s,
      efficiency: s.total > 0 ? ((s.total - s.rendu) / s.total) * 100 : 0
    }));

    const regions = Array.from(regionMap.values()).map(r => ({
      ...r,
      displayName: r.originalName.replace('PRES ', '').replace('DIRECTION ', 'DIR. '),
      efficiency: r.total > 0 ? ((r.total - r.rendu) / r.total) * 100 : 0
    }));

    return { allSites, regions };
  }, [data.distributions, timeScale, selYear, selMonth, selDate]);

  // --- CLASSEMENTS FINAUX ---
  const topSites = useMemo(() => {
    if (viewMode === 'donations') {
      return [...allSitesDonations].sort((a, b) => b.achievement - a.achievement).slice(0, 5);
    } else {
      return [...distributionData.allSites].sort((a, b) => b.total - a.total).slice(0, 5);
    }
  }, [viewMode, allSitesDonations, distributionData]);

  const bottomSites = useMemo(() => {
    if (viewMode === 'donations') {
      return [...allSitesDonations].sort((a, b) => a.achievement - b.achievement).slice(0, 5);
    } else {
      return [...distributionData.allSites].sort((a, b) => b.total - a.total).slice(0, 5);
    }
  }, [viewMode, allSitesDonations, distributionData]);

  const selectedRegion = useMemo(() => {
    if (viewMode === 'donations') {
      return regionPerformanceDonations.find(r => r.originalName === selectedRegionName);
    } else {
      const reg = distributionData.regions.find(r => r.originalName === selectedRegionName);
      if (!reg) return null;
      // Pour la distribution, on filtre les sites qui appartiennent à cette région dans le registre
      const regionSites = distributionData.allSites.filter(s => s.region === selectedRegionName);
      return { ...reg, sites: regionSites };
    }
  }, [selectedRegionName, viewMode, regionPerformanceDonations, distributionData]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* SWITCH DE VUE */}
      <div className="flex flex-col items-center gap-6">
        <div className="bg-white p-1.5 rounded-3xl shadow-xl border border-slate-100 flex gap-2">
           <button onClick={() => { setViewMode('donations'); setSelectedRegionName(null); }} className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={16}/> Prélèvements
           </button>
           <button onClick={() => { setViewMode('distribution'); setSelectedRegionName(null); }} className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={16}/> Distribution
           </button>
        </div>

        {/* FILTRES TEMPORELS POUR DISTRIBUTION */}
        {viewMode === 'distribution' && (
          <div className="flex flex-wrap items-center justify-center gap-4 bg-white/50 backdrop-blur-sm p-3 rounded-[2rem] border border-slate-200 animate-in zoom-in duration-300">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['day', 'month', 'year'].map(s => (
                <button 
                  key={s} 
                  onClick={() => setTimeScale(s as any)} 
                  className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${timeScale === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {s === 'day' ? 'Jour' : s === 'month' ? 'Mois' : 'Année'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
               <div className="flex items-center gap-2 px-3 py-2 bg-white border rounded-xl shadow-sm">
                  <Calendar size={14} className="text-slate-400" />
                  <select value={selYear} onChange={(e) => setSelYear(e.target.value)} className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase">
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
               </div>
               {timeScale !== 'year' && (
                 <div className="flex items-center gap-2 px-3 py-2 bg-white border rounded-xl shadow-sm">
                    <Clock size={14} className="text-slate-400" />
                    <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} className="bg-transparent font-black text-slate-800 text-[10px] outline-none cursor-pointer uppercase">
                      {MONTHS_FR.map((m, i) => <option key={i} value={i.toString()}>{m}</option>)}
                    </select>
                 </div>
               )}
               {timeScale === 'day' && (
                 <div className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white border border-orange-500 rounded-xl shadow-md">
                    <Target size={14} className="text-white/70" />
                    <select value={selDate} onChange={(e) => setSelDate(e.target.value)} className="bg-transparent font-black text-white text-[10px] outline-none cursor-pointer uppercase">
                      {availableDates.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                    </select>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      {selectedRegion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedRegionName(null)}></div>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className={`p-8 lg:p-10 text-white flex justify-between items-center shrink-0 ${viewMode === 'donations' ? 'bg-slate-900' : 'bg-orange-950'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${viewMode === 'donations' ? 'bg-red-600 shadow-red-900/40' : 'bg-orange-600 shadow-orange-900/40'}`}>
                  {viewMode === 'donations' ? <MapPin size={32} /> : <Truck size={32} />}
                </div>
                <div>
                   <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter">{selectedRegion.originalName}</h3>
                   {viewMode === 'distribution' && (
                     <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1 italic">
                       Période : {timeScale === 'day' ? selDate : timeScale === 'month' ? `${MONTHS_FR[parseInt(selMonth)]} ${selYear}` : `Année ${selYear}`}
                     </p>
                   )}
                </div>
              </div>
              <button onClick={() => setSelectedRegionName(null)} className="w-12 h-12 bg-white/10 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all group"><X size={24} className="group-hover:rotate-90 transition-transform" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 bg-slate-50">
              {selectedRegion.sites.map((site: any, sIdx: number) => {
                const achievement = viewMode === 'donations' ? (site.objMensuel > 0 ? (site.totalMois / site.objMensuel) * 100 : 0) : site.efficiency;
                const StatusIcon = getStatusIcon(achievement);
                const siteInfo = sites.find(s => s.name.trim().toUpperCase() === site.name.trim().toUpperCase());
                
                return (
                  <div key={sIdx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{site.name}</h4>
                            <div className="flex items-center gap-4 mt-2">
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase ${getPerfColor(achievement)}`}>
                                <StatusIcon size={12} />{achievement.toFixed(1)}% {viewMode === 'donations' ? 'Atteinte' : 'Efficacité'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-2xl font-black text-slate-900">{(viewMode === 'donations' ? site.totalMois : site.total).toLocaleString()}</p>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{viewMode === 'donations' ? 'Collecte Mois' : 'Distribué'}</p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${achievement >= 100 ? 'bg-emerald-500' : achievement >= 75 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.min(achievement, 100)}%` }}/>
                        </div>
                        {viewMode === 'distribution' && (
                           <div className="grid grid-cols-3 gap-2 mt-4">
                              <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                 <p className="text-[7px] font-black text-slate-400 uppercase">CGR</p>
                                 <p className="text-xs font-black text-red-500">{site.cgr}</p>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                 <p className="text-[7px] font-black text-slate-400 uppercase">PLASMA</p>
                                 <p className="text-xs font-black text-blue-500">{site.plasma}</p>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                 <p className="text-[7px] font-black text-slate-400 uppercase">PLAT.</p>
                                 <p className="text-xs font-black text-emerald-500">{site.platelets}</p>
                              </div>
                           </div>
                        )}
                      </div>
                      <div className="lg:w-1/3 bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400"><User size={18} /></div>
                           <div><p className="text-[11px] font-black text-slate-700 uppercase leading-tight">{(siteInfo?.manager || site.manager) || "Non assigné"}</p></div>
                        </div>
                        <div className="flex gap-2">
                          {(siteInfo?.phone || site.phone) && <a href={`tel:${(siteInfo?.phone || site.phone)}`} className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"><Phone size={14} /><span className="text-[10px] font-black uppercase">Appeler</span></a>}
                          {(siteInfo?.email || site.email) && <a href={`mailto:${(siteInfo?.email || site.email)}`} className="flex-1 h-10 bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"><Mail size={14} /><span className="text-[10px] font-black uppercase">Email</span></a>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedRegion.sites.length === 0 && (
                <div className="py-20 text-center opacity-30 italic text-sm uppercase font-black tracking-widest">Aucune donnée pour cette période</div>
              )}
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex justify-center"><button onClick={() => setSelectedRegionName(null)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Fermer</button></div>
          </div>
        </div>
      )}

      {/* BLOC RÉGIONAL */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl overflow-hidden relative">
        <div className="flex items-center gap-5 mb-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${viewMode === 'donations' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {viewMode === 'donations' ? <Globe size={28} /> : <Truck size={28} />}
          </div>
          <div>
            <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">{viewMode === 'donations' ? 'Objectifs Annuels par Région' : 'Flux Distribution par Région'}</h3>
            {viewMode === 'distribution' && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Période active : {timeScale === 'day' ? selDate : timeScale === 'month' ? `${MONTHS_FR[parseInt(selMonth)]} ${selYear}` : `Année ${selYear}`}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(viewMode === 'donations' ? regionPerformanceDonations : distributionData.regions).map((reg: any, idx: number) => {
            const achievement = viewMode === 'donations' ? reg.annualPercentage : reg.efficiency;
            return (
              <button key={idx} onClick={() => setSelectedRegionName(reg.originalName)} className={`text-left rounded-[2.25rem] p-8 border-2 transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden group bg-slate-50 border-slate-100 hover:border-orange-200 hover:bg-white`}>
                <div className="flex justify-between items-center mb-6"><span className="font-black text-base uppercase truncate pr-4 text-slate-800">{reg.displayName}</span><div className="flex items-center gap-2"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${getPerfColor(achievement)}`}>{achievement.toFixed(1)}%</span><ExternalLink size={14} className="text-slate-300 group-hover:text-orange-400 transition-colors" /></div></div>
                <div className="w-full h-2.5 rounded-full overflow-hidden mb-6 bg-slate-200"><div className={`h-full transition-all duration-1000 ${achievement >= 100 ? 'bg-emerald-500' : achievement >= 75 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.min(achievement, 100)}%` }} /></div>
                <div className="flex justify-between items-end"><div><p className="text-[9px] font-bold uppercase mb-1 text-slate-400">{viewMode === 'donations' ? 'Réalisé Annuel' : 'Volume Distribué'}</p><p className="text-2xl font-black text-slate-700">{(viewMode === 'donations' ? reg.annualRealized : reg.total).toLocaleString()}</p></div><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm"><BarChart size={18} className="text-slate-300" /></div></div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* CLASSEMENTS SITES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center gap-5 mb-10 relative z-10"><div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner"><Trophy size={28} /></div><div><h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Elite Performance</h3><p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">{viewMode === 'donations' ? 'Top 5 par Atteinte' : 'Top 5 par Volume'}</p></div></div>
          <div className="space-y-4 relative z-10">
            {topSites.map((site: any, i: number) => {
              const displayVal = viewMode === 'donations' ? site.achievement.toFixed(1) + '%' : site.total.toLocaleString();
              return (
                <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                  <div className="flex items-center gap-5"><div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-emerald-600">{i + 1}</div><p className="font-black text-slate-800 uppercase tracking-tight">{site.name}</p></div>
                  <div className="text-right"><p className="text-2xl font-black text-emerald-600">{displayVal}</p></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center gap-5 mb-10 relative z-10"><div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner"><TrendingDown size={28} /></div><div><h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800">Alertes de Flux</h3><p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-1">Derniers du classement</p></div></div>
          <div className="space-y-4 relative z-10">
            {bottomSites.map((site: any, i: number) => {
               const displayVal = viewMode === 'donations' ? site.achievement.toFixed(1) + '%' : site.total.toLocaleString();
               return (
                <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                  <div className="flex items-center gap-5"><div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-red-600">!</div><p className="font-black text-slate-800 uppercase tracking-tight">{site.name}</p></div>
                  <div className="text-right"><p className="text-2xl font-black text-red-500">{displayVal}</p></div>
                </div>
               );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
