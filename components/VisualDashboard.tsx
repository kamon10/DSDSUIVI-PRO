import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData, AppTab, User } from '../types';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Activity, Filter, Clock, MessageSquare, CheckCircle2, PieChart, ArrowRight } from 'lucide-react';
import { COLORS, SITES_DATA } from '../constants';

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

  const activeSites = useMemo(() => {
    if (!currentDailyRecord) return [];
    return currentDailyRecord.sites.filter(site => site.total > 0);
  }, [currentDailyRecord]);

  // Détermination de la région de gestion de l'utilisateur
  const userRegion = useMemo(() => {
    if (!user) return null;
    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.region === 'TOUS LES PRES') return null;
    if (user.role === 'PRES') return user.region;
    if (user.role === 'AGENT' && user.site) {
      const siteInfo = SITES_DATA.find(s => s.name.toUpperCase() === user.site.toUpperCase());
      return siteInfo?.region || null;
    }
    return null;
  }, [user]);

  const missingSites = useMemo(() => {
    if (!currentDailyRecord) return [];
    const activeNames = new Set(activeSites.map(s => s.name.trim().toUpperCase()));
    
    // Si l'utilisateur est restreint à une région, on filtre le référentiel SITES_DATA
    let scopeSites = SITES_DATA;
    if (userRegion) {
      scopeSites = SITES_DATA.filter(s => s.region?.toUpperCase() === userRegion.toUpperCase());
    }

    return scopeSites.filter(site => !activeNames.has(site.name.trim().toUpperCase()));
  }, [activeSites, currentDailyRecord, userRegion]);

  const dailyTotals = useMemo(() => {
    if (!currentDailyRecord) return { total: 0, objective: 1137, fixed: 0, mobile: 0 };
    return {
      total: currentDailyRecord.stats.realized,
      fixed: currentDailyRecord.stats.fixed,
      mobile: currentDailyRecord.stats.mobile,
      objective: currentDailyRecord.sites.reduce((acc, s) => acc + (s.objective || 0), 0) || 1137
    };
  }, [currentDailyRecord]);

  const stats = useMemo(() => {
    const todayStr = data.date.split('/')[0];
    const daysElapsed = parseInt(todayStr) || 15;
    const totalDaysInMonth = 30;
    const dailyAvg = data.monthly.realized / daysElapsed;
    const pfm = Math.round(dailyAvg * totalDaysInMonth);
    const totalMois = data.monthly.realized || 1;
    const fixePerc = (data.monthly.fixed / totalMois) * 100;
    const mobilePerc = (data.monthly.mobile / totalMois) * 100;
    const leader = [...allSites].sort((a, b) => b.totalMois - a.totalMois)[0];
    return { dailyAvg, pfm, fixePerc, mobilePerc, leader };
  }, [data, allSites]);

  const handleWhatsAppReminder = (site: any) => {
    if (!site.phone) return;
    let cleanPhone = site.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '225' + cleanPhone.substring(1);
    const message = `Bonjour ${site.manager || 'Responsable'}, les données de prélèvements du ${selectedDate} pour le site ${site.name} n'ont pas encore été reçues. Pourriez-vous procéder à la saisie ? Merci.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const dayAchievement = (dailyTotals.total / dailyTotals.objective) * 100;

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-[#0f172a] rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[80px] rounded-full -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/40"><Calendar size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Cockpit du Jour</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Filter size={14} className="text-red-400" />
                    <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer text-white/60 hover:text-white transition-colors">
                      {data.dailyHistory.map(h => <option key={h.date} value={h.date} className="text-slate-900">{h.date}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="text-right">
                 <p className={`text-4xl font-black leading-none ${getPerfColor(dayAchievement)}`}>{dayAchievement.toFixed(1)}%</p>
                 <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Objectif atteint</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
               <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Fixe</p><p className="text-xl font-black text-emerald-400">{dailyTotals.fixed}</p></div>
               <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Mobile</p><p className="text-xl font-black text-orange-400">{dailyTotals.mobile}</p></div>
               <div className="bg-red-600/20 p-4 rounded-3xl border border-red-600/20 text-center"><p className="text-[8px] font-black text-red-400 uppercase mb-1">Total</p><p className="text-xl font-black text-white">{dailyTotals.total}</p></div>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${Math.min(dayAchievement, 100)}%` }}/>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white rounded-[3rem] p-8 shadow-warm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><PieChart size={20} /></div>
                 <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Mixité Mois</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-emerald-600">Fixe ({stats.fixePerc.toFixed(1)}%)</span>
                    <span className="text-orange-500">Mobile ({stats.mobilePerc.toFixed(1)}%)</span>
                 </div>
                 <div className="h-3 bg-slate-100 rounded-full flex overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${stats.fixePerc}%` }}></div>
                    <div className="h-full bg-orange-500" style={{ width: `${stats.mobilePerc}%` }}></div>
                 </div>
              </div>
           </div>
           <div 
            onClick={() => setActiveTab?.('site-focus')}
            className="bg-white rounded-[3rem] p-8 shadow-warm border border-slate-100 relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all"
           >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10"><Award size={16} className="text-blue-500" /> Leader {data.month}</p>
              <div className="relative z-10">
                 <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-1">{stats.leader?.name.replace('CRTS ', '').replace('CDTS ', '')}</h4>
                 <p className="text-xl font-black text-blue-600">{stats.leader?.totalMois.toLocaleString()} <span className="text-[9px] font-bold text-slate-300 uppercase">Poches</span></p>
                 <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-blue-400 uppercase">Voir détail <ArrowRight size={10}/></div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3.5rem] shadow-warm border border-slate-100 flex flex-col overflow-hidden h-[500px]">
          <div className="p-8 border-b border-slate-50 bg-red-50/30 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-100"><Clock size={20} /></div>
              <div><h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Attente de Saisie</h3><p className="text-[9px] font-black text-red-400 uppercase tracking-widest">{missingSites.length} structures manquantes {userRegion ? `(${userRegion.replace('PRES ', '')})` : '(National)'}</p></div>
            </div>
            {missingSites.length > 0 && <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 no-scrollbar">
            {missingSites.length > 0 ? missingSites.map((site, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all flex items-center justify-between group">
                 <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-red-500 transition-colors"><Building2 size={18} /></div>
                    <div className="truncate"><p className="text-[11px] font-black text-slate-800 uppercase truncate">{site.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase truncate">{site.manager || "Non assigné"}</p></div>
                 </div>
                 <div className="flex gap-2">
                    {site.phone ? <button onClick={() => handleWhatsAppReminder(site)} className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100 active:scale-95"><MessageSquare size={16} /></button> : <div className="w-10 h-10 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center"><Truck size={14} /></div>}
                 </div>
              </div>
            )) : <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4 opacity-30"><CheckCircle2 size={48} className="text-emerald-500" /><p className="text-xs font-black uppercase tracking-[0.2em]">Saisies à jour</p></div>}
          </div>
        </div>
        <div 
          onClick={() => setActiveTab?.('recap')}
          className="bg-white rounded-[3.5rem] shadow-warm border border-slate-100 flex flex-col overflow-hidden h-[500px] cursor-pointer hover:border-emerald-200 transition-all"
        >
          <div className="p-8 border-b border-slate-50 bg-emerald-50/30 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100"><CheckCircle2 size={20} /></div>
              <div><h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Saisies Validées</h3><p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Voir le rapport global →</p></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-3 no-scrollbar">
            {activeSites.length > 0 ? activeSites.sort((a,b) => b.total - a.total).map((site, idx) => {
              const sitePerf = (site.total / (site.objective || 1)) * 100;
              return (
              <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all flex items-center justify-between group">
                 <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm"><Zap size={18} /></div>
                    <div className="truncate">
                       <p className="text-[11px] font-black text-slate-800 uppercase truncate">{site.name}</p>
                       <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black ${getPerfColor(sitePerf)}`}>{sitePerf.toFixed(1)}% de l'objectif</span>
                       </div>
                    </div>
                 </div>
                 <div className="text-right"><p className="text-lg font-black text-slate-900">{site.total}</p><p className="text-[8px] font-black text-slate-300 uppercase">Poches</p></div>
              </div>
            )}) : <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4 opacity-30"><Activity size={48} className="text-slate-200 animate-pulse" /><p className="text-xs font-black uppercase tracking-[0.2em]">En attente de flux...</p></div>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] p-10 lg:p-14 shadow-warm border border-slate-100 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10 mb-12">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl"><TrendingUp size={28} /></div>
              <div><h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Vision Stratégique {data.month}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projection de clôture & Objectif</p></div>
           </div>
           <div className="grid grid-cols-2 gap-6 w-full lg:w-auto">
              <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Objectif {userRegion ? `Régional` : `National`}</p><p className="text-3xl font-black text-slate-900">{data.monthly.objective.toLocaleString()}</p></div>
              <div className="p-6 bg-gradient-to-br from-orange-600 to-red-600 rounded-[2.5rem] text-white shadow-xl text-center"><p className="text-[10px] font-black text-white/50 uppercase mb-2">Projection IA</p><p className="text-3xl font-black">{stats.pfm.toLocaleString()}</p></div>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {data.regions.slice(0, 4).map((region, idx) => {
              const totalRegion = region.sites.reduce((acc, s) => acc + s.totalMois, 0);
              const objRegion = region.sites.reduce((acc, s) => acc + s.objMensuel, 0);
              const achievement = (totalRegion / objRegion) * 100;
              return (
                <div 
                  key={idx} 
                  onClick={() => setActiveTab?.('performance')}
                  className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all cursor-pointer"
                >
                   <div className="flex justify-between items-start mb-4"><h4 className="text-[11px] font-black text-slate-800 uppercase truncate pr-2">{region.name.replace('PRES ', '')}</h4><span className={`text-[10px] font-black px-2 py-1 rounded-full ${getPerfColor(achievement)} bg-white/50 border border-slate-100`}>{achievement.toFixed(1)}%</span></div>
                   <p className="text-3xl font-black text-slate-900 leading-none mb-4">{totalRegion.toLocaleString()}</p>
                   <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full ${achievement >= 100 ? 'bg-emerald-500' : achievement >= 75 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.min(achievement, 100)}%` }} /></div>
                </div>
              );
           })}
        </div>
      </div>
    </div>
  );
};
