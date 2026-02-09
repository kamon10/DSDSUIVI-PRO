
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, AppTab, User, DistributionRecord } from '../types';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Activity, Filter, Clock, MessageSquare, CheckCircle2, PieChart, ArrowRight, Package, ChevronDown } from 'lucide-react';
import { COLORS, SITES_DATA, PRODUCT_COLORS } from '../constants';

const getPerfColor = (perc: number) => {
  if (perc >= 100) return 'text-emerald-500';
  if (perc >= 75) return 'text-orange-500';
  return 'text-red-500';
};

export const VisualDashboard: React.FC<{ 
  data: DashboardData; 
  setActiveTab?: (tab: AppTab) => void;
  user?: User | null;
}> = ({ data, setActiveTab, user }) => {
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

  const allSites = useMemo(() => data.regions.flatMap(reg => reg.sites), [data.regions]);

  const currentDailyRecord = useMemo(() => 
    data.dailyHistory.find(r => r.date === selectedDate) || data.dailyHistory[0]
  , [selectedDate, data.dailyHistory]);

  const dailyDistStats = useMemo(() => {
    if (!data.distributions?.records) return null;
    const records = data.distributions.records.filter(r => r.date === selectedDate);
    const qty = records.reduce((acc, r) => acc + r.quantite, 0);
    const rendu = records.reduce((acc, r) => acc + r.rendu, 0);
    
    const prodMap = new Map<string, number>();
    records.forEach(r => prodMap.set(r.typeProduit, (prodMap.get(r.typeProduit) || 0) + r.quantite));
    
    return {
      qty,
      rendu,
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
          name: s.name,
          value: s.total,
          subValue: (s.total / (s.objective || 1)) * 100,
          label: "de l'objectif",
          type: 'donation'
        }));
    } else {
      if (!data.distributions?.records) return [];
      const dayRecs = data.distributions.records.filter(r => r.date === selectedDate);
      const siteMap = new Map<string, { cgr: number, total: number }>();
      
      dayRecs.forEach(r => {
        if (!siteMap.has(r.site)) siteMap.set(r.site, { cgr: 0, total: 0 });
        const s = siteMap.get(r.site)!;
        if (r.typeProduit.startsWith("CGR")) {
          s.cgr += r.quantite;
        }
        s.total += r.quantite;
      });

      return Array.from(siteMap.entries())
        .map(([name, stats]) => ({
          name,
          value: stats.cgr,
          total: stats.total,
          subValue: stats.total > 0 ? (stats.cgr / stats.total) * 100 : 0,
          label: "du volume servi",
          type: 'distribution'
        }))
        .filter(item => item.total > 0)
        .sort((a, b) => b.value - a.value);
    }
  }, [viewMode, currentDailyRecord, data.distributions, selectedDate]);

  const missingSites = useMemo(() => {
    if (!currentDailyRecord) return [];
    const activeSites = currentDailyRecord.sites.filter(site => site.total > 0);
    const activeNames = new Set(activeSites.map(s => s.name.trim().toUpperCase()));
    return SITES_DATA.filter(site => !activeNames.has(site.name.trim().toUpperCase()));
  }, [currentDailyRecord]);

  const dailyTotals = useMemo(() => {
    if (!currentDailyRecord) return { total: 0, objective: 1137, fixed: 0, mobile: 0 };
    return {
      total: currentDailyRecord.stats.realized,
      fixed: currentDailyRecord.stats.fixed,
      mobile: currentDailyRecord.stats.mobile,
      objective: currentDailyRecord.sites.reduce((acc, s) => acc + (s.objective || 0), 0) || 1137
    };
  }, [currentDailyRecord]);

  const leaderStats = useMemo(() => {
    const donationLeader = [...allSites].sort((a, b) => b.totalMois - a.totalMois)[0];
    let distLeader = null;
    if (data.distributions?.records) {
      const distSiteMap = new Map<string, number>();
      data.distributions.records.forEach(r => {
        if (r.date.includes(selectedDate.split('/')[1])) { // Approximatif pour le mois
          distSiteMap.set(r.site, (distSiteMap.get(r.site) || 0) + r.quantite);
        }
      });
      const topDist = Array.from(distSiteMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topDist) distLeader = { name: topDist[0], total: topDist[1] };
    }
    return { donationLeader, distLeader };
  }, [data, allSites, selectedDate]);

  const activeLeader = viewMode === 'donations' ? leaderStats.donationLeader : leaderStats.distLeader;
  const leaderName = activeLeader?.name.replace('CRTS ', '').replace('CDTS ', '') || "---";
  const leaderValue = viewMode === 'donations' ? leaderStats.donationLeader?.totalMois : leaderStats.distLeader?.total;

  const dayAchievement = (dailyTotals.total / dailyTotals.objective) * 100;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      
      {/* BANDE DES SÉLECTEURS UNIFIÉE */}
      <div className="glass-card p-2 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-6 shadow-2xl border-l-8 transition-all" style={{ borderLeftColor: viewMode === 'donations' ? '#10b981' : '#f59e0b' }}>
        
        {/* Palette de Mode */}
        <div className="flex bg-slate-100 p-1.5 rounded-3xl gap-1.5 ml-2">
           <button onClick={() => setViewMode('donations')} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'donations' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             <Activity size={14}/> Cockpit Prélèvements
           </button>
           <button onClick={() => setViewMode('distribution')} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'distribution' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             <Truck size={14}/> Cockpit Distribution
           </button>
        </div>

        {/* Filtre Date Unique */}
        <div className="flex-1 flex justify-center">
           <div className="bg-slate-900 px-8 py-3 rounded-2xl text-white shadow-xl flex items-center gap-4 group">
              <Calendar size={16} className={viewMode === 'donations' ? "text-emerald-500" : "text-orange-500"} />
              <div className="flex flex-col">
                 <span className="text-[7px] font-black uppercase tracking-widest text-white/30">Situation Journalière</span>
                 <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent outline-none text-[11px] font-black uppercase tracking-widest cursor-pointer text-white">
                   {data.dailyHistory.slice(0, 31).map(h => <option key={h.date} value={h.date} className="text-slate-900">{h.date}</option>)}
                 </select>
              </div>
              <ChevronDown size={14} className="text-white/20 group-hover:text-white transition-colors" />
           </div>
        </div>

        <div className="mr-4">
           <p className="text-[10px] font-black uppercase text-slate-400">{data.month.toUpperCase()} {data.year}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className={`lg:col-span-2 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden group transition-colors duration-500 ${viewMode === 'donations' ? 'bg-[#0f172a]' : 'bg-[#1e1b4b]'}`}>
          <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full -mr-32 -mt-32 transition-colors ${viewMode === 'donations' ? 'bg-emerald-600/10' : 'bg-orange-600/20'}`}></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${viewMode === 'donations' ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-orange-600 shadow-orange-900/40'}`}>
                  {viewMode === 'donations' ? <Calendar size={24} /> : <Package size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">{viewMode === 'donations' ? 'Situation du Jour' : 'Sorties du Jour'}</h2>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/30">{selectedDate}</p>
                </div>
              </div>
              <div className="text-right">
                 {viewMode === 'donations' ? (
                   <>
                    <p className={`text-4xl font-black leading-none ${getPerfColor(dayAchievement)}`}>{dayAchievement.toFixed(1)}%</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Atteinte</p>
                   </>
                 ) : (
                   <>
                    <p className="text-4xl font-black text-emerald-400 leading-none">{dailyDistStats?.efficiency.toFixed(1)}%</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Utilisation</p>
                   </>
                 )}
              </div>
            </div>

            {viewMode === 'donations' ? (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Fixe</p><p className="text-xl font-black text-emerald-400">{dailyTotals.fixed}</p></div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Mobile</p><p className="text-xl font-black text-orange-400">{dailyTotals.mobile}</p></div>
                <div className="bg-emerald-600/20 p-4 rounded-3xl border border-emerald-600/20 text-center"><p className="text-[8px] font-black text-emerald-400 uppercase mb-1">Total</p><p className="text-xl font-black text-white">{dailyTotals.total}</p></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Expédié</p><p className="text-xl font-black text-white">{dailyDistStats?.qty || 0}</p></div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Rendus</p><p className="text-xl font-black text-red-400">{dailyDistStats?.rendu || 0}</p></div>
                <div className="bg-orange-600/20 p-4 rounded-3xl border border-orange-600/20 text-center"><p className="text-[8px] font-black text-orange-400 uppercase mb-1">Flux</p><p className="text-xl font-black text-white">{dailyDistStats?.recordsCount || 0}</p></div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white rounded-[3rem] p-8 shadow-warm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-4 mb-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${viewMode === 'donations' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                   {viewMode === 'donations' ? <PieChart size={20} /> : <TrendingUp size={20} />}
                 </div>
                 <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">{viewMode === 'donations' ? 'Mixité Mois' : 'Top Produits'}</h3>
              </div>
              
              {viewMode === 'donations' ? (
                <div className="space-y-4">
                   <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-emerald-600">Fixe ({(data.monthly.fixed / (data.monthly.realized || 1) * 100).toFixed(0)}%)</span>
                      <span className="text-orange-500">Mobile ({(data.monthly.mobile / (data.monthly.realized || 1) * 100).toFixed(0)}%)</span>
                   </div>
                   <div className="h-3 bg-slate-100 rounded-full flex overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(data.monthly.fixed / (data.monthly.realized || 1) * 100)}%` }}></div>
                      <div className="h-full bg-orange-500" style={{ width: `${(data.monthly.mobile / (data.monthly.realized || 1) * 100)}%` }}></div>
                   </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyDistStats?.topProducts.map(([name, val], i) => (
                    <div key={i} className="flex items-center justify-between text-[9px] font-black uppercase">
                      <span className="text-slate-500 truncate max-w-[110px]">{name}</span>
                      <span className="text-orange-600">{val}</span>
                    </div>
                  ))}
                </div>
              )}
           </div>

           <div onClick={() => setActiveTab?.('site-focus')} className="bg-white rounded-[3rem] p-8 shadow-warm border border-slate-100 relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Award size={16} className={viewMode === 'donations' ? "text-emerald-500" : "text-orange-500"} /> Leader Mois
              </p>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-1">{leaderName}</h4>
              <p className={`text-lg font-black ${viewMode === 'donations' ? 'text-emerald-600' : 'text-orange-600'}`}>
                {leaderValue?.toLocaleString() || 0} <span className="text-[8px] font-bold text-slate-300 uppercase">Poches</span>
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3.5rem] shadow-warm border border-slate-100 flex flex-col overflow-hidden h-[500px]">
          <div className={`p-8 border-b border-slate-50 flex justify-between items-center ${viewMode === 'donations' ? 'bg-emerald-50/30' : 'bg-orange-50/30'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-lg ${viewMode === 'donations' ? 'bg-emerald-600' : 'bg-orange-600'}`}><Clock size={20} /></div>
              <div><h3 className="font-black text-lg uppercase tracking-tight text-slate-800">{viewMode === 'donations' ? 'Attente de Saisie' : 'Registre Distribution'}</h3><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{viewMode === 'donations' ? `${missingSites.length} structures` : `${dailyDistStats?.recordsCount || 0} expéditions`}</p></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 no-scrollbar">
            {viewMode === 'donations' ? (
              missingSites.length > 0 ? missingSites.slice(0, 15).map((site, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300"><Building2 size={18} /></div>
                      <div><p className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[160px]">{site.name}</p></div>
                   </div>
                </div>
              )) : <div className="h-full flex flex-col items-center justify-center opacity-30"><CheckCircle2 size={48} className="text-emerald-500" /><p className="text-xs font-black uppercase">À jour</p></div>
            ) : (
               data.distributions?.records.filter(r => r.date === selectedDate).slice(0, 15).map((r, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-400"><Truck size={18} /></div>
                      <div><p className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[160px]">{r.etablissement}</p></div>
                   </div>
                   <p className="text-sm font-black text-orange-600">{r.quantite}</p>
                </div>
               ))
            )}
          </div>
        </div>
        <div onClick={() => setActiveTab?.('recap')} className={`bg-white rounded-[3.5rem] shadow-warm border border-slate-100 flex flex-col overflow-hidden h-[500px] cursor-pointer transition-all ${viewMode === 'donations' ? 'hover:border-emerald-200' : 'hover:border-orange-200'}`}>
          <div className={`p-8 border-b border-slate-50 flex justify-between items-center ${viewMode === 'donations' ? 'bg-emerald-50/30' : 'bg-orange-50/30'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-lg ${viewMode === 'donations' ? 'bg-emerald-500' : 'bg-orange-600'}`}>
                {viewMode === 'donations' ? <CheckCircle2 size={20} /> : <Zap size={20} />}
              </div>
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight text-slate-800">{viewMode === 'donations' ? 'Saisies Validées' : 'Top Flux CGR'}</h3>
                <p className={`text-[9px] font-black uppercase tracking-widest ${viewMode === 'donations' ? 'text-emerald-500' : 'text-orange-500'}`}>Rapport Global →</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 no-scrollbar">
            {validatedEntries.length > 0 ? validatedEntries.slice(0, 15).map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white transition-all flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm ${item.type === 'donation' ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {item.type === 'donation' ? <Zap size={18} /> : <Package size={18} />}
                    </div>
                    <p className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[160px]">{item.name}</p>
                 </div>
                 <p className={`text-lg font-black ${item.type === 'donation' ? 'text-slate-900' : 'text-orange-600'}`}>{item.value}</p>
              </div>
            )) : <div className="h-full flex flex-col items-center justify-center opacity-30 font-black text-xs uppercase">En attente de flux...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
