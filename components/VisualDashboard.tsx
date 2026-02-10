
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, AppTab, User, DistributionRecord } from '../types';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Activity, Filter, Clock, MessageSquare, CheckCircle2, PieChart, ArrowRight, Package } from 'lucide-react';
import { COLORS, PRODUCT_COLORS } from '../constants';

const getPerfColor = (perc: number) => {
  if (perc >= 100) return 'text-emerald-500';
  if (perc >= 75) return 'text-orange-500';
  return 'text-red-500';
};

export const VisualDashboard: React.FC<{ 
  data: DashboardData; 
  setActiveTab?: (tab: AppTab) => void;
  user?: User | null;
  sites: any[];
}> = ({ data, setActiveTab, user, sites }) => {
  const [selectedDate, setSelectedDate] = useState<string>(data.date);
  const [viewMode, setViewMode] = useState<'donations' | 'distribution'>('donations');

  useEffect(() => {
    if (data.dailyHistory.length > 0) {
      const exists = data.dailyHistory.some(h => h.date === selectedDate);
      if (!selectedDate || !exists) {
        setSelectedDate(data.dailyHistory[0].date);
      }
    }
  }, [data.dailyHistory, selectedDate]);

  const currentDailyRecord = useMemo(() => data.dailyHistory.find(r => r.date === selectedDate) || data.dailyHistory[0], [selectedDate, data.dailyHistory]);

  const dailyDistStats = useMemo(() => {
    if (!data.distributions?.records) return null;
    const records = data.distributions.records.filter(r => r.date === selectedDate);
    const qty = records.reduce((acc, r) => acc + r.quantite, 0);
    const rendu = records.reduce((acc, r) => acc + r.rendu, 0);
    const prodMap = new Map<string, number>();
    records.forEach(r => prodMap.set(r.typeProduit, (prodMap.get(r.typeProduit) || 0) + r.quantite));
    return {
      qty, rendu,
      efficiency: qty > 0 ? ((qty - rendu) / qty) * 100 : 0,
      recordsCount: records.length,
      topProducts: Array.from(prodMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 3)
    };
  }, [data.distributions, selectedDate]);

  const validatedEntries = useMemo(() => {
    if (viewMode === 'donations') {
      if (!currentDailyRecord) return [];
      return currentDailyRecord.sites
        .filter(site => site.total > 0)
        .sort((a, b) => b.total - a.total)
        .map(s => ({
          name: s.name, value: s.total, subValue: (s.total / (s.objective || 1)) * 100,
          label: "de l'objectif", type: 'donation'
        }));
    } else {
      if (!data.distributions?.records) return [];
      const dayRecs = data.distributions.records.filter(r => r.date === selectedDate);
      const siteMap = new Map<string, { cgr: number, total: number }>();
      dayRecs.forEach(r => {
        if (!siteMap.has(r.site)) siteMap.set(r.site, { cgr: 0, total: 0 });
        const s = siteMap.get(r.site)!;
        if (r.typeProduit.startsWith("CGR")) s.cgr += r.quantite;
        s.total += r.quantite;
      });
      return Array.from(siteMap.entries()).map(entry => {
          const name = entry[0]; const stats = entry[1];
          return {
            name, value: stats.cgr, total: stats.total,
            subValue: stats.total > 0 ? (stats.cgr / stats.total) * 100 : 0,
            label: "du volume servi", type: 'distribution'
          };
      }).filter(item => item.total > 0).sort((a, b) => b.value - a.value);
    }
  }, [viewMode, currentDailyRecord, data.distributions, selectedDate]);

  const userRegion = useMemo(() => {
    if (!user) return null;
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.region === 'TOUS LES PRES') return null;
    if (user.role === 'PRES') return user.region;
    if (user.role === 'AGENT' && user.site) {
      const siteInfo = sites.find(s => s.name.toUpperCase() === user.site.toUpperCase());
      return siteInfo?.region || null;
    }
    return null;
  }, [user, sites]);

  const missingSites = useMemo(() => {
    if (!currentDailyRecord) return [];
    const activeNames = new Set(currentDailyRecord.sites.filter(site => site.total > 0).map(s => s.name.trim().toUpperCase()));
    let scopeSites = userRegion ? sites.filter(s => s.region?.toUpperCase() === userRegion.toUpperCase()) : sites;
    return scopeSites.filter(site => !activeNames.has(site.name.trim().toUpperCase()));
  }, [currentDailyRecord, userRegion, sites]);

  const dayAchievement = currentDailyRecord ? (currentDailyRecord.stats.realized / (currentDailyRecord.sites.reduce((acc, s) => acc + (s.objective || 0), 0) || 1137)) * 100 : 0;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      <div className="flex justify-center mb-4">
        <div className="bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100 flex gap-2">
           <button onClick={() => setViewMode('donations')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={14}/> Prélèvements
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={14}/> Distribution
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className={`lg:col-span-2 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden transition-colors duration-500 ${viewMode === 'donations' ? 'bg-[#0f172a]' : 'bg-[#1e1b4b]'}`}>
          <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full -mr-32 -mt-32 transition-colors ${viewMode === 'donations' ? 'bg-emerald-600/10' : 'bg-orange-600/20'}`}></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${viewMode === 'donations' ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-orange-600 shadow-orange-900/40'}`}>
                  {viewMode === 'donations' ? <Calendar size={24} /> : <Package size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">{viewMode === 'donations' ? 'Cockpit du Jour' : 'Sorties du Jour'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Filter size={14} className={viewMode === 'donations' ? "text-emerald-400" : "text-orange-400"} />
                    <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-white/60 hover:text-white transition-colors">
                      {data.dailyHistory.map(h => <option key={h.date} value={h.date} className="text-slate-900">{h.date}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="text-right">
                 {viewMode === 'donations' ? (
                    <><p className={`text-4xl font-black leading-none ${getPerfColor(dayAchievement)}`}>{dayAchievement.toFixed(1)}%</p><p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Objectif atteint</p></>
                 ) : (
                    <><p className="text-4xl font-black text-emerald-400 leading-none">{dailyDistStats?.efficiency.toFixed(1)}%</p><p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Utilisation Nette</p></>
                 )}
              </div>
            </div>

            {viewMode === 'donations' ? (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Fixe</p><p className="text-xl font-black text-emerald-400">{currentDailyRecord?.stats.fixed || 0}</p></div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Mobile</p><p className="text-xl font-black text-orange-400">{currentDailyRecord?.stats.mobile || 0}</p></div>
                <div className="bg-emerald-600/20 p-4 rounded-3xl border border-emerald-600/20 text-center"><p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Total</p><p className="text-xl font-black text-white">{(currentDailyRecord?.stats.realized || 0).toLocaleString()}</p></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Poches Exp.</p><p className="text-xl font-black text-white">{dailyDistStats?.qty || 0}</p></div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Rendus</p><p className="text-xl font-black text-red-400">{dailyDistStats?.rendu || 0}</p></div>
                <div className="bg-orange-600/20 p-4 rounded-3xl border border-orange-600/20 text-center"><p className="text-[8px] font-black text-orange-400 uppercase mb-1">Flux</p><p className="text-xl font-black text-white">{dailyDistStats?.recordsCount || 0}</p></div>
              </div>
            )}
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
               <div className={`h-full transition-all duration-1000 ${viewMode === 'donations' ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(viewMode === 'donations' ? dayAchievement : (dailyDistStats?.efficiency || 0), 100)}%` }}/>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white rounded-[3rem] p-8 shadow-warm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-4 mb-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${viewMode === 'donations' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}><PieChart size={20} /></div>
                 <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">{viewMode === 'donations' ? 'Répartition Jour' : 'Top Produits Jour'}</h3>
              </div>
              {viewMode === 'donations' ? (
                <div className="space-y-2">
                   {currentDailyRecord?.sites.filter(s => s.total > 0).slice(0, 4).map((s, idx) => (
                     <div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase">
                        <span className="text-slate-500 truncate max-w-[140px]">{s.name}</span>
                        <span className="text-emerald-600">{s.total} poches</span>
                     </div>
                   ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyDistStats?.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] font-black uppercase">
                      <span className="text-slate-500 truncate max-w-[120px]">{p[0]}</span>
                      <span className="text-orange-600">{p[1]} poches</span>
                    </div>
                  ))}
                </div>
              )}
           </div>
           <div onClick={() => setActiveTab?.('recap')} className="bg-white rounded-[3rem] p-8 shadow-warm border border-slate-100 relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10"><Award size={16} className={viewMode === 'donations' ? "text-emerald-500" : "text-orange-500"} /> National {data.month}</p>
              <div className="relative z-10">
                 <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-1">{viewMode === 'donations' ? data.monthly.realized.toLocaleString() : dailyDistStats?.qty.toLocaleString()}</h4>
                 <p className={`text-xl font-black ${viewMode === 'donations' ? 'text-emerald-600' : 'text-orange-600'}`}>Poches <span className="text-[9px] font-bold text-slate-300 uppercase ml-2">Cumul</span></p>
                 <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">Voir détail <ArrowRight size={10}/></div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3.5rem] shadow-warm border border-slate-100 flex flex-col overflow-hidden h-[500px]">
          <div className={`p-8 border-b border-slate-50 flex justify-between items-center ${viewMode === 'donations' ? 'bg-emerald-50/30' : 'bg-orange-50/30'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors ${viewMode === 'donations' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-orange-600 shadow-orange-100'}`}><Clock size={20} /></div>
              <div><h3 className="font-black text-lg uppercase tracking-tight text-slate-800">{viewMode === 'donations' ? 'Attente de Saisie' : 'Registre Distribution'}</h3><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{viewMode === 'donations' ? `${missingSites.length} structures manquantes` : `${dailyDistStats?.recordsCount || 0} expéditions`}</p></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 no-scrollbar">
            {viewMode === 'donations' ? (
              missingSites.length > 0 ? missingSites.map((site, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                   <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-colors"><Building2 size={18} /></div>
                      <div className="truncate"><p className="text-[11px] font-black text-slate-800 uppercase truncate">{site.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase truncate">{site.manager || "Non assigné"}</p></div>
                   </div>
                   <div className="flex gap-2">
                      {site.phone ? <a href={`https://wa.me/225${site.phone.replace(/\D/g,'')}`} target="_blank" className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md active:scale-95"><MessageSquare size={16} /></a> : <div className="w-10 h-10 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center"><Truck size={14} /></div>}
                   </div>
                </div>
              )) : <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4 opacity-30"><CheckCircle2 size={48} className="text-emerald-500" /><p className="text-xs font-black uppercase tracking-[0.2em]">Saisies à jour</p></div>
            ) : (
               data.distributions?.records.filter(r => r.date === selectedDate).slice(0, 20).map((r, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                   <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-400"><Truck size={18} /></div>
                      <div className="truncate"><p className="text-[10px] font-black text-slate-800 uppercase truncate">{r.etablissement}</p><p className="text-[8px] font-bold text-slate-400 uppercase truncate">{r.typeProduit}</p></div>
                   </div>
                   <div className="text-right"><p className="text-sm font-black text-orange-600">{r.quantite}</p><p className="text-[7px] font-black text-slate-300 uppercase">Poches</p></div>
                </div>
               ))
            )}
          </div>
        </div>
        <div onClick={() => setActiveTab?.('recap')} className={`bg-white rounded-[3.5rem] shadow-warm border border-slate-100 flex flex-col overflow-hidden h-[500px] cursor-pointer transition-all ${viewMode === 'donations' ? 'hover:border-emerald-200' : 'hover:border-orange-200'}`}>
          <div className={`p-8 border-b border-slate-50 flex justify-between items-center ${viewMode === 'donations' ? 'bg-emerald-50/30' : 'bg-orange-50/30'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-lg ${viewMode === 'donations' ? 'bg-emerald-500' : 'bg-orange-600'}`}><CheckCircle2 size={20} /></div>
              <div><h3 className="font-black text-lg uppercase tracking-tight text-slate-800">{viewMode === 'donations' ? 'Saisies Validées' : 'Top Distribution CGR'}</h3><p className={`text-[9px] font-black uppercase tracking-widest ${viewMode === 'donations' ? 'text-emerald-500' : 'text-orange-500'}`}>{viewMode === 'donations' ? 'Rapport global →' : 'Classement CGR'}</p></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 no-scrollbar">
            {validatedEntries.length > 0 ? validatedEntries.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all flex items-center justify-between group">
                 <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm ${item.type === 'donation' ? 'text-emerald-500' : 'text-orange-500'}`}><Zap size={18} /></div>
                    <div className="truncate"><p className="text-[11px] font-black text-slate-800 uppercase truncate">{item.name}</p><div className="flex items-center gap-2 mt-0.5"><span className={`text-[9px] font-black ${item.type === 'donation' ? getPerfColor(item.subValue) : 'text-orange-600'}`}>{item.subValue.toFixed(1)}% {item.label}</span></div></div>
                 </div>
                 <div className="text-right"><p className={`text-lg font-black ${item.type === 'donation' ? 'text-slate-900' : 'text-orange-600'}`}>{item.value}</p><p className="text-[8px] font-black text-slate-300 uppercase">Poches</p></div>
              </div>
            )) : <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4 opacity-30"><Activity size={48} className="text-slate-200 animate-pulse" /><p className="text-xs font-black uppercase tracking-[0.2em]">En attente...</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
};
