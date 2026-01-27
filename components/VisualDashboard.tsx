
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Activity, Sparkles, MapPin, User, Phone, Mail, ChevronRight } from 'lucide-react';
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
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      {/* HEADER PREMIUM INDIGO/BLUE */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-orange-500 to-red-400 rounded-[3.5rem] blur opacity-25"></div>
        <div className="relative bg-[#0f172a] rounded-[3.5rem] p-10 lg:p-14 text-white shadow-3xl overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full -mr-60 -mt-60 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/10 blur-[100px] rounded-full -ml-40 -mb-40"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12 mb-12">
            <div className="flex items-center gap-10">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-700 rounded-3xl flex items-center justify-center shadow-2xl relative z-10 border border-white/10">
                <Zap size={40} className="text-white fill-white/20" />
              </div>
              <div>
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-200">Cockpit National</h1>
                <p className="text-orange-400/60 font-black uppercase tracking-[0.5em] text-[9px]">Centre National de Transfusion Sanguine CI</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="bg-white/5 backdrop-blur-2xl px-10 py-8 rounded-[2.5rem] border border-white/10 shadow-inner flex flex-col items-center min-w-[180px]">
                  <p className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest">{data.date}</p>
                  <p className="text-4xl font-black text-white">{data.daily.realized.toLocaleString()}</p>
               </div>
               <div className="bg-gradient-to-br from-orange-600 to-red-700 px-10 py-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center min-w-[180px] border border-white/10">
                  <p className="text-[10px] font-black text-white/50 uppercase mb-2 tracking-widest">MOIS : {data.month.toUpperCase()}</p>
                  <p className="text-4xl font-black text-white">{data.monthly.realized.toLocaleString()}</p>
               </div>
            </div>
          </div>

          <div className="relative w-full h-14 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-inner">
            <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-orange-600 z-30 shadow-xl">
              <MapPin size={20} className="text-white" />
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
        {/* IA INSIGHTS */}
        <div className="lg:col-span-1 bg-white rounded-[3.5rem] p-10 shadow-warm border border-orange-100 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 blur-[40px] rounded-full -mr-20 -mt-20"></div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-yellow-400 text-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-200">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Analyste IA</h3>
          </div>
          <div className="flex-1 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-[2rem] p-8 border border-yellow-200 shadow-inner relative">
            <div className="absolute top-4 right-4 text-yellow-400/20"><Zap size={40} /></div>
            {loadingInsights ? (
               <div className="flex flex-col gap-3">
                  <div className="h-4 bg-yellow-200/50 rounded-full w-full animate-pulse"></div>
                  <div className="h-4 bg-yellow-200/50 rounded-full w-4/5 animate-pulse"></div>
                  <div className="h-4 bg-yellow-200/50 rounded-full w-5/6 animate-pulse"></div>
               </div>
            ) : (
               <p className="text-amber-900 font-bold leading-relaxed italic text-sm">{insights}</p>
            )}
          </div>
        </div>

        {/* STATS FIXE/MOBILE */}
        <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-10 shadow-warm border border-orange-100 grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="bg-emerald-50 p-10 rounded-[2.5rem] border border-emerald-100 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-200 relative z-10">
                <Building2 size={28} />
              </div>
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1 relative z-10">Collecte Site Fixe ({data.month})</p>
              <h4 className="text-5xl font-black text-slate-900 relative z-10">{data.monthly.fixed.toLocaleString()}</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Stable ce mois
              </div>
           </div>
           
           <div className="bg-amber-50 p-10 rounded-[2.5rem] border border-amber-100 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
              <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-amber-200 relative z-10">
                <Truck size={28} />
              </div>
              <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-1 relative z-10">Collecte Mobile ({data.month})</p>
              <h4 className="text-5xl font-black text-slate-900 relative z-10">{data.monthly.mobile.toLocaleString()}</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase">
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> En progression
              </div>
           </div>
        </div>
      </div>

      {/* SYNTHÈSE PAR RÉGION (PRES) & RESPONSABLES */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
           <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
             <MapPin size={24} />
           </div>
           <div>
             <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Pilotage Territorial (PRES)</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Détails des sites rattachés et responsables</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {data.regions.map((region, idx) => {
            const totalRegion = region.sites.reduce((acc, s) => acc + s.totalMois, 0);
            return (
              <div key={idx} className="bg-white rounded-[3rem] shadow-warm border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-black uppercase tracking-tighter">{region.name}</h4>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">{region.sites.length} STRUCTURES RATTACHÉES</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-orange-400">{totalRegion.toLocaleString()}</p>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Poches Mois</p>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  {region.sites.map((site, sIdx) => (
                    <div key={sIdx} className="flex flex-col gap-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group/site">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover/site:text-blue-600 transition-colors">
                             <Building2 size={16} />
                           </div>
                           <span className="font-black text-sm text-slate-800 uppercase tracking-tight">{site.name}</span>
                        </div>
                        <span className="text-lg font-black text-slate-900">{site.totalMois.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-4 pt-3 border-t border-slate-200/60">
                         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-300">
                           <User size={18} />
                         </div>
                         <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Responsable Site</p>
                            <p className="text-[11px] font-black text-slate-700 uppercase leading-none">{site.manager || "Non assigné"}</p>
                         </div>
                         <div className="flex gap-2">
                           {site.phone && (
                             <a href={`tel:${site.phone}`} className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:scale-110 transition-transform shadow-md shadow-emerald-100">
                               <Phone size={14} />
                             </a>
                           )}
                           {site.email && (
                             <a href={`mailto:${site.email}`} className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center hover:scale-110 transition-transform shadow-md shadow-slate-200">
                               <Mail size={14} />
                             </a>
                           )}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
