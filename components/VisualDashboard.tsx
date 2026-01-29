
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Activity, Sparkles, MapPin, User, Phone, Mail, ChevronRight, ArrowUpRight, ArrowDownRight, PieChart, BarChart3, Info } from 'lucide-react';
import { getGeminiInsights } from '../services/geminiService';
import { COLORS } from '../constants';

export const VisualDashboard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const [insights, setInsights] = useState<string>("Génération de la stratégie IA...");
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const text = await getGeminiInsights(data);
        setInsights(text);
      } catch (err) {
        setInsights("Analyse stratégique temporairement hors ligne.");
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [data]);

  const allSites = useMemo(() => {
    return data.regions.flatMap(reg => reg.sites);
  }, [data.regions]);

  // --- CALCULS AVANCÉS ---
  const stats = useMemo(() => {
    // 1. Calcul des jours écoulés dans le mois
    const todayStr = data.date.split('/')[0];
    const daysElapsed = parseInt(todayStr) || 15;
    const totalDaysInMonth = 30; // Simplification ou calcul via Date()

    // 2. Moyenne et Projection (PFM)
    const dailyAvg = data.monthly.realized / daysElapsed;
    const pfm = Math.round(dailyAvg * totalDaysInMonth);
    const pfmGap = pfm - data.monthly.objective;
    
    // 3. Mixité
    const totalMois = data.monthly.realized || 1;
    const fixePerc = (data.monthly.fixed / totalMois) * 100;
    const mobilePerc = (data.monthly.mobile / totalMois) * 100;

    // 4. Site Leader
    const leader = [...allSites].sort((a, b) => b.totalMois - a.totalMois)[0];

    return { dailyAvg, pfm, pfmGap, fixePerc, mobilePerc, leader };
  }, [data, allSites]);

  const SiteTickerItems = () => (
    <div className="flex items-center gap-10 px-8">
      {allSites.map((site, i) => (
        <div key={i} className="flex items-center gap-3 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
          <span className="text-[11px] font-black uppercase text-white/80">{site.name} :</span>
          <span className="text-[11px] font-black text-white">{site.totalMois.toLocaleString()}</span>
          <span className="text-[8px] font-bold text-white/40">POC.</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-1000">
      
      {/* HEADER PREMIUM : COCKPIT PRÉDICTIF */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-orange-500 to-red-400 rounded-[3.5rem] blur opacity-25"></div>
        <div className="relative bg-[#0f172a] rounded-[3.5rem] p-10 lg:p-14 text-white shadow-3xl overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full -mr-60 -mt-60 animate-pulse"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start gap-12 mb-12">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400">Status National : Opérationnel</span>
                </div>
                <div className="px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-orange-400">Projection {data.month}</span>
                </div>
              </div>
              <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40">Cockpit Stratégique</h1>
              <p className="text-white/40 font-black uppercase tracking-[0.5em] text-[10px]">Analyse Prédictive & Performance Territoriale</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
               <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-inner min-w-[160px]">
                  <p className="text-[9px] font-black text-blue-400 uppercase mb-2 tracking-widest flex items-center gap-2">
                    <TrendingUp size={12}/> Réalisé Mois
                  </p>
                  <p className="text-4xl font-black text-white">{data.monthly.realized.toLocaleString()}</p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <ArrowUpRight size={12}/> {data.monthly.percentage.toFixed(1)}% de l'objectif
                  </div>
               </div>
               <div className="bg-gradient-to-br from-orange-600 to-red-700 p-6 rounded-[2.5rem] shadow-2xl min-w-[160px] border border-white/10">
                  <p className="text-[9px] font-black text-white/50 uppercase mb-2 tracking-widest flex items-center gap-2">
                    <Zap size={12}/> Projection (PFM)
                  </p>
                  <p className="text-4xl font-black text-white">{stats.pfm.toLocaleString()}</p>
                  <p className={`mt-2 text-[10px] font-bold uppercase ${stats.pfmGap >= 0 ? 'text-emerald-300' : 'text-orange-200'}`}>
                    {stats.pfmGap >= 0 ? `+${stats.pfmGap.toLocaleString()} vs Objectif` : `${stats.pfmGap.toLocaleString()} vs Objectif`}
                  </p>
               </div>
            </div>
          </div>

          <div className="relative w-full h-14 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-inner">
            <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-blue-600 z-30 shadow-xl">
              <Activity size={20} className="text-white" />
            </div>
            <div className="animate-ticker-infinite flex items-center h-full ml-20">
              <SiteTickerItems />
              <SiteTickerItems />
              <SiteTickerItems />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* INDICATEURS DE MIXITÉ (STATS VISUELLES) */}
        <div className="bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <PieChart size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Équilibre Flux</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ratio Fixe vs Mobile</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="relative pt-2">
              <div className="flex justify-between text-[10px] font-black uppercase mb-3">
                <span className="text-emerald-600">Site Fixe ({stats.fixePerc.toFixed(0)}%)</span>
                <span className="text-orange-500">Mobile ({stats.mobilePerc.toFixed(0)}%)</span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full flex overflow-hidden border border-slate-200 shadow-inner">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.fixePerc}%` }}></div>
                <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${stats.mobilePerc}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Moy. Jour</p>
                <p className="text-xl font-black text-slate-800">{stats.dailyAvg.toFixed(1)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Leader Mensuel</p>
                <p className="text-[10px] font-black text-slate-800 uppercase truncate" title={stats.leader?.name}>
                   {stats.leader?.name.split(' ').slice(-1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* IA INSIGHTS : ANALYSE STRATÉGIQUE */}
        <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-10 shadow-warm border border-slate-100 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 blur-[40px] rounded-full -mr-20 -mt-20"></div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-yellow-400 text-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-200">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Conseil IA</h3>
          </div>
          <div className="flex-1 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-[2rem] p-8 border border-yellow-200 shadow-inner relative flex items-center">
            {loadingInsights ? (
               <div className="flex flex-col gap-3 w-full">
                  <div className="h-4 bg-yellow-200/50 rounded-full w-full animate-pulse"></div>
                  <div className="h-4 bg-yellow-200/50 rounded-full w-4/5 animate-pulse"></div>
                  <div className="h-4 bg-yellow-200/50 rounded-full w-5/6 animate-pulse"></div>
               </div>
            ) : (
               <div className="flex gap-6 items-start">
                 <div className="shrink-0 text-yellow-500 opacity-20"><Info size={48} /></div>
                 <p className="text-amber-900 font-bold leading-relaxed italic text-base lg:text-lg">"{insights}"</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTRIBUTION TERRITORIALE (PRES) */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-4">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Contribution Territoriale</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Répartition régionale du flux national</p>
              </div>
           </div>
           <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-full border border-slate-200">
              <BarChart3 size={14} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Consolidée CNTS</span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {data.regions.map((region, idx) => {
            const totalRegion = region.sites.reduce((acc, s) => acc + s.totalMois, 0);
            const contribution = (totalRegion / (data.monthly.realized || 1)) * 100;
            
            return (
              <div key={idx} className="bg-white rounded-[3rem] shadow-warm border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mb-12 pointer-events-none"></div>
                  <div className="relative z-10">
                    <h4 className="text-xl font-black uppercase tracking-tighter">{region.name}</h4>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Poids National : {contribution.toFixed(1)}%</p>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-3xl font-black text-blue-400">{totalRegion.toLocaleString()}</p>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none">Poches / Mois</p>
                  </div>
                </div>

                <div className="p-8 space-y-4 flex-1">
                  {region.sites.map((site, sIdx) => {
                    const siteObj = site.objMensuel || 1;
                    const sitePerf = (site.totalMois / siteObj) * 100;

                    return (
                      <div key={sIdx} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group/site relative overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover/site:text-blue-600 transition-colors shadow-sm">
                               <Building2 size={16} />
                             </div>
                             <span className="font-black text-xs text-slate-800 uppercase tracking-tight">{site.name}</span>
                          </div>
                          <span className="text-sm font-black text-slate-900">{site.totalMois.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${sitePerf >= 100 ? 'bg-emerald-500' : sitePerf >= 70 ? 'bg-orange-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(sitePerf, 100)}%` }}
                              ></div>
                           </div>
                           <span className={`text-[9px] font-black min-w-[30px] text-right ${sitePerf >= 70 ? 'text-slate-500' : 'text-red-500'}`}>
                              {sitePerf.toFixed(0)}%
                           </span>
                        </div>

                        <div className="flex items-center gap-3 pt-2 opacity-0 group-hover/site:opacity-100 transition-opacity">
                           <div className="flex-1 flex items-center gap-2">
                              <User size={12} className="text-slate-300" />
                              <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{site.manager || "A définir"}</span>
                           </div>
                           <div className="flex gap-2">
                             {site.phone && <a href={`tel:${site.phone}`} className="text-emerald-500 hover:scale-110 transition-transform"><Phone size={12}/></a>}
                             {site.email && <a href={`mailto:${site.email}`} className="text-blue-500 hover:scale-110 transition-transform"><Mail size={12}/></a>}
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
