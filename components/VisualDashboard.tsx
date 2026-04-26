import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, AppTab, User } from '../types.ts';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Activity, Filter, Clock, MessageSquare, CheckCircle2, PieChart, ArrowRight, Package, ChevronRight, ArrowUpRight, ArrowDownRight, Smartphone, UserCheck, ChevronDown, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { COLORS } from '../constants.tsx';

const getPerfColor = (perc: number) => {
  if (perc >= 100) return 'text-orange-500';
  if (perc >= 75) return 'text-orange-500';
  return 'text-rose-500';
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
      const exists = data.dailyHistory.some((h: any) => h.date === selectedDate);
      if (!selectedDate || !exists) {
        setSelectedDate(data.dailyHistory[0].date);
      }
    }
  }, [data.dailyHistory, selectedDate]);

  const currentDailyRecord = useMemo(() => {
    return data.dailyHistory.find((r: any) => r.date === selectedDate) || data.dailyHistory[0];
  }, [selectedDate, data.dailyHistory]);

  const dailyDistStats = useMemo(() => {
    if (!data.distributions?.records) return null;
    const records = data.distributions.records.filter((r: any) => r.date === selectedDate);
    const qty = records.reduce((acc: number, r: any) => acc + r.quantite, 0);
    const rendu = records.reduce((acc: number, r: any) => acc + r.rendu, 0);
    const prodMap = new Map<string, number>();
    records.forEach((r: any) => prodMap.set(r.typeProduit, (prodMap.get(r.typeProduit) || 0) + r.quantite));
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
        .filter((site: any) => site.total > 0)
        .sort((a: any, b: any) => b.total - a.total)
        .map((s: any) => ({
          name: s.name, 
          value: s.total, 
          subValue: (s.total / (s.objective || 1)) * 100,
          label: "de l'objectif", 
          type: 'donation'
        }));
    } else {
      if (!data.distributions?.records) return [];
      const dayRecs = data.distributions.records.filter((r: any) => r.date === selectedDate);
      const siteMap = new Map<string, { cgr: number, total: number }>();
      dayRecs.forEach((r: any) => {
        if (!siteMap.has(r.site)) siteMap.set(r.site, { cgr: 0, total: 0 });
        const s = siteMap.get(r.site)!;
        if (r.typeProduit.toUpperCase().startsWith("CGR")) s.cgr += r.quantite;
        s.total += r.quantite;
      });
      return Array.from(siteMap.entries())
        .map((entry) => ({
          name: entry[0], 
          value: entry[1].cgr, 
          total: entry[1].total,
          subValue: entry[1].total > 0 ? (entry[1].cgr / entry[1].total) * 100 : 0,
          label: "du volume servi", 
          type: 'distribution'
        }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.value - a.value);
    }
  }, [viewMode, currentDailyRecord, data.distributions, selectedDate]);

  const userRegion = useMemo(() => {
    if (!user) return null;
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.region === 'TOUS LES PRES') return null;
    if (user.role === 'PRES') return user.region;
    if (user.role === 'AGENT' && user.site) {
      const siteInfo = sites.find((s: any) => s.name.toUpperCase() === user.site.toUpperCase());
      return siteInfo?.region || null;
    }
    return null;
  }, [user, sites]);

  const missingSites = useMemo(() => {
    if (!currentDailyRecord) return [];
    const activeNames = new Set(currentDailyRecord.sites.filter((site: any) => site.total > 0).map((s: any) => s.name.trim().toUpperCase()));
    let scopeSites = userRegion ? sites.filter((s: any) => s.region?.toUpperCase() === userRegion.toUpperCase()) : sites;
    return scopeSites.filter((site: any) => !activeNames.has(site.name.trim().toUpperCase()));
  }, [currentDailyRecord, userRegion, sites]);

  const handleMissingSiteWhatsApp = (site: any) => {
    if (!site.phone) return;
    const cleanPhone = site.phone.replace(/\D/g, '');
    const message = `Bonjour ${site.manager || 'Responsable'},\n\n⚠️ *Rappel Saisie HEMO-STATS*\n\nNous constatons que les données de collecte du *${selectedDate}* pour le site *${site.name}* ne sont pas encore renseignées dans le cockpit.\n\nMerci de bien vouloir procéder à la saisie dès que possible pour permettre la consolidation nationale.\n\nRestons mobilisés.\nCordialement, DSD CNTSCI.`;
    window.open(`https://wa.me/225${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const dayAchievement = currentDailyRecord ? (currentDailyRecord.stats.realized / (currentDailyRecord.sites.reduce((acc: number, s: any) => acc + (s.objective || 0), 0) || 1137)) * 100 : 0;

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="bg-white/80 backdrop-blur-xl p-1 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem] shadow-3xl border border-white/40 flex gap-1.5 sm:gap-2 w-full sm:w-auto">
           <button onClick={() => setViewMode('donations')} className={`flex-1 sm:flex-none px-4 sm:px-12 py-3.5 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] text-[10px] sm:text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all duration-500 active:scale-95 flex items-center justify-center gap-2 sm:gap-4 ${viewMode === 'donations' ? 'bg-slate-950 text-white shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Activity size={18} className={viewMode === 'donations' ? 'text-emerald-400' : ''}/> <span className="whitespace-nowrap">Prélèvements</span>
           </button>
           <button onClick={() => setViewMode('distribution')} className={`flex-1 sm:flex-none px-4 sm:px-12 py-3.5 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] text-[10px] sm:text-[11px] font-display font-black uppercase tracking-[0.2em] transition-all duration-500 active:scale-95 flex items-center justify-center gap-2 sm:gap-4 ${viewMode === 'distribution' ? 'bg-slate-950 text-white shadow-2xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50'}`}>
             <Truck size={18} className={viewMode === 'distribution' ? 'text-emerald-400' : ''}/> <span className="whitespace-nowrap">Distribution</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        <div className={`lg:col-span-2 rounded-[2.5rem] sm:rounded-[4rem] p-6 sm:p-12 lg:p-16 text-white shadow-3xl relative overflow-hidden transition-colors duration-1000 ${viewMode === 'donations' ? 'bg-slate-950' : 'bg-emerald-950'}`}>
          <div className={`absolute top-0 right-0 w-96 h-96 blur-[120px] rounded-full -mr-48 -mt-48 transition-colors duration-1000 ${viewMode === 'donations' ? 'bg-emerald-600/20' : 'bg-emerald-600/30'}`}></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 sm:mb-12">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center transition-all duration-500 shadow-2xl ${viewMode === 'donations' ? 'bg-emerald-600 shadow-emerald-500/40' : 'bg-emerald-600 shadow-emerald-500/40'}`}>
                  {viewMode === 'donations' ? <Calendar size={28} /> : <Package size={28} />}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black uppercase tracking-tighter leading-none">{viewMode === 'donations' ? 'Cockpit du Jour' : 'Sorties du Jour'}</h2>
                  <div className="flex items-center gap-3 mt-3">
                    <Filter size={16} className={viewMode === 'donations' ? "text-orange-400" : "text-orange-400"} />
                    <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent outline-none text-[11px] font-display font-black uppercase tracking-[0.2em] cursor-pointer text-white/60 hover:text-white transition-colors">
                      {data.dailyHistory.map((h: any) => <option key={h.date} value={h.date} className="text-slate-900">{h.date}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="text-center sm:text-right">
                 {viewMode === 'donations' ? (
                    <React.Fragment>
                      <p className={`text-4xl sm:text-5xl font-display font-black leading-none tracking-tighter ${getPerfColor(dayAchievement)}`}>{dayAchievement.toFixed(1)}%</p>
                      <p className="text-[10px] font-display font-black uppercase tracking-[0.3em] text-white/30 mt-3">Objectif atteint</p>
                    </React.Fragment>
                 ) : (
                    <React.Fragment>
                      <p className="text-4xl sm:text-5xl font-display font-black text-emerald-400 leading-none tracking-tighter">{dailyDistStats?.efficiency.toFixed(1)}%</p>
                      <p className="text-[10px] font-display font-black uppercase tracking-[0.3em] text-white/30 mt-3">Utilisation Nette</p>
                    </React.Fragment>
                 )}
              </div>
            </div>

            {viewMode === 'donations' ? (
              <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-12">
                <div className="bg-white/5 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 text-center group transition-all hover:bg-white/10"><p className="text-[8px] sm:text-[10px] font-display font-black text-white/30 uppercase mb-2 sm:mb-3 tracking-[0.2em]">Fixe</p><p className="text-xl sm:text-3xl font-display font-black text-emerald-400 group-hover:scale-110 transition-transform">{currentDailyRecord?.stats.fixed || 0}</p></div>
                <div className="bg-white/5 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 text-center group transition-all hover:bg-white/10"><p className="text-[8px] sm:text-[10px] font-display font-black text-white/30 uppercase mb-2 sm:mb-3 tracking-[0.2em]">Mobile</p><p className="text-xl sm:text-3xl font-display font-black text-emerald-400 group-hover:scale-110 transition-transform">{currentDailyRecord?.stats.mobile || 0}</p></div>
                <div className="bg-emerald-600/20 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-emerald-600/20 text-center group transition-all hover:bg-emerald-600/30"><p className="text-[8px] sm:text-[10px] font-display font-black text-emerald-400 uppercase mb-2 sm:mb-3 tracking-[0.2em]">Total</p><p className="text-xl sm:text-3xl font-display font-black text-white group-hover:scale-110 transition-transform">{(currentDailyRecord?.stats.realized || 0).toLocaleString()}</p></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-12">
                <div className="bg-white/5 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 text-center group transition-all hover:bg-white/10"><p className="text-[8px] sm:text-[10px] font-display font-black text-white/30 uppercase mb-2 sm:mb-3 tracking-[0.2em]">Poches Exp.</p><p className="text-xl sm:text-3xl font-display font-black text-white group-hover:scale-110 transition-transform">{dailyDistStats?.qty || 0}</p></div>
                <div className="bg-white/5 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 text-center group transition-all hover:bg-white/10"><p className="text-[8px] sm:text-[10px] font-display font-black text-white/30 uppercase mb-2 sm:mb-3 tracking-[0.2em]">Rendus</p><p className="text-xl sm:text-3xl font-display font-black text-rose-400 group-hover:scale-110 transition-transform">{dailyDistStats?.rendu || 0}</p></div>
                <div className="bg-emerald-600/20 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-emerald-600/20 text-center group transition-all hover:bg-emerald-600/30"><p className="text-[8px] sm:text-[10px] font-display font-black text-emerald-400 uppercase mb-2 sm:mb-3 tracking-[0.2em]">Flux</p><p className="text-xl sm:text-3xl font-display font-black text-white group-hover:scale-110 transition-transform">{dailyDistStats?.recordsCount || 0}</p></div>
              </div>
            )}
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden shadow-inner">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(viewMode === 'donations' ? dayAchievement : (dailyDistStats?.efficiency || 0), 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full transition-all duration-1000 shadow-[0_0_20px_rgba(255,255,255,0.1)] ${viewMode === 'donations' ? 'bg-emerald-500' : 'bg-emerald-500'}`} 
               />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
           <div className="card-professional p-6 sm:p-10 bg-white/90 backdrop-blur-sm flex flex-col justify-between group">
              <div className="flex items-center gap-4 sm:gap-5 mb-8">
                 <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[1rem] sm:rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${viewMode === 'donations' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : 'bg-emerald-50 text-emerald-600 shadow-emerald-100'}`}><PieChart size={24} className="sm:w-[28px] sm:h-[28px]" /></div>
                 <div>
                   <h3 className="text-lg sm:text-xl font-display font-black uppercase tracking-tighter text-slate-950">{viewMode === 'donations' ? 'Répartition Jour' : 'Top Produits Jour'}</h3>
                   <p className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-widest mt-1">Analyse segmentée</p>
                 </div>
              </div>
              {viewMode === 'donations' ? (
                <div className="space-y-3 sm:space-y-4">
                   {currentDailyRecord?.sites.filter((s: any) => s.total > 0).slice(0, 4).map((s: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                        <span className="text-[10px] sm:text-[11px] font-display font-black text-slate-600 uppercase tracking-tight truncate max-w-[120px] sm:max-w-[160px]">{s.name}</span>
                        <span className="text-xs sm:text-sm font-display font-black text-emerald-600">{s.total} poches</span>
                     </div>
                   ))}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {dailyDistStats?.topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                      <span className="text-[10px] sm:text-[11px] font-display font-black text-slate-600 uppercase tracking-tight truncate max-w-[100px] sm:max-w-[140px]">{p[0]}</span>
                      <span className="text-xs sm:text-sm font-display font-black text-emerald-600">{p[1]} poches</span>
                    </div>
                  ))}
                </div>
              )}
           </div>
           <div onClick={() => setActiveTab?.('recap')} className="card-professional p-6 sm:p-10 bg-white/90 backdrop-blur-sm relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all border-white/60">
              <div className="absolute -right-10 -bottom-10 p-12 opacity-5 group-hover:opacity-10 transition-opacity group-hover:scale-110 duration-700">
                <Award size={150} className="sm:w-[200px] sm:h-[200px]" />
              </div>
              <p className="text-[10px] sm:text-[11px] font-display font-black text-slate-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3 relative z-10">
                <Award size={16} className={viewMode === 'donations' ? "text-emerald-500" : "text-emerald-500"} /> 
                National {data.month}
              </p>
              <div className="relative z-10">
                 <h4 className="text-3xl sm:text-5xl font-display font-black text-slate-950 uppercase tracking-tighter leading-none mb-3 group-hover:translate-x-1 transition-transform duration-500">{viewMode === 'donations' ? data.monthly.realized.toLocaleString() : dailyDistStats?.qty.toLocaleString()}</h4>
                 <p className={`text-xl sm:text-2xl font-display font-black ${viewMode === 'donations' ? 'text-emerald-600' : 'text-emerald-600'}`}>Poches <span className="text-[10px] font-display font-bold text-slate-300 uppercase tracking-widest ml-3">Cumul Mensuel</span></p>
                 <div className="mt-8 flex items-center gap-2 text-[9px] sm:text-[10px] font-display font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-950 transition-colors whitespace-nowrap">Explorer le rapport global <ArrowRight size={12} className="group-hover:translate-x-2 transition-transform" /></div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <div onClick={() => setActiveTab?.('recap')} className={`card-professional bg-white/90 backdrop-blur-sm flex flex-col overflow-hidden h-[500px] sm:h-[600px] cursor-pointer transition-all duration-700 ${viewMode === 'donations' ? 'hover:border-emerald-200' : 'hover:border-emerald-200'}`}>
          <div className={`p-6 sm:p-10 border-b border-slate-100 flex justify-between items-center ${viewMode === 'donations' ? 'bg-emerald-50/30' : 'bg-emerald-50/30'}`}>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 text-white rounded-[1rem] sm:rounded-[1.25rem] flex items-center justify-center shadow-2xl transition-all duration-500 ${viewMode === 'donations' ? 'bg-slate-950 shadow-slate-900/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}><Clock size={24} className="sm:w-[28px] sm:h-[28px]" /></div>
              <div>
                <h3 className="font-display font-black text-xl sm:text-2xl uppercase tracking-tighter text-slate-950">{viewMode === 'donations' ? 'Attente de Saisie' : 'Registre Distribution'}</h3>
                <p className="text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">{viewMode === 'donations' ? `${missingSites.length} structures manquantes` : `${dailyDistStats?.recordsCount || 0} expéditions enregistrées`}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-4 no-scrollbar">
            {viewMode === 'donations' ? (
              missingSites.length > 0 ? missingSites.map((site, idx) => (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx} 
                  className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-500"
                >
                   <div className="flex items-center gap-6 min-w-0">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:scale-110 transition-all duration-500 shadow-sm border border-slate-100"><Building2 size={22} /></div>
                      <div className="truncate">
                        <p className="text-sm font-display font-black text-slate-950 uppercase tracking-tight truncate">{site.name}</p>
                        <p className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{site.manager || "Responsable non assigné"}</p>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      {site.phone ? (
                        <button 
                          onClick={() => handleMissingSiteWhatsApp(site)}
                          className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center hover:bg-orange-700 hover:rotate-6 transition-all shadow-xl shadow-orange-500/20 active:scale-95"
                          title="Envoyer Rappel WhatsApp"
                        >
                          <MessageSquare size={20} />
                        </button>
                      ) : <div className="w-12 h-12 bg-slate-100 text-slate-300 rounded-2xl flex items-center justify-center border border-slate-200"><Truck size={18} /></div>}
                   </div>
                </motion.div>
              )) : <div className="h-full flex flex-col items-center justify-center text-center py-24 gap-6 opacity-40"><CheckCircle2 size={64} className="text-orange-500 animate-bounce" /><p className="text-sm font-display font-black uppercase tracking-[0.3em] text-slate-950">Toutes les saisies sont à jour</p></div>
            ) : (
               data.distributions?.records.filter((r: any) => r.date === selectedDate).slice(0, 20).map((r: any, idx: number) => (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx} 
                  className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-500"
                >
                   <div className="flex items-center gap-6 min-w-0">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-400 shadow-sm border border-slate-100"><Truck size={22} /></div>
                      <div className="truncate">
                        <p className="text-sm font-display font-black text-slate-950 uppercase tracking-tight truncate">{r.etablissement}</p>
                        <p className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{r.typeProduit}</p>
                      </div>
                   </div>
                   <div className="text-right">
                     <p className="text-2xl font-display font-black text-orange-600 leading-none">{r.quantite}</p>
                     <p className="text-[10px] font-display font-black text-slate-300 uppercase tracking-widest mt-1">Poches</p>
                   </div>
                </motion.div>
               ))
            )}
          </div>
        </div>
        <div onClick={() => setActiveTab?.('recap')} className={`card-professional bg-white/90 backdrop-blur-sm flex flex-col overflow-hidden h-[600px] cursor-pointer transition-all duration-700 ${viewMode === 'donations' ? 'hover:border-orange-200' : 'hover:border-orange-200'}`}>
          <div className={`p-10 border-b border-slate-100 flex justify-between items-center ${viewMode === 'donations' ? 'bg-orange-50/30' : 'bg-orange-50/30'}`}>
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 text-white rounded-[1.25rem] flex items-center justify-center shadow-2xl transition-all duration-500 ${viewMode === 'donations' ? 'bg-orange-600 shadow-orange-500/20' : 'bg-orange-600 shadow-orange-500/20'}`}><CheckCircle2 size={28} /></div>
              <div>
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter text-slate-950">{viewMode === 'donations' ? 'Saisies Validées' : 'Top Distribution CGR'}</h3>
                <p className={`text-[11px] font-display font-bold uppercase tracking-[0.2em] mt-1 ${viewMode === 'donations' ? 'text-orange-500' : 'text-orange-500'}`}>{viewMode === 'donations' ? 'Consulter le rapport global →' : 'Classement par volume CGR'}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-4 no-scrollbar">
            {validatedEntries.length > 0 ? validatedEntries.map((item, idx) => (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                key={idx} 
                className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-2xl transition-all duration-500 flex items-center justify-between group"
              >
                 <div className="flex items-center gap-6 min-w-0">
                    <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500 ${item.type === 'donation' ? 'text-orange-500' : 'text-orange-500'}`}><Zap size={22} /></div>
                    <div className="truncate">
                      <p className="text-sm font-display font-black text-slate-950 uppercase tracking-tight truncate">{item.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-[10px] font-display font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-white shadow-sm border border-slate-100 ${item.type === 'donation' ? getPerfColor(item.subValue) : 'text-orange-600'}`}>{item.subValue.toFixed(1)}%</span>
                        <span className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                      </div>
                    </div>
                 </div>
                 <div className="text-right">
                   <p className={`text-3xl font-display font-black leading-none ${item.type === 'donation' ? 'text-slate-950' : 'text-orange-600'}`}>{item.value}</p>
                   <p className="text-[10px] font-display font-black text-slate-300 uppercase tracking-widest mt-2">Poches</p>
                 </div>
              </motion.div>
            )) : <div className="h-full flex flex-col items-center justify-center text-center py-24 gap-6 opacity-30"><Activity size={64} className="text-slate-200 animate-pulse" /><p className="text-sm font-display font-black uppercase tracking-[0.3em] text-slate-950">En attente de données...</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
};
