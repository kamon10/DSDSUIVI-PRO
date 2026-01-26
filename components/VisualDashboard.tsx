
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Brain, ArrowUpRight, Activity, Sparkles, ChevronRight, BarChart3, MapPin } from 'lucide-react';
import { getGeminiInsights } from '../services/geminiService';
import { COLORS } from '../constants';

const COLORS_MIX = [COLORS.fixed, COLORS.mobile];

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

  const mixData = useMemo(() => [
    { name: 'Fixe', value: data.monthly.fixed },
    { name: 'Mobile', value: data.monthly.mobile }
  ], [data.monthly.fixed, data.monthly.mobile]);

  // Liste de tous les sites pour le ticker
  const allSites = useMemo(() => {
    return data.regions.flatMap(reg => reg.sites);
  }, [data.regions]);

  const SiteTickerItems = () => (
    <div className="flex items-center gap-10 px-8">
      {allSites.map((site, i) => (
        <div key={i} className="flex items-center gap-3 whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <span className="text-[11px] font-black uppercase text-white/80">{site.name} :</span>
          <span className="text-[11px] font-black text-white">{site.totalMois.toLocaleString()}</span>
          <span className="text-[8px] font-bold text-white/40">POC.</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24">
      
      {/* HEADER: MISSION CONTROL */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-500 rounded-[4rem] blur opacity-15 group-hover:opacity-25 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-slate-900 rounded-[3.5rem] p-10 lg:p-14 pb-12 lg:pb-14 text-white shadow-3xl overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/20 blur-[150px] rounded-full -mr-80 -mt-80 pointer-events-none animate-pulse"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12 mb-10">
            <div className="flex items-center gap-10">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-red-500 blur-2xl opacity-40 animate-pulse"></div>
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10">
                  <Zap size={44} className="text-white fill-white/20" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                   <div className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-400">
                     Cockpit National
                   </div>
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-3">Performance Globale</h1>
                <p className="text-white/40 font-bold uppercase tracking-[0.4em] text-[10px]">Centre National de Transfusion Sanguine</p>
              </div>
            </div>

            {/* RÉSUMÉ STATIQUE (Stays fixed for high visibility) */}
            <div className="grid grid-cols-3 gap-8 bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 min-w-[380px]">
              <div className="text-center">
                <p className="text-[9px] font-black text-white/30 uppercase mb-2 tracking-widest">Aujourd'hui</p>
                <p className="text-2xl font-black text-white leading-none">{data.daily.realized.toLocaleString()}</p>
                <p className="text-[9px] font-bold text-emerald-400 mt-2">{data.daily.percentage.toFixed(0)}% Cible</p>
              </div>
              
              <div className="text-center border-x border-white/10 px-4">
                <p className="text-[9px] font-black text-white/30 uppercase mb-2 tracking-widest">Mois en Cours</p>
                <p className="text-2xl font-black text-white leading-none">{data.monthly.realized.toLocaleString()}</p>
                <p className="text-[9px] font-bold text-orange-400 mt-2">{data.monthly.percentage.toFixed(0)}% Cible</p>
              </div>

              <div className="text-center">
                <p className="text-[9px] font-black text-white/30 uppercase mb-2 tracking-widest">Année 2026</p>
                <p className="text-2xl font-black text-white leading-none">{data.annual.realized.toLocaleString()}</p>
                <p className="text-[9px] font-bold text-red-500 mt-2">{data.annual.percentage.toFixed(1)}% Cible</p>
              </div>
            </div>
          </div>

          {/* SITE TICKER (Now scrolls site info specifically) */}
          <div className="relative w-full h-14 bg-black/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden group/ticker">
            <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-slate-900 z-30 border-r border-white/5">
              <MapPin size={16} className="text-red-500" />
            </div>
            <div className="animate-ticker-infinite flex items-center h-full ml-20">
              <SiteTickerItems />
              <SiteTickerItems />
            </div>
            <div className="absolute inset-y-0 left-20 w-12 bg-gradient-to-r from-slate-900 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-900 to-transparent z-20 pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* IA STRATEGY & ANALYTICS MIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Gemini AI Box */}
        <div className="lg:col-span-1 bg-white rounded-[3.5rem] p-10 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden ai-glow">
          <div className="absolute -top-12 -right-12 text-slate-50 opacity-10 pointer-events-none">
            <Brain size={180} />
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-inner">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">IA Insights</h3>
                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mt-0.5 leading-none">Gemini-3-Flash</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 bg-gradient-to-br from-emerald-50/50 to-white rounded-[2rem] p-8 border border-emerald-100/50 relative overflow-y-auto max-h-[300px]">
            {loadingInsights ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Analyse...</p>
              </div>
            ) : (
              <div className="relative">
                <span className="absolute -top-3 -left-1 text-4xl text-emerald-200 font-serif">“</span>
                <p className="text-slate-700 font-bold leading-relaxed italic text-sm px-4">
                  {insights}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mix Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100 flex flex-col group">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[1.75rem] flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
                  <Activity size={32} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 leading-none">Mix d'Activité National</h3>
                  <p className="text-xs font-black text-slate-300 uppercase mt-2 tracking-widest">Performance par Quotas (60/40)</p>
                </div>
             </div>
             <div className="hidden md:flex gap-4">
                <div className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">Fixe (60%)</div>
                <div className="px-5 py-2 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">Mobile (40%)</div>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around gap-12 flex-1">
            <div className="w-full md:w-1/2 h-80 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={mixData}
                     innerRadius={85}
                     outerRadius={115}
                     paddingAngle={8}
                     dataKey="value"
                     startAngle={90}
                     endAngle={450}
                     label={false}
                   >
                     {mixData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_MIX[index % COLORS_MIX.length]} stroke="none" />)}
                   </Pie>
                   <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Atteinte</p>
                  <p className="text-6xl font-black text-slate-800 tracking-tighter">
                    {data.monthly.percentage.toFixed(0)}%
                  </p>
               </div>
            </div>

            <div className="w-full md:w-1/3 space-y-6">
               <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 group/item hover:bg-emerald-50 transition-colors duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS.fixed }}></div>
                      <span className="text-sm font-black text-slate-700 uppercase">COLLECTE SITE FIXE</span>
                    </div>
                    <span className="text-xl font-black text-slate-900">{data.monthly.fixed.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min((data.monthly.fixed / (data.monthly.objective * 0.6)) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-3 uppercase tracking-widest text-right">Quota Atteint: {((data.monthly.fixed / (data.monthly.objective * 0.6)) * 100).toFixed(1)}%</p>
               </div>

               <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 group/item hover:bg-orange-50 transition-colors duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS.mobile }}></div>
                      <span className="text-sm font-black text-slate-700 uppercase">COLLECTE MOBILE</span>
                    </div>
                    <span className="text-xl font-black text-slate-900">{data.monthly.mobile.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${Math.min((data.monthly.mobile / (data.monthly.objective * 0.4)) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-3 uppercase tracking-widest text-right">Quota Atteint: {((data.monthly.mobile / (data.monthly.objective * 0.4)) * 100).toFixed(1)}%</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 hover:-translate-y-3 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Calendar size={32} />
            </div>
            <div className="px-4 py-2 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Objectif Atteint</div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 relative z-10">Collecte du Jour</p>
          <div className="flex items-baseline gap-3 mb-6 relative z-10">
             <span className="text-5xl font-black text-slate-800 tracking-tighter">{data.daily.realized}</span>
             <span className="text-sm font-black text-slate-300 uppercase">/ {data.daily.objective}</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative z-10">
             <div className="h-full bg-emerald-600 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${Math.min(data.daily.percentage, 100)}%` }}></div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-emerald-500 font-bold text-xs">
            <ArrowUpRight size={16} /> +{data.daily.percentage.toFixed(0)}% de performance
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 hover:-translate-y-3 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-orange-600 group-hover:text-white transition-all">
              <TrendingUp size={32} />
            </div>
            <div className="px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">En progression</div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 relative z-10">Total Mensuel</p>
          <div className="flex items-baseline gap-3 mb-6 relative z-10">
             <span className="text-5xl font-black text-slate-800 tracking-tighter">{data.monthly.realized.toLocaleString()}</span>
             <span className="text-sm font-black text-slate-300 uppercase">/ {data.monthly.objective.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative z-10">
             <div className="h-full bg-orange-500 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${Math.min(data.monthly.percentage, 100)}%` }}></div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-orange-400 font-bold text-xs">
            <Activity size={16} /> Écart : {Math.max(0, data.monthly.objective - data.monthly.realized).toLocaleString()} poches
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 hover:-translate-y-3 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-red-600 group-hover:text-white transition-all">
              <Award size={32} />
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cible 2026</div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 relative z-10">Progression Annuelle</p>
          <div className="flex items-baseline gap-3 mb-6 relative z-10">
             <span className="text-5xl font-black text-slate-800 tracking-tighter">{data.annual.realized.toLocaleString()}</span>
             <span className="text-sm font-black text-slate-300 uppercase">/ {data.annual.objective.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative z-10">
             <div className="h-full bg-red-600 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${Math.min(data.annual.percentage, 100)}%` }}></div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-tighter">
            <Sparkles size={16} /> {data.annual.percentage.toFixed(1)}% de l'objectif final
          </div>
        </div>
      </div>

      {/* MATRICE REGIONALE */}
      <div className="bg-white rounded-[4rem] p-12 lg:p-16 shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 via-orange-500 to-red-600"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 mb-16">
           <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl float-animation">
                <Target size={40} />
              </div>
              <div>
                <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-800">Matrice Régionale</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic">Analyse des flux par Pôle Régional de Santé</p>
              </div>
           </div>
        </div>

        <div className="h-[450px]">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data.regions.map(r => ({
               name: r.name.replace('PRES ', ''),
               realized: r.sites.reduce((acc, s) => acc + s.totalMois, 0),
               objective: r.sites.reduce((acc, s) => acc + s.objMensuel, 0)
             }))} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis 
                 dataKey="name" 
                 angle={-35} 
                 textAnchor="end" 
                 interval={0} 
                 tick={{fontSize: 11, fontWeight: 900, fill: '#64748b'}} 
                 axisLine={false}
                 tickLine={false}
               />
               <YAxis 
                 tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} 
                 axisLine={false}
                 tickLine={false}
               />
               <Tooltip 
                 cursor={{fill: '#f8fafc'}} 
                 contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '1.5rem' }}
               />
               <Bar dataKey="realized" fill={COLORS.total} radius={[8, 8, 0, 0]} name="Réalisé" />
               <Bar dataKey="objective" fill="#f1f5f9" radius={[8, 8, 0, 0]} name="Objectif Mensuel" />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
