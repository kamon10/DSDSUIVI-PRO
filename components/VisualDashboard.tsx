
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardData } from '../types';
// Fix: Removed non-existent exports 'defs', 'linearGradient', 'stop' from recharts
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { TrendingUp, Calendar, Building2, Truck, Award, Target, Zap, Brain, ArrowUpRight, ArrowDownRight, Activity, Sparkles, ChevronRight } from 'lucide-react';
import { getGeminiInsights } from '../services/geminiService';

const COLORS_MIX = ['#6366f1', '#f97316'];

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

  const performanceScore = Math.round((data.monthly.percentage + data.annual.percentage) / 2);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24">
      
      {/* HEADER: MISSION CONTROL */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-indigo-600 rounded-[4rem] blur opacity-15 group-hover:opacity-25 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-slate-900 rounded-[3.5rem] p-10 lg:p-14 text-white shadow-3xl overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/20 blur-[150px] rounded-full -mr-80 -mt-80 pointer-events-none animate-pulse"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-10">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 blur-2xl opacity-40 animate-pulse"></div>
                <div className="w-28 h-28 bg-gradient-to-br from-red-500 to-red-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10">
                  <Zap size={52} className="text-white fill-white/20" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                   <div className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-red-400">
                     Live Data
                   </div>
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-3">Performance Nationale</h1>
                <p className="text-white/40 font-bold uppercase tracking-[0.4em] text-[11px]">Système Intégré de Suivi CNTS • Côte d'Ivoire</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 min-w-[320px]">
              <div className="text-center">
                <p className="text-[10px] font-black text-white/30 uppercase mb-3 tracking-widest">Score Global</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-black text-white">{performanceScore}</span>
                  <span className="text-xl font-black text-white/30">%</span>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className={`h-2 rounded-full overflow-hidden bg-white/10`}>
                  <div className="h-full bg-red-500" style={{ width: `${performanceScore}%` }}></div>
                </div>
                <p className="text-[9px] font-black text-white/40 uppercase mt-4 tracking-tighter text-center italic">Cycle Mensuel en cours</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IA STRATEGY & ANALYTICS MIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Gemini AI Box */}
        <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden ai-glow">
          <div className="absolute -top-12 -right-12 text-slate-50 opacity-10 pointer-events-none">
            <Brain size={250} />
          </div>
          
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Directives Stratégiques IA</h3>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Analyse multi-dimensionnelle par Gemini-3-Flash</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 bg-gradient-to-br from-indigo-50/50 to-white rounded-[2.5rem] p-10 border border-indigo-100/50 relative">
            {loadingInsights ? (
              <div className="flex flex-col items-center justify-center h-48 gap-6">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Consultation du moteur d'IA...</p>
              </div>
            ) : (
              <div className="relative">
                <span className="absolute -top-4 -left-2 text-6xl text-indigo-200 font-serif">“</span>
                <p className="text-slate-700 font-semibold leading-relaxed italic text-xl px-6">
                  {insights}
                </p>
                <span className="absolute -bottom-10 -right-2 text-6xl text-indigo-200 font-serif">”</span>
              </div>
            )}
          </div>
        </div>

        {/* Mix Visualizer */}
        <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100 flex flex-col justify-between group">
          <div className="flex items-center gap-5 mb-8">
             <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
               <Activity size={28} />
             </div>
             <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Mix d'Activité</h3>
          </div>

          <div className="h-64 relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={[
                     { name: 'Fixe', value: data.monthly.fixed },
                     { name: 'Mobile', value: data.monthly.mobile }
                   ]}
                   innerRadius={80}
                   outerRadius={105}
                   paddingAngle={10}
                   dataKey="value"
                   startAngle={90}
                   endAngle={450}
                 >
                   {COLORS_MIX.map((color, index) => <Cell key={`cell-${index}`} fill={color} stroke="none" />)}
                 </Pie>
                 <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Ratio</p>
                <p className="text-4xl font-black text-slate-800">
                  {Math.round((data.monthly.mobile / (data.monthly.fixed || 1)) * 100)}%
                </p>
             </div>
          </div>

          <div className="space-y-4 mt-8">
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-xs font-black text-slate-600 uppercase">Structure Fixe</span>
                </div>
                <span className="font-black text-slate-900">{data.monthly.fixed.toLocaleString()}</span>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-xs font-black text-slate-600 uppercase">Unité Mobile</span>
                </div>
                <span className="font-black text-slate-900">{data.monthly.mobile.toLocaleString()}</span>
             </div>
          </div>
        </div>
      </div>

      {/* KPI GRID: HIGH IMPACT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        
        {/* KPI Journalier */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 hover:-translate-y-3 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Calendar size={32} />
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              Objectif Atteint
            </div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 relative z-10">Collecte du Jour</p>
          <div className="flex items-baseline gap-3 mb-6 relative z-10">
             <span className="text-5xl font-black text-slate-800 tracking-tighter">{data.daily.realized}</span>
             <span className="text-sm font-black text-slate-300 uppercase">/ {data.daily.objective}</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative z-10">
             <div className="h-full bg-blue-600 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${Math.min(data.daily.percentage, 100)}%` }}></div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-green-500 font-bold text-xs">
            <ArrowUpRight size={16} /> +{data.daily.percentage.toFixed(0)}% de performance
          </div>
        </div>

        {/* KPI Mensuel */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 hover:-translate-y-3 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-orange-600 group-hover:text-white transition-all">
              <TrendingUp size={32} />
            </div>
            <div className="px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              En progression
            </div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2 relative z-10">Total Mensuel</p>
          <div className="flex items-baseline gap-3 mb-6 relative z-10">
             <span className="text-5xl font-black text-slate-800 tracking-tighter">{data.monthly.realized.toLocaleString()}</span>
             <span className="text-sm font-black text-slate-300 uppercase">/ {data.monthly.objective.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative z-10">
             <div className="h-full bg-orange-500 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${Math.min(data.monthly.percentage, 100)}%` }}></div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-slate-400 font-bold text-xs">
            <Activity size={16} /> Écart : {Math.max(0, data.monthly.objective - data.monthly.realized).toLocaleString()} poches
          </div>
        </div>

        {/* KPI Annuel */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 hover:-translate-y-3 transition-all duration-500 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
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

      {/* REGIONAL MATRIX: DATA STORYTELLING */}
      <div className="bg-white rounded-[4rem] p-12 lg:p-16 shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-indigo-600 to-orange-500"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 mb-16">
           <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl float-animation">
                <Target size={40} />
              </div>
              <div>
                <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-800">Matrice de Performance Régionale</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic">Répartition des flux par Pôle Régional de Santé (PRES)</p>
              </div>
           </div>
           <div className="flex gap-4">
              <div className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div> Réalisé Mensuel
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
               <Bar dataKey="realized" fill="#ef4444" radius={[8, 8, 0, 0]} name="Réalisé" />
               <Bar dataKey="objective" fill="#f1f5f9" radius={[8, 8, 0, 0]} name="Objectif Mensuel" />
             </BarChart>
           </ResponsiveContainer>
        </div>
        
        <div className="mt-12 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4 text-slate-500">
             <Activity size={20} />
             <p className="text-xs font-bold uppercase tracking-widest">Analyse de variance effectuée sur {data.regions.length} régions</p>
           </div>
           <button className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-slate-200">
             Export complet PDF <ChevronRight size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};
